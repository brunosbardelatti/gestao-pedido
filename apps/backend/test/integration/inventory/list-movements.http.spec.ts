import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import { type INestApplication } from '@nestjs/common';
import {
  InventoryMovementType,
  PrismaClient,
  UserRole,
} from '@prisma/client';
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

describe('GET /api/v1/inventory/movements', () => {
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
      user,
    };
  }

  async function createProducts(userId: string) {
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
    const createProduct = (code: string, description: string) =>
      prisma.product.create({
        data: {
          brandId: brand.id,
          categoryId: category.id,
          code,
          normalizedCode: code.toLowerCase(),
          description,
          catalogPrice: '100.00',
          purchasePrice: '60.00',
          originalPrice: '120.00',
          createdById: userId,
          updatedById: userId,
        },
      });

    return {
      first: await createProduct('PERF-001', 'Essencial'),
      second: await createProduct('PERF-002', 'Kaiak'),
    };
  }

  async function createOrderItem(
    userId: string,
    product: { id: string; brandId: string },
  ) {
    const order = await prisma.order.create({
      data: {
        brandId: product.brandId,
        cycle: 'Ciclo de origem',
        orderDate: new Date('2026-07-01T00:00:00.000Z'),
        createdById: userId,
        updatedById: userId,
        items: {
          create: {
            productId: product.id,
            quantityOrdered: 10,
            quantityReceived: 10,
            catalogUnitPrice: '100.00',
            purchaseUnitPrice: '60.00',
            originalUnitPrice: '120.00',
          },
        },
      },
      include: { items: true },
    });

    return order.items[0];
  }

  it('returns newest movements with origin, user and pagination', async () => {
    const { cookie, user } = await authenticatedActor();
    const products = await createProducts(user.id);
    const orderItem = await createOrderItem(user.id, products.first);
    const older = await prisma.inventoryMovement.create({
      data: {
        productId: products.first.id,
        orderItemId: orderItem.id,
        type: InventoryMovementType.PURCHASE,
        quantityDelta: 5,
        reason: null,
        createdById: user.id,
        createdAt: new Date('2026-07-10T12:00:00.000Z'),
      },
    });
    const newer = await prisma.inventoryMovement.create({
      data: {
        productId: products.second.id,
        type: InventoryMovementType.CORRECTION,
        quantityDelta: -2,
        reason: 'Avaria identificada',
        createdById: user.id,
        createdAt: new Date('2026-07-20T12:00:00.000Z'),
      },
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/inventory/movements?page=1&pageSize=2')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toEqual({
      data: [
        {
          id: newer.id,
          productId: products.second.id,
          type: 'CORRECTION',
          quantityDelta: -2,
          reason: 'Avaria identificada',
          orderItemId: null,
          saleItemId: null,
          createdBy: {
            id: user.id,
            name: 'Ana Silva',
            login: 'ana',
            role: 'OPERATOR',
            active: true,
          },
          createdAt: '2026-07-20T12:00:00.000Z',
        },
        expect.objectContaining({
          id: older.id,
          type: 'PURCHASE',
          orderItemId: orderItem.id,
        }),
      ],
      meta: { page: 1, pageSize: 2, total: 2, totalPages: 1 },
    });
  });

  it('combines product, type and inclusive period filters without mutating history', async () => {
    const { cookie, user } = await authenticatedActor();
    const products = await createProducts(user.id);
    const orderItem = await createOrderItem(user.id, products.first);
    const expected = await prisma.inventoryMovement.create({
      data: {
        productId: products.first.id,
        orderItemId: orderItem.id,
        type: InventoryMovementType.PURCHASE,
        quantityDelta: 7,
        createdById: user.id,
        createdAt: new Date('2026-07-15T23:30:00.000Z'),
      },
    });
    await prisma.inventoryMovement.create({
      data: {
        productId: products.first.id,
        type: InventoryMovementType.CORRECTION,
        quantityDelta: -1,
        reason: 'Correção',
        createdById: user.id,
        createdAt: new Date('2026-07-15T12:00:00.000Z'),
      },
    });

    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/inventory/movements?productId=${products.first.id}&type=PURCHASE&startDate=2026-07-15&endDate=2026-07-15`,
      )
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body.data).toEqual([
      expect.objectContaining({ id: expected.id, quantityDelta: 7 }),
    ]);
    expect(response.body.meta.total).toBe(1);
    expect(await prisma.inventoryMovement.count()).toBe(2);
  });

  it.each([
    'page=0',
    'pageSize=101',
    'productId=invalid',
    'type=INVALID',
    'startDate=2026-02-30',
    'endDate=02-08-2026',
    'unexpected=true',
  ])('rejects invalid query %s', async (query) => {
    const { cookie } = await authenticatedActor();

    const response = await request(app.getHttpServer())
      .get(`/api/v1/inventory/movements?${query}`)
      .set('Cookie', cookie)
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/inventory/movements')
      .expect(401);
  });
});
