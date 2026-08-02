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

describe('POST /api/v1/sales/:id/cancel', () => {
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
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        categoryId: category.id,
        code: 'PERF-1',
        normalizedCode: 'perf-1',
        description: 'Perfume Floral',
        catalogPrice: '15.00',
        purchasePrice: '6.00',
        originalPrice: '15.00',
        suggestedSalePrice: '12.00',
        createdById: user.id,
        updatedById: user.id,
      },
    });
    const sale = await prisma.sale.create({
      data: {
        total: '24.00',
        paymentMethod: 'PIX',
        createdById: user.id,
        items: {
          create: {
            productId: product.id,
            quantity: 2,
            unitPrice: '12.00',
            unitCostSnapshot: '6.00',
            subtotal: '24.00',
          },
        },
      },
      include: { items: true },
    });
    await prisma.inventoryMovement.createMany({
      data: [
        {
          productId: product.id,
          type: 'CORRECTION',
          quantityDelta: 5,
          reason: 'Estoque inicial',
          createdById: user.id,
        },
        {
          productId: product.id,
          saleItemId: sale.items[0].id,
          type: 'SALE',
          quantityDelta: -2,
          createdById: user.id,
        },
      ],
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ login: 'ana', password: 'correct-password' })
      .expect(200);
    return {
      cookie: login.headers['set-cookie']?.[0] ?? '',
      product,
      sale,
      user,
    };
  }

  function cancel(cookie: string, saleId: string, key: string, reason: string) {
    return request(app.getHttpServer())
      .post(`/api/v1/sales/${saleId}/cancel`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send({ reason });
  }

  it('cancels atomically, restores stock and records the audit', async () => {
    const { cookie, product, sale, user } = await fixture();
    const response = await cancel(
      cookie,
      sale.id,
      randomUUID(),
      '  Cliente desistiu da compra  ',
    )
      .set('x-request-id', 'req-cancel-sale')
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: sale.id,
      status: 'CANCELED',
      cancelReason: 'Cliente desistiu da compra',
      canceledAt: expect.any(String),
      total: '24.00',
    });
    expect(await prisma.sale.count()).toBe(1);
    expect(
      await prisma.inventoryMovement.findMany({
        where: { saleItemId: sale.items[0].id },
        orderBy: { createdAt: 'asc' },
        select: { type: true, quantityDelta: true },
      }),
    ).toEqual([
      { type: 'SALE', quantityDelta: -2 },
      { type: 'SALE_CANCELLATION', quantityDelta: 2 },
    ]);
    const balance = await prisma.inventoryMovement.aggregate({
      where: { productId: product.id },
      _sum: { quantityDelta: true },
    });
    expect(balance._sum.quantityDelta).toBe(5);
    expect(
      await prisma.auditLog.findFirst({
        where: { action: 'SALE_CANCELED', entityId: sale.id },
      }),
    ).toMatchObject({ userId: user.id, requestId: 'req-cancel-sale' });
  });

  it('replays the same key without duplicate reversals or audits', async () => {
    const { cookie, sale } = await fixture();
    const key = randomUUID();
    const first = await cancel(cookie, sale.id, key, 'Cliente desistiu').expect(200);
    const replay = await cancel(cookie, sale.id, key, 'Cliente desistiu').expect(200);
    expect(replay.body).toEqual(first.body);
    expect(
      await prisma.inventoryMovement.count({ where: { type: 'SALE_CANCELLATION' } }),
    ).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: 'SALE_CANCELED' } })).toBe(1);
  });

  it('rejects key reuse with another cancellation request', async () => {
    const { cookie, sale } = await fixture();
    const key = randomUUID();
    await cancel(cookie, sale.id, key, 'Cliente desistiu').expect(200);
    const response = await cancel(cookie, sale.id, key, 'Outro motivo').expect(409);
    expect(response.body.error.code).toBe('SALE_IDEMPOTENCY_KEY_CONFLICT');
  });

  it('allows only one cancellation with different concurrent keys', async () => {
    const { cookie, sale } = await fixture();
    const responses = await Promise.all([
      cancel(cookie, sale.id, randomUUID(), 'Cliente desistiu'),
      cancel(cookie, sale.id, randomUUID(), 'Cliente desistiu'),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 422]);
    expect(
      await prisma.inventoryMovement.count({ where: { type: 'SALE_CANCELLATION' } }),
    ).toBe(1);
  });

  it('rejects an already canceled sale without new side effects', async () => {
    const { cookie, sale } = await fixture();
    await cancel(cookie, sale.id, randomUUID(), 'Cliente desistiu').expect(200);
    const response = await cancel(cookie, sale.id, randomUUID(), 'Repetição').expect(422);
    expect(response.body.error.code).toBe('SALE_NOT_CANCELABLE');
    expect(
      await prisma.inventoryMovement.count({ where: { type: 'SALE_CANCELLATION' } }),
    ).toBe(1);
  });

  it('returns not found for an unknown sale', async () => {
    const { cookie } = await fixture();
    const response = await cancel(cookie, randomUUID(), randomUUID(), 'Cancelamento').expect(404);
    expect(response.body.error.code).toBe('SALE_NOT_FOUND');
  });

  it.each([
    {},
    { reason: '' },
    { reason: '   ' },
    { reason: 'a'.repeat(501) },
    { reason: 'Cancelamento', unexpected: true },
  ])('rejects invalid payload %j without side effects', async (payload) => {
    const { cookie, sale } = await fixture();
    await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.id}/cancel`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send(payload)
      .expect(400);
    expect(await prisma.sale.findUnique({ where: { id: sale.id } })).toMatchObject({
      status: 'COMPLETED',
    });
  });

  it('requires authentication and a valid idempotency key', async () => {
    const { cookie, sale } = await fixture();
    await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.id}/cancel`)
      .send({ reason: 'Cancelamento' })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.id}/cancel`)
      .set('Idempotency-Key', randomUUID())
      .send({ reason: 'Cancelamento' })
      .expect(401);
    await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.id}/cancel`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', 'invalid')
      .send({ reason: 'Cancelamento' })
      .expect(400);
  });
});
