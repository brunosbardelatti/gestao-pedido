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

describe('GET /api/v1/reports/margins', () => {
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
    const createProduct = (code: string, description: string) =>
      prisma.product.create({
        data: {
          brandId: brand.id,
          categoryId: category.id,
          code,
          normalizedCode: code.toLowerCase(),
          description,
          catalogPrice: '20.00',
          purchasePrice: '99.00',
          originalPrice: '20.00',
          createdById: user.id,
          updatedById: user.id,
        },
      });
    const profitable = await createProduct('P-001', 'Produto rentável');
    const loss = await createProduct('P-002', 'Produto com perda');

    const createSale = (input: {
      productId: string;
      saleDate: string;
      status?: SaleStatus;
      quantity: number;
      unitPrice: string;
      unitCostSnapshot: string;
    }) => {
      const subtotal = (input.quantity * Number(input.unitPrice)).toFixed(2);
      return prisma.sale.create({
        data: {
          status: input.status ?? SaleStatus.COMPLETED,
          saleDate: new Date(input.saleDate),
          total: subtotal,
          createdById: user.id,
          ...(input.status === SaleStatus.CANCELED
            ? {
                canceledAt: new Date(input.saleDate),
                canceledById: user.id,
                cancelReason: 'Teste de margem',
              }
            : {}),
          items: {
            create: {
              productId: input.productId,
              quantity: input.quantity,
              unitPrice: input.unitPrice,
              unitCostSnapshot: input.unitCostSnapshot,
              subtotal,
            },
          },
        },
      });
    };

    await createSale({
      productId: profitable.id,
      saleDate: '2026-07-01T00:00:00.000Z',
      quantity: 2,
      unitPrice: '15.00',
      unitCostSnapshot: '9.00',
    });
    await createSale({
      productId: loss.id,
      saleDate: '2026-07-31T23:59:59.999Z',
      quantity: 1,
      unitPrice: '10.00',
      unitCostSnapshot: '12.00',
    });
    await createSale({
      productId: profitable.id,
      saleDate: '2026-07-15T12:00:00.000Z',
      status: SaleStatus.CANCELED,
      quantity: 5,
      unitPrice: '20.00',
      unitCostSnapshot: '1.00',
    });
    await createSale({
      productId: profitable.id,
      saleDate: '2026-08-01T00:00:00.000Z',
      quantity: 1,
      unitPrice: '50.00',
      unitCostSnapshot: '1.00',
    });
    await prisma.product.update({
      where: { id: profitable.id },
      data: { purchasePrice: '1.00' },
    });

    return {
      cookie: login.headers['set-cookie']?.[0] ?? '',
      profitable,
      loss,
    };
  }

  it('groups completed sale snapshots by product within the inclusive period', async () => {
    const fixtureData = await fixture();
    const response = await request(app.getHttpServer())
      .get(
        '/api/v1/reports/margins?startDate=2026-07-01&endDate=2026-07-31&page=1&pageSize=20',
      )
      .set('Cookie', fixtureData.cookie)
      .expect(200);

    expect(response.body).toEqual({
      data: [
        {
          productId: fixtureData.profitable.id,
          productCode: 'P-001',
          description: 'Produto rentável',
          quantitySold: 2,
          revenue: '30.00',
          cost: '18.00',
          margin: '12.00',
          marginPercent: 40,
        },
        {
          productId: fixtureData.loss.id,
          productCode: 'P-002',
          description: 'Produto com perda',
          quantitySold: 1,
          revenue: '10.00',
          cost: '12.00',
          margin: '-2.00',
          marginPercent: -20,
        },
      ],
      meta: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
    });
  });

  it('filters by product before pagination', async () => {
    const fixtureData = await fixture();
    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/reports/margins?startDate=2026-07-01&endDate=2026-07-31&productId=${fixtureData.loss.id}&page=1&pageSize=1`,
      )
      .set('Cookie', fixtureData.cookie)
      .expect(200);

    expect(response.body.data).toEqual([
      expect.objectContaining({ productId: fixtureData.loss.id }),
    ]);
    expect(response.body.meta).toEqual({
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
  });

  it.each([
    'endDate=2026-07-31',
    'startDate=2026-07-01',
    'startDate=invalid&endDate=2026-07-31',
    'startDate=2026-08-01&endDate=2026-07-31',
    'startDate=2026-07-01&endDate=2026-07-31&page=0',
    'startDate=2026-07-01&endDate=2026-07-31&pageSize=101',
    'startDate=2026-07-01&endDate=2026-07-31&productId=invalid',
    'startDate=2026-07-01&endDate=2026-07-31&unexpected=true',
  ])('rejects invalid query %s', async (query) => {
    const fixtureData = await fixture();
    const response = await request(app.getHttpServer())
      .get(`/api/v1/reports/margins?${query}`)
      .set('Cookie', fixtureData.cookie)
      .expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/reports/margins?startDate=2026-07-01&endDate=2026-07-31')
      .expect(401);
  });
});
