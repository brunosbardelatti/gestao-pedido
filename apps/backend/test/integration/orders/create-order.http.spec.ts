import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, UserRole } from '@prisma/client';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import * as argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/configure-app';

describe('POST /api/v1/orders', () => {
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

  async function createBrand(userId: string, name: string, active = true) {
    return prisma.brand.create({
      data: {
        name,
        normalizedName: name.toLowerCase(),
        active,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async function createCategory(userId: string) {
    return prisma.category.create({
      data: {
        name: 'Perfumaria',
        normalizedName: 'perfumaria',
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async function createProduct(
    userId: string,
    brandId: string,
    categoryId: string,
    code: string,
    description: string,
    active = true,
  ) {
    return prisma.product.create({
      data: {
        brandId,
        categoryId,
        code,
        normalizedCode: code.toLowerCase(),
        description,
        catalogPrice: '149.90',
        purchasePrice: '89.00',
        originalPrice: '179.90',
        suggestedSalePrice: '169.90',
        active,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  function validPayload(brandId: string, productIds: string[]) {
    return {
      brandId,
      cycle: '  12/2026  ',
      orderDate: '2026-08-02',
      notes: '  Campanha de agosto  ',
      items: productIds.map((productId, index) => ({
        productId,
        quantityOrdered: index + 1,
        catalogUnitPrice: index === 0 ? '149.9' : '99.90',
        purchaseUnitPrice: index === 0 ? '089' : '59.90',
        originalUnitPrice: index === 0 ? '179.90' : '119.90',
        notes: index === 0 ? '  Brinde incluído  ' : null,
      })),
    };
  }

  it('creates an open order with price snapshots, audit and no stock movement', async () => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId, 'Natura');
    const category = await createCategory(userId);
    const perfume = await createProduct(
      userId,
      brand.id,
      category.id,
      'PERF-001',
      'Essencial feminino',
    );
    const creme = await createProduct(
      userId,
      brand.id,
      category.id,
      'CREME-001',
      'Creme corporal',
    );
    const key = randomUUID();

    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .set('x-request-id', 'req-integration-create-order')
      .send(validPayload(brand.id, [perfume.id, creme.id]))
      .expect(201);

    expect(response.body.data).toMatchObject({
      id: expect.any(String),
      brand: { id: brand.id, name: 'Natura', active: true },
      cycle: '12/2026',
      orderDate: '2026-08-02',
      receivedAt: null,
      canceledAt: null,
      cancelReason: null,
      status: 'OPEN',
      notes: 'Campanha de agosto',
      items: expect.arrayContaining([
        {
          id: expect.any(String),
          productId: perfume.id,
          productCode: 'PERF-001',
          productDescription: 'Essencial feminino',
          quantityOrdered: 1,
          quantityReceived: 0,
          catalogUnitPrice: '149.90',
          purchaseUnitPrice: '89.00',
          originalUnitPrice: '179.90',
          expirationDate: null,
          notes: 'Brinde incluído',
        },
      ]),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: response.body.data.id },
      include: { items: true },
    });
    expect(order).toMatchObject({
      brandId: brand.id,
      cycle: '12/2026',
      status: 'OPEN',
      createdById: userId,
      updatedById: userId,
    });
    expect(order.items).toHaveLength(2);
    expect(await prisma.inventoryMovement.count()).toBe(0);
    expect(
      await prisma.auditLog.findFirst({
        where: { action: 'ORDER_CREATED', entityId: order.id },
      }),
    ).toMatchObject({
      actorType: 'USER',
      userId,
      entityType: 'Order',
      requestId: 'req-integration-create-order',
    });
    expect(
      await prisma.idempotencyRecord.findUniqueOrThrow({
        where: {
          scope_key: {
            scope: `orders:create:user:${userId}`,
            key,
          },
        },
      }),
    ).toMatchObject({
      status: 'COMPLETED',
      actorType: 'USER',
      userId,
      responseStatus: 201,
    });
  });

  it('replays the same response without duplicating order or audit', async () => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId, 'Natura');
    const category = await createCategory(userId);
    const product = await createProduct(
      userId,
      brand.id,
      category.id,
      'PERF-001',
      'Essencial feminino',
    );
    const key = randomUUID();
    const payload = validPayload(brand.id, [product.id]);

    const first = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(payload)
      .expect(201);
    const replay = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(payload)
      .expect(201);

    expect(replay.body).toEqual(first.body);
    expect(await prisma.order.count()).toBe(1);
    expect(
      await prisma.auditLog.count({ where: { action: 'ORDER_CREATED' } }),
    ).toBe(1);
  });

  it('rejects reuse of an idempotency key with a different payload', async () => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId, 'Natura');
    const category = await createCategory(userId);
    const product = await createProduct(
      userId,
      brand.id,
      category.id,
      'PERF-001',
      'Essencial feminino',
    );
    const key = randomUUID();
    const payload = validPayload(brand.id, [product.id]);

    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(payload)
      .expect(201);
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send({ ...payload, cycle: '13/2026' })
      .expect(409);

    expect(response.body.error.code).toBe('IDEMPOTENCY_KEY_CONFLICT');
    expect(await prisma.order.count()).toBe(1);
  });

  it('rejects products from another brand without partial persistence', async () => {
    const { cookie, userId } = await authenticatedActor();
    const natura = await createBrand(userId, 'Natura');
    const avon = await createBrand(userId, 'Avon');
    const category = await createCategory(userId);
    const product = await createProduct(
      userId,
      avon.id,
      category.id,
      'AVON-001',
      'Far Away',
    );

    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send(validPayload(natura.id, [product.id]))
      .expect(422);

    expect(response.body.error.code).toBe('ORDER_BRAND_MISMATCH');
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.idempotencyRecord.count()).toBe(0);
  });

  it.each([
    { kind: 'brand', expectedCode: 'ORDER_BRAND_INACTIVE' },
    { kind: 'product', expectedCode: 'ORDER_PRODUCT_INACTIVE' },
  ])('rejects an inactive $kind in a new order', async ({ kind, expectedCode }) => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId, 'Natura', kind !== 'brand');
    const category = await createCategory(userId);
    const product = await createProduct(
      userId,
      brand.id,
      category.id,
      'PERF-001',
      'Essencial feminino',
      kind !== 'product',
    );

    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send(validPayload(brand.id, [product.id]))
      .expect(422);

    expect(response.body.error.code).toBe(expectedCode);
    expect(await prisma.order.count()).toBe(0);
  });

  it('returns not found for an unknown brand', async () => {
    const { cookie } = await authenticatedActor();

    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send(validPayload(randomUUID(), [randomUUID()]))
      .expect(404);

    expect(response.body.error.code).toBe('BRAND_NOT_FOUND');
  });

  it('returns not found for an unknown product', async () => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId, 'Natura');

    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send(validPayload(brand.id, [randomUUID()]))
      .expect(404);

    expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('rejects repeated products in the payload', async () => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId, 'Natura');
    const category = await createCategory(userId);
    const product = await createProduct(
      userId,
      brand.id,
      category.id,
      'PERF-001',
      'Essencial feminino',
    );

    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send(validPayload(brand.id, [product.id, product.id]))
      .expect(422);

    expect(response.body.error.code).toBe('DUPLICATE_ORDER_PRODUCT');
    expect(await prisma.order.count()).toBe(0);
  });

  it.each([
    { name: 'empty items', change: { items: [] } },
    { name: 'invalid quantity', change: { itemChange: { quantityOrdered: 0 } } },
    { name: 'invalid price', change: { itemChange: { purchaseUnitPrice: '-1' } } },
    { name: 'invalid date', change: { orderDate: '2026-02-30' } },
    { name: 'unexpected field', change: { unexpected: true } },
  ])('rejects $name without persistence', async ({ change }) => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId, 'Natura');
    const category = await createCategory(userId);
    const product = await createProduct(
      userId,
      brand.id,
      category.id,
      'PERF-001',
      'Essencial feminino',
    );
    const payload = validPayload(brand.id, [product.id]);
    const { itemChange, ...rootChange } = change as {
      itemChange?: Record<string, unknown>;
      [key: string]: unknown;
    };
    const invalidPayload = {
      ...payload,
      ...rootChange,
      ...(itemChange
        ? { items: [{ ...payload.items[0], ...itemChange }] }
        : {}),
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send(invalidPayload)
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(await prisma.order.count()).toBe(0);
  });

  it('requires a valid idempotency key', async () => {
    const { cookie } = await authenticatedActor();

    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', cookie)
      .send({})
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', cookie)
      .set('Idempotency-Key', 'invalid')
      .send({})
      .expect(400);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Idempotency-Key', randomUUID())
      .send(validPayload(randomUUID(), [randomUUID()]))
      .expect(401);
  });
});
