import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import { type INestApplication } from '@nestjs/common';
import { OrderStatus, PrismaClient, UserRole } from '@prisma/client';
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

function utcDate(offset: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

describe('GET /api/v1/reports/expirations', () => {
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
    const createProduct = (code: string) =>
      prisma.product.create({
        data: {
          brandId: brand.id,
          categoryId: category.id,
          code,
          normalizedCode: code.toLowerCase(),
          description: `Produto ${code}`,
          catalogPrice: '20.00',
          purchasePrice: '8.00',
          originalPrice: '20.00',
          createdById: user.id,
          updatedById: user.id,
        },
      });
    const products = await Promise.all([
      createProduct('P-002'),
      createProduct('P-007'),
      createProduct('P-008'),
      createProduct('P-OPEN'),
      createProduct('P-ZERO'),
    ]);
    const createOrderItem = async (input: {
      productId: string;
      status: OrderStatus;
      expirationDate: string;
      quantityReceived: number;
    }) => {
      const order = await prisma.order.create({
        data: {
          brandId: brand.id,
          cycle: `Ciclo ${input.productId}`,
          orderDate: new Date(`${utcDate(-10)}T00:00:00.000Z`),
          status: input.status,
          createdById: user.id,
          updatedById: user.id,
          ...(input.status === OrderStatus.RECEIVED
            ? { receivedAt: new Date(), receivedById: user.id }
            : {}),
        },
      });
      return prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: input.productId,
          quantityOrdered: Math.max(input.quantityReceived, 1),
          quantityReceived: input.quantityReceived,
          catalogUnitPrice: '20.00',
          purchaseUnitPrice: '8.00',
          originalUnitPrice: '20.00',
          expirationDate: new Date(`${input.expirationDate}T00:00:00.000Z`),
        },
      });
    };
    const near = await createOrderItem({
      productId: products[0].id,
      status: OrderStatus.RECEIVED,
      expirationDate: utcDate(2),
      quantityReceived: 3,
    });
    const boundary = await createOrderItem({
      productId: products[1].id,
      status: OrderStatus.RECEIVED,
      expirationDate: utcDate(7),
      quantityReceived: 1,
    });
    await createOrderItem({
      productId: products[2].id,
      status: OrderStatus.RECEIVED,
      expirationDate: utcDate(8),
      quantityReceived: 1,
    });
    await createOrderItem({
      productId: products[3].id,
      status: OrderStatus.OPEN,
      expirationDate: utcDate(1),
      quantityReceived: 1,
    });
    await createOrderItem({
      productId: products[4].id,
      status: OrderStatus.RECEIVED,
      expirationDate: utcDate(3),
      quantityReceived: 0,
    });

    return {
      cookie: login.headers['set-cookie']?.[0] ?? '',
      boundary,
      near,
      products,
    };
  }

  it('lists received items in the default seven-day window by nearest expiration', async () => {
    const fixtureData = await fixture();
    const response = await request(app.getHttpServer())
      .get('/api/v1/reports/expirations?page=1&pageSize=20')
      .set('Cookie', fixtureData.cookie)
      .expect(200);

    expect(response.body).toEqual({
      data: [
        {
          orderItemId: fixtureData.near.id,
          productId: fixtureData.products[0].id,
          productCode: 'P-002',
          description: 'Produto P-002',
          expirationDate: utcDate(2),
          quantityReceived: 3,
          daysUntilExpiration: 2,
          note: 'Indicativo: o MVP não controla consumo de estoque por lote.',
        },
        expect.objectContaining({
          orderItemId: fixtureData.boundary.id,
          expirationDate: utcDate(7),
          daysUntilExpiration: 7,
        }),
      ],
      meta: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
    });
  });

  it('honors an explicit inclusive interval and pagination', async () => {
    const fixtureData = await fixture();
    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/reports/expirations?fromDate=${utcDate(7)}&toDate=${utcDate(8)}&page=1&pageSize=1`,
      )
      .set('Cookie', fixtureData.cookie)
      .expect(200);

    expect(response.body.data).toEqual([
      expect.objectContaining({ orderItemId: fixtureData.boundary.id }),
    ]);
    expect(response.body.meta).toEqual({
      page: 1,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
  });

  it.each([
    'page=0',
    'pageSize=101',
    'withinDays=0',
    'withinDays=invalid',
    'fromDate=invalid',
    `fromDate=${utcDate(5)}&toDate=${utcDate(2)}`,
    'unexpected=true',
  ])('rejects invalid query %s', async (query) => {
    const fixtureData = await fixture();
    const response = await request(app.getHttpServer())
      .get(`/api/v1/reports/expirations?${query}`)
      .set('Cookie', fixtureData.cookie)
      .expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/reports/expirations').expect(401);
  });
});
