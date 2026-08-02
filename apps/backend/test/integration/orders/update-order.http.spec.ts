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

describe('PUT /api/v1/orders/:id', () => {
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

  async function createReferences(userId: string) {
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
    const firstProduct = await prisma.product.create({
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
    const secondProduct = await prisma.product.create({
      data: {
        brandId: brand.id,
        categoryId: category.id,
        code: 'CREME-001',
        normalizedCode: 'creme-001',
        description: 'Creme corporal',
        catalogPrice: '99.90',
        purchasePrice: '59.00',
        originalPrice: '119.90',
        createdById: userId,
        updatedById: userId,
      },
    });

    return { brand, category, firstProduct, secondProduct };
  }

  async function createOrder(
    userId: string,
    brandId: string,
    productId: string,
    status: OrderStatus = OrderStatus.OPEN,
  ) {
    return prisma.order.create({
      data: {
        brandId,
        cycle: '12/2026',
        orderDate: new Date('2026-08-02T00:00:00.000Z'),
        status,
        ...(status === OrderStatus.RECEIVED
          ? {
              receivedAt: new Date('2026-08-03T10:00:00.000Z'),
              receivedById: userId,
            }
          : {}),
        ...(status === OrderStatus.CANCELED
          ? {
              canceledAt: new Date('2026-08-03T10:00:00.000Z'),
              canceledById: userId,
              cancelReason: 'Pedido cancelado para teste',
            }
          : {}),
        createdById: userId,
        updatedById: userId,
        items: {
          create: {
            productId,
            quantityOrdered: 1,
            catalogUnitPrice: '149.90',
            purchaseUnitPrice: '89.00',
            originalUnitPrice: '179.90',
          },
        },
      },
      include: { items: true },
    });
  }

  function updatePayload(brandId: string, productId: string) {
    return {
      brandId,
      cycle: '  13/2026  ',
      orderDate: '2026-08-03',
      notes: '  Reposição da campanha  ',
      items: [
        {
          productId,
          quantityOrdered: 3,
          catalogUnitPrice: '99.9',
          purchaseUnitPrice: '059',
          originalUnitPrice: '119.90',
          notes: '  Separar brindes  ',
        },
      ],
    };
  }

  it('replaces an open order aggregate with snapshots and audit in one transaction', async () => {
    const { cookie, userId } = await authenticatedActor();
    const references = await createReferences(userId);
    const order = await createOrder(
      userId,
      references.brand.id,
      references.firstProduct.id,
    );

    const response = await request(app.getHttpServer())
      .put(`/api/v1/orders/${order.id}`)
      .set('Cookie', cookie)
      .set('x-request-id', 'req-integration-update-order')
      .send(updatePayload(references.brand.id, references.secondProduct.id))
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: order.id,
      brand: { id: references.brand.id, name: 'Natura' },
      cycle: '13/2026',
      orderDate: '2026-08-03',
      status: 'OPEN',
      notes: 'Reposição da campanha',
      items: [
        {
          productId: references.secondProduct.id,
          productCode: 'CREME-001',
          productDescription: 'Creme corporal',
          quantityOrdered: 3,
          quantityReceived: 0,
          catalogUnitPrice: '99.90',
          purchaseUnitPrice: '59.00',
          originalUnitPrice: '119.90',
          expirationDate: null,
          notes: 'Separar brindes',
        },
      ],
    });

    const persisted = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });
    expect(persisted.items).toHaveLength(1);
    expect(persisted.items[0].id).not.toBe(order.items[0].id);
    expect(persisted.updatedById).toBe(userId);
    expect(await prisma.inventoryMovement.count()).toBe(0);
    expect(
      await prisma.auditLog.findFirst({
        where: { action: 'ORDER_UPDATED', entityId: order.id },
      }),
    ).toMatchObject({
      actorType: 'USER',
      userId,
      entityType: 'Order',
      requestId: 'req-integration-update-order',
    });
  });

  it('returns an order by id using the documented contract', async () => {
    const { cookie, userId } = await authenticatedActor();
    const references = await createReferences(userId);
    const order = await createOrder(
      userId,
      references.brand.id,
      references.firstProduct.id,
    );

    const response = await request(app.getHttpServer())
      .get(`/api/v1/orders/${order.id}`)
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: order.id,
      cycle: '12/2026',
      status: 'OPEN',
      items: [{ productId: references.firstProduct.id }],
    });
  });

  it.each([OrderStatus.RECEIVED, OrderStatus.CANCELED])(
    'rejects editing a %s order without partial changes',
    async (status) => {
      const { cookie, userId } = await authenticatedActor();
      const references = await createReferences(userId);
      const order = await createOrder(
        userId,
        references.brand.id,
        references.firstProduct.id,
        status,
      );

      const response = await request(app.getHttpServer())
        .put(`/api/v1/orders/${order.id}`)
        .set('Cookie', cookie)
        .send(updatePayload(references.brand.id, references.secondProduct.id))
        .expect(422);

      expect(response.body.error.code).toBe('ORDER_NOT_EDITABLE');
      expect(
        await prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
      ).toMatchObject({ cycle: '12/2026', status });
      expect(
        await prisma.orderItem.findMany({ where: { orderId: order.id } }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ productId: references.firstProduct.id }),
        ]),
      );
      expect(
        await prisma.auditLog.count({ where: { action: 'ORDER_UPDATED' } }),
      ).toBe(0);
    },
  );

  it('returns not found for an unknown order on read and update', async () => {
    const { cookie } = await authenticatedActor();
    const orderId = randomUUID();

    const read = await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderId}`)
      .set('Cookie', cookie)
      .expect(404);
    const update = await request(app.getHttpServer())
      .put(`/api/v1/orders/${orderId}`)
      .set('Cookie', cookie)
      .send(updatePayload(randomUUID(), randomUUID()))
      .expect(404);

    expect(read.body.error.code).toBe('ORDER_NOT_FOUND');
    expect(update.body.error.code).toBe('ORDER_NOT_FOUND');
  });

  it.each([
    { reference: 'brand', expectedCode: 'ORDER_BRAND_INACTIVE' },
    { reference: 'product', expectedCode: 'ORDER_PRODUCT_INACTIVE' },
  ])('rejects an inactive $reference without changing the order', async ({ reference, expectedCode }) => {
    const { cookie, userId } = await authenticatedActor();
    const references = await createReferences(userId);
    const order = await createOrder(
      userId,
      references.brand.id,
      references.firstProduct.id,
    );
    if (reference === 'brand') {
      await prisma.brand.update({
        where: { id: references.brand.id },
        data: { active: false },
      });
    } else {
      await prisma.product.update({
        where: { id: references.secondProduct.id },
        data: { active: false },
      });
    }

    const response = await request(app.getHttpServer())
      .put(`/api/v1/orders/${order.id}`)
      .set('Cookie', cookie)
      .send(updatePayload(references.brand.id, references.secondProduct.id))
      .expect(422);

    expect(response.body.error.code).toBe(expectedCode);
    expect(
      await prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).toMatchObject({ cycle: '12/2026' });
  });

  it('rejects a product from another brand without changing the order', async () => {
    const { cookie, userId } = await authenticatedActor();
    const references = await createReferences(userId);
    const otherBrand = await prisma.brand.create({
      data: {
        name: 'Avon',
        normalizedName: 'avon',
        createdById: userId,
        updatedById: userId,
      },
    });
    const otherProduct = await prisma.product.create({
      data: {
        brandId: otherBrand.id,
        categoryId: references.category.id,
        code: 'AVON-001',
        normalizedCode: 'avon-001',
        description: 'Far Away',
        catalogPrice: '120.00',
        purchasePrice: '70.00',
        originalPrice: '140.00',
        createdById: userId,
        updatedById: userId,
      },
    });
    const order = await createOrder(
      userId,
      references.brand.id,
      references.firstProduct.id,
    );

    const response = await request(app.getHttpServer())
      .put(`/api/v1/orders/${order.id}`)
      .set('Cookie', cookie)
      .send(updatePayload(references.brand.id, otherProduct.id))
      .expect(422);

    expect(response.body.error.code).toBe('ORDER_BRAND_MISMATCH');
    expect(await prisma.orderItem.count({ where: { orderId: order.id } })).toBe(1);
  });

  it.each([
    { items: [] },
    { items: [{ quantityOrdered: 0 }] },
    { orderDate: '2026-02-30' },
    { unexpected: true },
  ])('rejects invalid payload %j without partial changes', async (change) => {
    const { cookie, userId } = await authenticatedActor();
    const references = await createReferences(userId);
    const order = await createOrder(
      userId,
      references.brand.id,
      references.firstProduct.id,
    );
    const payload = updatePayload(
      references.brand.id,
      references.secondProduct.id,
    );
    const invalidPayload = {
      ...payload,
      ...change,
      ...(change.items?.[0]
        ? { items: [{ ...payload.items[0], ...change.items[0] }] }
        : {}),
    };

    await request(app.getHttpServer())
      .put(`/api/v1/orders/${order.id}`)
      .set('Cookie', cookie)
      .send(invalidPayload)
      .expect(400);

    expect(
      await prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).toMatchObject({ cycle: '12/2026' });
    expect(await prisma.auditLog.count({ where: { action: 'ORDER_UPDATED' } })).toBe(
      0,
    );
  });

  it('validates the identifier and requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/orders/invalid').expect(400);
    await request(app.getHttpServer())
      .put(`/api/v1/orders/${randomUUID()}`)
      .send(updatePayload(randomUUID(), randomUUID()))
      .expect(401);
  });
});
