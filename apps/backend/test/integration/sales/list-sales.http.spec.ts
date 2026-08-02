import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import { type INestApplication } from '@nestjs/common';
import { PrismaClient, SaleStatus } from '@prisma/client';
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

describe('GET /api/v1/sales', () => {
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
    passwordHash = await argon2.hash('correct-password', { type: argon2.argon2id });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.inventoryMovement.deleteMany();
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.customer.deleteMany();
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
        createdById: user.id,
        updatedById: user.id,
      },
    });
    const customers = await Promise.all([
      prisma.customer.create({
        data: {
          name: 'Maria Cliente',
          createdById: user.id,
          updatedById: user.id,
        },
      }),
      prisma.customer.create({
        data: {
          name: 'Joana Cliente',
          createdById: user.id,
          updatedById: user.id,
        },
      }),
    ]);
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ login: 'ana', password: 'correct-password' })
      .expect(200);
    return {
      cookie: login.headers['set-cookie']?.[0] ?? '',
      customers,
      product,
      user,
    };
  }

  async function createSale(input: {
    userId: string;
    productId: string;
    customerId?: string;
    status?: SaleStatus;
    saleDate: string;
    total: string;
  }) {
    return prisma.sale.create({
      data: {
        customerId: input.customerId,
        status: input.status ?? SaleStatus.COMPLETED,
        saleDate: new Date(input.saleDate),
        paymentMethod: 'PIX',
        total: input.total,
        createdById: input.userId,
        ...(input.status === SaleStatus.CANCELED
          ? {
              canceledAt: new Date(input.saleDate),
              canceledById: input.userId,
              cancelReason: 'Cliente desistiu',
            }
          : {}),
        items: {
          create: {
            productId: input.productId,
            quantity: 1,
            unitPrice: input.total,
            unitCostSnapshot: '6.00',
            subtotal: input.total,
          },
        },
      },
    });
  }

  it('returns complete sales paginated from newest to oldest', async () => {
    const { cookie, customers, product, user } = await fixture();
    const older = await createSale({
      userId: user.id,
      productId: product.id,
      customerId: customers[0].id,
      saleDate: '2026-07-10T12:00:00.000Z',
      total: '12.00',
    });
    const newer = await createSale({
      userId: user.id,
      productId: product.id,
      customerId: customers[1].id,
      status: SaleStatus.CANCELED,
      saleDate: '2026-07-20T12:00:00.000Z',
      total: '15.00',
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/sales?page=1&pageSize=2')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toMatchObject({
      data: [
        {
          id: newer.id,
          customer: { id: customers[1].id, name: 'Joana Cliente' },
          status: 'CANCELED',
          total: '15.00',
          items: [{ productId: product.id, productCode: 'PERF-1' }],
        },
        { id: older.id, status: 'COMPLETED', total: '12.00' },
      ],
      meta: { page: 1, pageSize: 2, total: 2, totalPages: 1 },
    });
  });

  it('combines status, customer and inclusive date filters', async () => {
    const { cookie, customers, product, user } = await fixture();
    const expected = await createSale({
      userId: user.id,
      productId: product.id,
      customerId: customers[0].id,
      status: SaleStatus.CANCELED,
      saleDate: '2026-07-15T23:59:59.999Z',
      total: '12.00',
    });
    await createSale({
      userId: user.id,
      productId: product.id,
      customerId: customers[1].id,
      status: SaleStatus.CANCELED,
      saleDate: '2026-07-15T12:00:00.000Z',
      total: '15.00',
    });

    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/sales?status=CANCELED&customerId=${customers[0].id}&startDate=2026-07-15&endDate=2026-07-15`,
      )
      .set('Cookie', cookie)
      .expect(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(expected.id);
    expect(response.body.meta.total).toBe(1);
  });

  it.each([
    'page=0',
    'pageSize=101',
    'status=INVALID',
    'customerId=invalid',
    'startDate=2026-02-30',
    'endDate=02-08-2026',
    'unexpected=true',
  ])('rejects invalid query %s', async (query) => {
    const { cookie } = await fixture();
    const response = await request(app.getHttpServer())
      .get(`/api/v1/sales?${query}`)
      .set('Cookie', cookie)
      .expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/sales').expect(401);
  });
});
