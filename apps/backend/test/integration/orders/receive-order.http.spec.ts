import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderStatus, PrismaClient, UserRole } from '@prisma/client';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import * as argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/configure-app';

describe('POST /api/v1/orders/:id/receive', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let app: INestApplication;
  let passwordHash: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    process.env.DATABASE_URL = container.getConnectionUri();
    process.env.NODE_ENV = 'test';

    execFileSync(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      [
        'prisma',
        'migrate',
        'deploy',
        '--schema',
        resolve(process.cwd(), 'prisma/schema.prisma'),
      ],
      { cwd: process.cwd(), env: process.env, stdio: 'pipe' },
    );

    prisma = new PrismaClient();
    await prisma.$connect();
    passwordHash = await argon2.hash('correct-password', {
      type: argon2.argon2id,
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(async () => {
    await prisma.idempotencyRecord.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.inventoryMovement.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.brand.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await container?.stop();
  });

  async function authenticatedActor() {
    const user = await prisma.user.create({
      data: {
        name: 'Ana Silva',
        login: 'ana',
        normalizedLogin: 'ana',
        passwordHash,
        role: UserRole.OPERATOR,
      },
    });
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ login: 'ana', password: 'correct-password' })
      .expect(200);

    return {
      cookie: response.headers['set-cookie']?.[0] ?? '',
      userId: user.id,
    };
  }

  async function createOrderFixture(
    userId: string,
    status: OrderStatus = OrderStatus.OPEN,
  ) {
    const brand = await prisma.brand.create({
      data: {
        name: 'Natura',
        normalizedName: 'natura',
        createdById: userId,
        updatedById: userId,
      },
    });
    const category = await prisma.category.create({
      data: {
        name: 'Perfumaria',
        normalizedName: 'perfumaria',
        createdById: userId,
        updatedById: userId,
      },
    });
    const products = await Promise.all(
      [
        ['PERF-001', 'Essencial feminino'],
        ['CREME-001', 'Creme corporal'],
      ].map(([code, description]) =>
        prisma.product.create({
          data: {
            brandId: brand.id,
            categoryId: category.id,
            code,
            normalizedCode: code.toLowerCase(),
            description,
            catalogPrice: '149.90',
            purchasePrice: '89.00',
            originalPrice: '179.90',
            createdById: userId,
            updatedById: userId,
          },
        }),
      ),
    );
    const terminalFields =
      status === OrderStatus.RECEIVED
        ? {
            receivedAt: new Date('2026-08-03T10:00:00.000Z'),
            receivedById: userId,
          }
        : status === OrderStatus.CANCELED
          ? {
              canceledAt: new Date('2026-08-03T10:00:00.000Z'),
              canceledById: userId,
              cancelReason: 'Pedido cancelado para teste',
            }
          : {};
    const order = await prisma.order.create({
      data: {
        brandId: brand.id,
        cycle: '12/2026',
        orderDate: new Date('2026-08-02T00:00:00.000Z'),
        status,
        ...terminalFields,
        createdById: userId,
        updatedById: userId,
        items: {
          create: products.map((product, index) => ({
            productId: product.id,
            quantityOrdered: index === 0 ? 3 : 2,
            quantityReceived:
              status === OrderStatus.RECEIVED ? (index === 0 ? 3 : 0) : 0,
            catalogUnitPrice: '149.90',
            purchaseUnitPrice: '89.00',
            originalUnitPrice: '179.90',
          })),
        },
      },
      include: { items: { orderBy: { productId: 'asc' } } },
    });

    return { brand, products, order };
  }

  function validPayload(itemIds: string[]) {
    return {
      items: itemIds.map((orderItemId, index) => ({
        orderItemId,
        quantityReceived: index === 0 ? 2 : 0,
        expirationDate: index === 0 ? '2027-12-31' : null,
        notes: index === 0 ? '  Caixa íntegra  ' : null,
      })),
    };
  }

  it('receives all items, creates purchase movements and audit atomically', async () => {
    const { cookie, userId } = await authenticatedActor();
    const { order } = await createOrderFixture(userId);
    const payload = validPayload(order.items.map((item) => item.id));
    const key = randomUUID();

    const response = await request(app.getHttpServer())
      .post(`/api/v1/orders/${order.id}/receive`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .set('x-request-id', 'req-integration-receive-order')
      .send(payload)
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: order.id,
      status: 'RECEIVED',
      receivedAt: expect.any(String),
      items: expect.arrayContaining([
        expect.objectContaining({
          id: order.items[0].id,
          quantityReceived: 2,
          expirationDate: '2027-12-31',
          notes: 'Caixa íntegra',
        }),
        expect.objectContaining({
          id: order.items[1].id,
          quantityReceived: 0,
          expirationDate: null,
        }),
      ]),
    });
    expect(
      await prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).toMatchObject({
      status: 'RECEIVED',
      receivedById: userId,
      receivedAt: expect.any(Date),
      updatedById: userId,
    });
    expect(
      await prisma.inventoryMovement.findMany({
        where: { orderItem: { orderId: order.id } },
      }),
    ).toEqual([
      expect.objectContaining({
        orderItemId: order.items[0].id,
        productId: order.items[0].productId,
        type: 'PURCHASE',
        quantityDelta: 2,
        createdById: userId,
      }),
    ]);
    expect(
      await prisma.auditLog.findFirst({
        where: { action: 'ORDER_RECEIVED', entityId: order.id },
      }),
    ).toMatchObject({
      userId,
      requestId: 'req-integration-receive-order',
    });
    expect(
      await prisma.idempotencyRecord.findUniqueOrThrow({
        where: {
          scope_key: {
            scope: `orders:receive:user:${userId}`,
            key,
          },
        },
      }),
    ).toMatchObject({ status: 'COMPLETED', responseStatus: 200 });
  });

  it('replays the same response without duplicating movements or audit', async () => {
    const { cookie, userId } = await authenticatedActor();
    const { order } = await createOrderFixture(userId);
    const payload = validPayload(order.items.map((item) => item.id));
    const key = randomUUID();

    const first = await request(app.getHttpServer())
      .post(`/api/v1/orders/${order.id}/receive`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(payload)
      .expect(200);
    const replay = await request(app.getHttpServer())
      .post(`/api/v1/orders/${order.id}/receive`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(payload)
      .expect(200);

    expect(replay.body).toEqual(first.body);
    expect(await prisma.inventoryMovement.count()).toBe(1);
    expect(
      await prisma.auditLog.count({ where: { action: 'ORDER_RECEIVED' } }),
    ).toBe(1);
  });

  it('rejects reuse of an idempotency key with a different receipt', async () => {
    const { cookie, userId } = await authenticatedActor();
    const { order } = await createOrderFixture(userId);
    const payload = validPayload(order.items.map((item) => item.id));
    const key = randomUUID();

    await request(app.getHttpServer())
      .post(`/api/v1/orders/${order.id}/receive`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(payload)
      .expect(200);
    const response = await request(app.getHttpServer())
      .post(`/api/v1/orders/${order.id}/receive`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send({
        items: payload.items.map((item) => ({
          ...item,
          quantityReceived: 0,
        })),
      })
      .expect(409);

    expect(response.body.error.code).toBe('IDEMPOTENCY_KEY_CONFLICT');
    expect(await prisma.inventoryMovement.count()).toBe(1);
  });

  it('allows only one concurrent receipt even with different keys', async () => {
    const { cookie, userId } = await authenticatedActor();
    const { order } = await createOrderFixture(userId);
    const payload = validPayload(order.items.map((item) => item.id));

    const responses = await Promise.all(
      [randomUUID(), randomUUID()].map((key) =>
        request(app.getHttpServer())
          .post(`/api/v1/orders/${order.id}/receive`)
          .set('Cookie', cookie)
          .set('Idempotency-Key', key)
          .send(payload),
      ),
    );

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 422,
    ]);
    expect(await prisma.inventoryMovement.count()).toBe(1);
    expect(
      await prisma.auditLog.count({ where: { action: 'ORDER_RECEIVED' } }),
    ).toBe(1);
  });

  it.each([OrderStatus.RECEIVED, OrderStatus.CANCELED])(
    'rejects receipt of a %s order without new movements',
    async (status) => {
      const { cookie, userId } = await authenticatedActor();
      const { order } = await createOrderFixture(userId, status);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/orders/${order.id}/receive`)
        .set('Cookie', cookie)
        .set('Idempotency-Key', randomUUID())
        .send(validPayload(order.items.map((item) => item.id)))
        .expect(422);

      expect(response.body.error.code).toBe('ORDER_NOT_RECEIVABLE');
      expect(await prisma.inventoryMovement.count()).toBe(0);
    },
  );

  it.each([
    { name: 'missing item', transform: (ids: string[]) => validPayload([ids[0]]) },
    {
      name: 'unknown item',
      transform: (ids: string[]) => validPayload([ids[0], randomUUID()]),
    },
  ])('rejects $name without partial receipt', async ({ transform }) => {
    const { cookie, userId } = await authenticatedActor();
    const { order } = await createOrderFixture(userId);
    const response = await request(app.getHttpServer())
      .post(`/api/v1/orders/${order.id}/receive`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send(transform(order.items.map((item) => item.id)))
      .expect(422);

    expect(response.body.error.code).toBe('ORDER_RECEIPT_ITEMS_MISMATCH');
    expect(await prisma.inventoryMovement.count()).toBe(0);
    expect(
      await prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).toMatchObject({ status: 'OPEN' });
  });

  it('rejects a quantity above the ordered amount without partial receipt', async () => {
    const { cookie, userId } = await authenticatedActor();
    const { order } = await createOrderFixture(userId);
    const payload = validPayload(order.items.map((item) => item.id));
    payload.items[1].quantityReceived = 999;

    const response = await request(app.getHttpServer())
      .post(`/api/v1/orders/${order.id}/receive`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send(payload)
      .expect(422);

    expect(response.body.error.code).toBe('RECEIVED_QUANTITY_EXCEEDED');
    expect(await prisma.inventoryMovement.count()).toBe(0);
    expect(
      await prisma.orderItem.findMany({ where: { orderId: order.id } }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ quantityReceived: 0 }),
      ]),
    );
  });

  it('returns not found for an unknown order', async () => {
    const { cookie } = await authenticatedActor();

    const response = await request(app.getHttpServer())
      .post(`/api/v1/orders/${randomUUID()}/receive`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send(validPayload([randomUUID()]))
      .expect(404);

    expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
  });

  it.each([
    { items: [] },
    { items: [{ orderItemId: randomUUID(), quantityReceived: -1 }] },
    {
      items: [
        {
          orderItemId: randomUUID(),
          quantityReceived: 1,
          expirationDate: '2027-02-30',
        },
      ],
    },
    { items: [{ orderItemId: randomUUID(), quantityReceived: 1 }], extra: true },
  ])('rejects invalid payload %j before persistence', async (payload) => {
    const { cookie } = await authenticatedActor();

    await request(app.getHttpServer())
      .post(`/api/v1/orders/${randomUUID()}/receive`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send(payload)
      .expect(400);
  });

  it('requires a valid idempotency key and authentication', async () => {
    const orderId = randomUUID();
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/receive`)
      .send({})
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/receive`)
      .set('Idempotency-Key', randomUUID())
      .send(validPayload([randomUUID()]))
      .expect(401);
  });
});
