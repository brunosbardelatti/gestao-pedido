import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

import { type INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Test } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import * as argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/configure-app';

describe('POST /api/v1/sales', () => {
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
      ['prisma', 'migrate', 'deploy', '--schema', resolve(process.cwd(), 'prisma/schema.prisma')],
      { cwd: process.cwd(), env: process.env, stdio: 'pipe' },
    );
    prisma = new PrismaClient();
    await prisma.$connect();
    passwordHash = await argon2.hash('correct-password', {
      type: argon2.argon2id,
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(async () => {
    await prisma.idempotencyRecord.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.inventoryMovement.deleteMany();
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.customer.deleteMany();
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

  async function fixture() {
    const user = await prisma.user.create({
      data: {
        name: 'Ana',
        login: 'ana',
        normalizedLogin: 'ana',
        passwordHash,
        role: 'OPERATOR',
      },
    });
    const brand = await prisma.brand.create({
      data: {
        name: 'Natura',
        normalizedName: 'natura',
        createdById: user.id,
        updatedById: user.id,
      },
    });
    const category = await prisma.category.create({
      data: {
        name: 'Perfumaria',
        normalizedName: 'perfumaria',
        createdById: user.id,
        updatedById: user.id,
      },
    });
    const products = await Promise.all([
      prisma.product.create({
        data: {
          brandId: brand.id,
          categoryId: category.id,
          code: 'PERF-1',
          normalizedCode: 'perf-1',
          description: 'Perfume Floral',
          catalogPrice: '15.00',
          purchasePrice: '6.25',
          originalPrice: '15.00',
          suggestedSalePrice: '12.00',
          createdById: user.id,
          updatedById: user.id,
        },
      }),
      prisma.product.create({
        data: {
          brandId: brand.id,
          categoryId: category.id,
          code: 'SAB-1',
          normalizedCode: 'sab-1',
          description: 'Sabonete',
          catalogPrice: '5.00',
          purchasePrice: '2.00',
          originalPrice: '5.00',
          suggestedSalePrice: '4.50',
          createdById: user.id,
          updatedById: user.id,
        },
      }),
    ]);
    await prisma.inventoryMovement.createMany({
      data: products.map((product, index) => ({
        productId: product.id,
        type: 'CORRECTION',
        quantityDelta: index === 0 ? 5 : 3,
        reason: 'Estoque inicial',
        createdById: user.id,
      })),
    });
    const customer = await prisma.customer.create({
      data: {
        name: 'Maria Cliente',
        cpf: '12345678901',
        createdById: user.id,
        updatedById: user.id,
      },
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ login: 'ana', password: 'correct-password' })
      .expect(200);
    return {
      user,
      products,
      customer,
      cookie: login.headers['set-cookie']?.[0] ?? '',
    };
  }

  it('creates sale snapshots, stock outputs and audit atomically', async () => {
    const { cookie, customer, products, user } = await fixture();
    const response = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .set('x-request-id', 'req-create-sale')
      .send({
        customerId: customer.id,
        paymentMethod: 'PIX',
        notes: ' Entregar amanhã ',
        confirmNegativeStock: false,
        items: [
          { productId: products[0].id, quantity: 2, unitPrice: '11.50' },
          { productId: products[1].id, quantity: 1, unitPrice: '4.25' },
        ],
      })
      .expect(201);

    expect(response.body.data).toMatchObject({
      id: expect.any(String),
      customer: { id: customer.id, name: 'Maria Cliente' },
      status: 'COMPLETED',
      paymentMethod: 'PIX',
      total: '27.25',
      notes: 'Entregar amanhã',
      canceledAt: null,
      cancelReason: null,
      items: [
        {
          productId: products[0].id,
          productCode: 'PERF-1',
          quantity: 2,
          unitPrice: '11.50',
          unitCostSnapshot: '6.25',
          subtotal: '23.00',
        },
        {
          productId: products[1].id,
          productCode: 'SAB-1',
          quantity: 1,
          unitPrice: '4.25',
          unitCostSnapshot: '2.00',
          subtotal: '4.25',
        },
      ],
    });
    const movements = await prisma.inventoryMovement.findMany({
      where: { type: 'SALE' },
      orderBy: { productId: 'asc' },
    });
    expect(
      movements
        .map((movement) => movement.quantityDelta)
        .sort((left, right) => left - right),
    ).toEqual([-2, -1]);
    expect(movements.every((movement) => movement.saleItemId !== null)).toBe(true);
    expect(
      await prisma.auditLog.findFirst({
        where: { action: 'SALE_CREATED', entityId: response.body.data.id },
      }),
    ).toMatchObject({ userId: user.id, requestId: 'req-create-sale' });
  });

  it('replays the same idempotency key without duplicate effects', async () => {
    const { cookie, products } = await fixture();
    const key = randomUUID();
    const payload = {
      items: [{ productId: products[0].id, quantity: 1, unitPrice: '12.00' }],
    };
    const first = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(payload)
      .expect(201);
    const replay = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(payload)
      .expect(201);
    expect(replay.body).toEqual(first.body);
    expect(await prisma.sale.count()).toBe(1);
    expect(await prisma.inventoryMovement.count({ where: { type: 'SALE' } })).toBe(1);
  });

  it('rejects reuse of a key with another payload', async () => {
    const { cookie, products } = await fixture();
    const key = randomUUID();
    await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send({ items: [{ productId: products[0].id, quantity: 1, unitPrice: '12' }] })
      .expect(201);
    const response = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send({ items: [{ productId: products[0].id, quantity: 2, unitPrice: '12' }] })
      .expect(409);
    expect(response.body.error.code).toBe('SALE_IDEMPOTENCY_KEY_CONFLICT');
    expect(await prisma.sale.count()).toBe(1);
  });

  it('requires explicit confirmation before allowing negative stock', async () => {
    const { cookie, products } = await fixture();
    const payload = {
      items: [{ productId: products[1].id, quantity: 4, unitPrice: '4.50' }],
    };
    const rejected = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send(payload)
      .expect(422);
    expect(rejected.body.error.code).toBe('NEGATIVE_STOCK_CONFIRMATION_REQUIRED');
    expect(await prisma.sale.count()).toBe(0);

    await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send({ ...payload, confirmNegativeStock: true })
      .expect(201);
    const balance = await prisma.inventoryMovement.aggregate({
      where: { productId: products[1].id },
      _sum: { quantityDelta: true },
    });
    expect(balance._sum.quantityDelta).toBe(-1);
  });

  it('serializes concurrent sales against the same stock balance', async () => {
    const { cookie, products } = await fixture();
    const sell = () =>
      request(app.getHttpServer())
        .post('/api/v1/sales')
        .set('Cookie', cookie)
        .set('Idempotency-Key', randomUUID())
        .send({ items: [{ productId: products[0].id, quantity: 4, unitPrice: '12' }] });
    const responses = await Promise.all([sell(), sell()]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 422]);
    expect(await prisma.sale.count()).toBe(1);
    const balance = await prisma.inventoryMovement.aggregate({
      where: { productId: products[0].id },
      _sum: { quantityDelta: true },
    });
    expect(balance._sum.quantityDelta).toBe(1);
  });

  it('rejects missing or inactive references without partial persistence', async () => {
    const { cookie, customer, products } = await fixture();
    await prisma.product.update({ where: { id: products[1].id }, data: { active: false } });
    const inactiveProduct = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send({ items: [{ productId: products[1].id, quantity: 1, unitPrice: '4' }] })
      .expect(422);
    expect(inactiveProduct.body.error.code).toBe('SALE_PRODUCT_INACTIVE');

    await prisma.customer.update({ where: { id: customer.id }, data: { active: false } });
    const inactiveCustomer = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send({
        customerId: customer.id,
        items: [{ productId: products[0].id, quantity: 1, unitPrice: '12' }],
      })
      .expect(422);
    expect(inactiveCustomer.body.error.code).toBe('SALE_CUSTOMER_INACTIVE');
    expect(await prisma.sale.count()).toBe(0);
  });

  it.each([
    { items: [] },
    { items: [{ productId: 'invalid', quantity: 1, unitPrice: '10' }] },
    { items: [{ productId: randomUUID(), quantity: 0, unitPrice: '10' }] },
    { items: [{ productId: randomUUID(), quantity: 1, unitPrice: '10.999' }] },
    { items: [{ productId: randomUUID(), quantity: 1, unitPrice: '10' }], unexpected: true },
  ])('rejects invalid payload %j', async (payload) => {
    const { cookie } = await fixture();
    await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send(payload)
      .expect(400);
    expect(await prisma.sale.count()).toBe(0);
  });

  it('requires authentication and a valid idempotency key', async () => {
    const { cookie, products } = await fixture();
    const payload = { items: [{ productId: products[0].id, quantity: 1, unitPrice: '12' }] };
    await request(app.getHttpServer()).post('/api/v1/sales').send(payload).expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Idempotency-Key', randomUUID())
      .send(payload)
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Cookie', cookie)
      .set('Idempotency-Key', 'invalid')
      .send(payload)
      .expect(400);
  });
});
