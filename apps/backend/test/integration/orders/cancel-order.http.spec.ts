import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  InventoryMovementType,
  OrderStatus,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import * as argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/configure-app';

describe('POST /api/v1/orders/:id/cancel', () => {
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
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        categoryId: category.id,
        code: 'PERF-001',
        normalizedCode: 'perf-001',
        description: 'Essencial feminino',
        catalogPrice: '149.90',
        purchasePrice: '89.00',
        originalPrice: '179.90',
        createdById: userId,
        updatedById: userId,
      },
    });
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
              cancelReason: 'Cancelado anteriormente',
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
          create: {
            productId: product.id,
            quantityOrdered: 3,
            quantityReceived: status === OrderStatus.RECEIVED ? 3 : 0,
            catalogUnitPrice: '149.90',
            purchaseUnitPrice: '89.00',
            originalUnitPrice: '179.90',
          },
        },
      },
      include: { items: true },
    });
    if (status === OrderStatus.RECEIVED) {
      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          orderItemId: order.items[0].id,
          type: InventoryMovementType.PURCHASE,
          quantityDelta: 3,
          createdById: userId,
        },
      });
    }

    return { order, product };
  }

  it('cancels an open order with audit and without stock movement', async () => {
    const { cookie, userId } = await authenticatedActor();
    const { order } = await createOrderFixture(userId);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/orders/${order.id}/cancel`)
      .set('Cookie', cookie)
      .set('x-request-id', 'req-integration-cancel-order')
      .send({ reason: '  Fornecedor cancelou a campanha  ' })
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: order.id,
      status: 'CANCELED',
      canceledAt: expect.any(String),
      cancelReason: 'Fornecedor cancelou a campanha',
      receivedAt: null,
      items: [expect.objectContaining({ id: order.items[0].id })],
    });
    expect(
      await prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).toMatchObject({
      status: 'CANCELED',
      canceledById: userId,
      canceledAt: expect.any(Date),
      cancelReason: 'Fornecedor cancelou a campanha',
      updatedById: userId,
    });
    expect(await prisma.orderItem.count({ where: { orderId: order.id } })).toBe(1);
    expect(await prisma.inventoryMovement.count()).toBe(0);
    expect(
      await prisma.auditLog.findFirst({
        where: { action: 'ORDER_CANCELED', entityId: order.id },
      }),
    ).toMatchObject({
      userId,
      requestId: 'req-integration-cancel-order',
    });
  });

  it.each([OrderStatus.RECEIVED, OrderStatus.CANCELED])(
    'rejects cancellation of a %s order and preserves inventory history',
    async (status) => {
      const { cookie, userId } = await authenticatedActor();
      const { order } = await createOrderFixture(userId, status);
      const movementsBefore = await prisma.inventoryMovement.count();

      const response = await request(app.getHttpServer())
        .post(`/api/v1/orders/${order.id}/cancel`)
        .set('Cookie', cookie)
        .send({ reason: 'Tentativa inválida' })
        .expect(422);

      expect(response.body.error.code).toBe('ORDER_NOT_CANCELABLE');
      expect(
        await prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
      ).toMatchObject({ status });
      expect(await prisma.inventoryMovement.count()).toBe(movementsBefore);
      expect(
        await prisma.auditLog.count({ where: { action: 'ORDER_CANCELED' } }),
      ).toBe(0);
    },
  );

  it('allows only one concurrent cancellation', async () => {
    const { cookie, userId } = await authenticatedActor();
    const { order } = await createOrderFixture(userId);

    const responses = await Promise.all(
      ['Primeira tentativa', 'Segunda tentativa'].map((reason) =>
        request(app.getHttpServer())
          .post(`/api/v1/orders/${order.id}/cancel`)
          .set('Cookie', cookie)
          .send({ reason }),
      ),
    );

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 422,
    ]);
    expect(
      await prisma.auditLog.count({ where: { action: 'ORDER_CANCELED' } }),
    ).toBe(1);
    expect(await prisma.inventoryMovement.count()).toBe(0);
  });

  it('returns not found for an unknown order', async () => {
    const { cookie } = await authenticatedActor();

    const response = await request(app.getHttpServer())
      .post(`/api/v1/orders/${randomUUID()}/cancel`)
      .set('Cookie', cookie)
      .send({ reason: 'Pedido inexistente' })
      .expect(404);

    expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
  });

  it.each([
    {},
    { reason: '' },
    { reason: '   ' },
    { reason: 'a'.repeat(501) },
    { reason: 'Motivo válido', unexpected: true },
  ])('rejects invalid payload %j without changing the order', async (payload) => {
    const { cookie, userId } = await authenticatedActor();
    const { order } = await createOrderFixture(userId);

    await request(app.getHttpServer())
      .post(`/api/v1/orders/${order.id}/cancel`)
      .set('Cookie', cookie)
      .send(payload)
      .expect(400);

    expect(
      await prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).toMatchObject({ status: 'OPEN' });
  });

  it('validates the identifier and requires authentication', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/orders/invalid/cancel')
      .send({ reason: 'Inválido' })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${randomUUID()}/cancel`)
      .send({ reason: 'Sem autenticação' })
      .expect(401);
  });
});
