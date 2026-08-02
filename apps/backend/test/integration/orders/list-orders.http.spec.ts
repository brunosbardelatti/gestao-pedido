import { execFileSync } from 'node:child_process';
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

describe('GET /api/v1/orders', () => {
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
    const category = await prisma.category.create({
      data: {
        name: 'Perfumaria',
        normalizedName: 'perfumaria',
        createdById: userId,
        updatedById: userId,
      },
    });
    const natura = await prisma.brand.create({
      data: {
        name: 'Natura',
        normalizedName: 'natura',
        createdById: userId,
        updatedById: userId,
      },
    });
    const avon = await prisma.brand.create({
      data: {
        name: 'Avon',
        normalizedName: 'avon',
        createdById: userId,
        updatedById: userId,
      },
    });
    const naturaProduct = await prisma.product.create({
      data: {
        brandId: natura.id,
        categoryId: category.id,
        code: 'NAT-001',
        normalizedCode: 'nat-001',
        description: 'Essencial',
        catalogPrice: '100.00',
        purchasePrice: '60.00',
        originalPrice: '120.00',
        createdById: userId,
        updatedById: userId,
      },
    });
    const avonProduct = await prisma.product.create({
      data: {
        brandId: avon.id,
        categoryId: category.id,
        code: 'AVO-001',
        normalizedCode: 'avo-001',
        description: 'Far Away',
        catalogPrice: '90.00',
        purchasePrice: '50.00',
        originalPrice: '110.00',
        createdById: userId,
        updatedById: userId,
      },
    });

    return { natura, avon, naturaProduct, avonProduct };
  }

  async function createOrder(input: {
    userId: string;
    brandId: string;
    productId: string;
    cycle: string;
    orderDate: string;
    status?: OrderStatus;
    createdAt: string;
  }) {
    return prisma.order.create({
      data: {
        brandId: input.brandId,
        cycle: input.cycle,
        orderDate: new Date(`${input.orderDate}T00:00:00.000Z`),
        status: input.status ?? OrderStatus.OPEN,
        ...(input.status === OrderStatus.RECEIVED
          ? {
              receivedAt: new Date(input.createdAt),
              receivedById: input.userId,
            }
          : {}),
        ...(input.status === OrderStatus.CANCELED
          ? {
              canceledAt: new Date(input.createdAt),
              canceledById: input.userId,
              cancelReason: 'Pedido duplicado',
            }
          : {}),
        createdAt: new Date(input.createdAt),
        createdById: input.userId,
        updatedById: input.userId,
        items: {
          create: {
            productId: input.productId,
            quantityOrdered: 2,
            quantityReceived:
              input.status === OrderStatus.RECEIVED ? 2 : 0,
            catalogUnitPrice: '100.00',
            purchaseUnitPrice: '60.00',
            originalUnitPrice: '120.00',
          },
        },
      },
    });
  }

  it('returns complete orders with pagination, status and newest order date first', async () => {
    const { cookie, userId } = await authenticatedActor();
    const refs = await createReferences(userId);
    const older = await createOrder({
      userId,
      brandId: refs.natura.id,
      productId: refs.naturaProduct.id,
      cycle: 'Ciclo 08',
      orderDate: '2026-07-10',
      createdAt: '2026-07-10T12:00:00.000Z',
    });
    const newer = await createOrder({
      userId,
      brandId: refs.avon.id,
      productId: refs.avonProduct.id,
      cycle: 'Ciclo 09',
      orderDate: '2026-07-20',
      status: OrderStatus.RECEIVED,
      createdAt: '2026-07-20T12:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/orders?page=1&pageSize=2')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toMatchObject({
      data: [
        {
          id: newer.id,
          brand: { id: refs.avon.id, name: 'Avon' },
          cycle: 'Ciclo 09',
          orderDate: '2026-07-20',
          status: 'RECEIVED',
          items: [
            {
              productId: refs.avonProduct.id,
              productCode: 'AVO-001',
              quantityOrdered: 2,
              quantityReceived: 2,
              purchaseUnitPrice: '60.00',
            },
          ],
        },
        { id: older.id, status: 'OPEN' },
      ],
      meta: { page: 1, pageSize: 2, total: 2, totalPages: 1 },
    });
  });

  it('combines status, brand, normalized cycle and inclusive date filters', async () => {
    const { cookie, userId } = await authenticatedActor();
    const refs = await createReferences(userId);
    const expected = await createOrder({
      userId,
      brandId: refs.natura.id,
      productId: refs.naturaProduct.id,
      cycle: 'Ciclo 10',
      orderDate: '2026-07-15',
      status: OrderStatus.CANCELED,
      createdAt: '2026-07-15T12:00:00.000Z',
    });
    await createOrder({
      userId,
      brandId: refs.natura.id,
      productId: refs.naturaProduct.id,
      cycle: 'Ciclo 11',
      orderDate: '2026-07-15',
      status: OrderStatus.CANCELED,
      createdAt: '2026-07-15T13:00:00.000Z',
    });
    await createOrder({
      userId,
      brandId: refs.avon.id,
      productId: refs.avonProduct.id,
      cycle: 'Ciclo 10',
      orderDate: '2026-07-15',
      status: OrderStatus.CANCELED,
      createdAt: '2026-07-15T14:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/orders?status=CANCELED&brandId=${refs.natura.id}&cycle=%20Ciclo%2010%20&startDate=2026-07-15&endDate=2026-07-15`,
      )
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: expected.id,
      status: 'CANCELED',
    });
    expect(response.body.meta.total).toBe(1);
  });

  it.each([
    'page=0',
    'pageSize=101',
    'status=INVALID',
    'brandId=invalid',
    'cycle=',
    `cycle=${'a'.repeat(81)}`,
    'startDate=2026-02-30',
    'endDate=02-08-2026',
    'unexpected=true',
  ])('rejects invalid query %s', async (query) => {
    const { cookie } = await authenticatedActor();

    const response = await request(app.getHttpServer())
      .get(`/api/v1/orders?${query}`)
      .set('Cookie', cookie)
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/orders').expect(401);
  });
});
