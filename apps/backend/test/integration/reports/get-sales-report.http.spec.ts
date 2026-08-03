import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import { type INestApplication } from '@nestjs/common';
import { PrismaClient, SaleStatus, UserRole } from '@prisma/client';
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

describe('GET /api/v1/reports/sales', () => {
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
        name: 'Ana Silva',
        login: 'ana',
        normalizedLogin: 'ana',
        passwordHash,
        role: UserRole.OPERATOR,
      },
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ login: 'ana', password: 'correct-password' })
      .expect(200);
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
        code: 'PERF-001',
        normalizedCode: 'perf-001',
        description: 'Essencial feminino',
        catalogPrice: '20.00',
        purchasePrice: '8.00',
        originalPrice: '20.00',
        createdById: user.id,
        updatedById: user.id,
      },
    });

    const createSale = (input: {
      saleDate: string;
      status?: SaleStatus;
      quantity: number;
      total: string;
    }) =>
      prisma.sale.create({
        data: {
          status: input.status ?? SaleStatus.COMPLETED,
          saleDate: new Date(input.saleDate),
          total: input.total,
          createdById: user.id,
          ...(input.status === SaleStatus.CANCELED
            ? {
                canceledAt: new Date(input.saleDate),
                canceledById: user.id,
                cancelReason: 'Teste do consolidado',
              }
            : {}),
          items: {
            create: {
              productId: product.id,
              quantity: input.quantity,
              unitPrice: (Number(input.total) / input.quantity).toFixed(2),
              unitCostSnapshot: '8.00',
              subtotal: input.total,
            },
          },
        },
      });

    await createSale({
      saleDate: '2026-07-01T00:00:00.000Z',
      quantity: 2,
      total: '20.00',
    });
    await createSale({
      saleDate: '2026-07-31T23:59:59.999Z',
      status: SaleStatus.CANCELED,
      quantity: 1,
      total: '50.00',
    });
    await createSale({
      saleDate: '2026-08-01T00:00:00.000Z',
      quantity: 4,
      total: '80.00',
    });

    return { cookie: login.headers['set-cookie']?.[0] ?? '' };
  }

  it('consolidates only completed sales in the inclusive period by default', async () => {
    const { cookie } = await fixture();
    const response = await request(app.getHttpServer())
      .get('/api/v1/reports/sales?startDate=2026-07-01&endDate=2026-07-31')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toEqual({
      data: {
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        salesCount: 1,
        itemsCount: 2,
        revenue: '20.00',
      },
    });
  });

  it('includes canceled sales in all totals when explicitly requested', async () => {
    const { cookie } = await fixture();
    const response = await request(app.getHttpServer())
      .get(
        '/api/v1/reports/sales?startDate=2026-07-01&endDate=2026-07-31&includeCanceled=true',
      )
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body.data).toMatchObject({
      salesCount: 2,
      itemsCount: 3,
      revenue: '70.00',
    });
  });

  it.each([
    'endDate=2026-07-31',
    'startDate=2026-07-01',
    'startDate=invalid&endDate=2026-07-31',
    'startDate=2026-08-01&endDate=2026-07-31',
    'startDate=2026-07-01&endDate=2026-07-31&includeCanceled=invalid',
    'startDate=2026-07-01&endDate=2026-07-31&unexpected=true',
  ])('rejects invalid query %s', async (query) => {
    const { cookie } = await fixture();
    const response = await request(app.getHttpServer())
      .get(`/api/v1/reports/sales?${query}`)
      .set('Cookie', cookie)
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/reports/sales?startDate=2026-07-01&endDate=2026-07-31')
      .expect(401);
  });
});
