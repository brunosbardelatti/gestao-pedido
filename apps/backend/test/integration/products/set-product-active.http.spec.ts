import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  InventoryMovementType,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import * as argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/configure-app';

describe('PATCH /api/v1/products/:id/active', () => {
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

  async function authenticatedActor(): Promise<{
    cookie: string;
    userId: string;
  }> {
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

  async function createProduct(userId: string, active = true) {
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

    return prisma.product.create({
      data: {
        brandId: brand.id,
        categoryId: category.id,
        code: 'PERF-001',
        normalizedCode: 'perf-001',
        description: 'Essencial feminino',
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

  it('deactivates without deleting the product or its stock history', async () => {
    const { cookie, userId } = await authenticatedActor();
    const product = await createProduct(userId);
    const movement = await prisma.inventoryMovement.create({
      data: {
        productId: product.id,
        type: InventoryMovementType.CORRECTION,
        quantityDelta: 5,
        reason: 'Saldo inicial',
        createdById: userId,
      },
    });

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/products/${product.id}/active`)
      .set('Cookie', cookie)
      .set('x-request-id', 'req-integration-deactivate-product')
      .send({ active: false })
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: product.id,
      code: 'PERF-001',
      active: false,
      brand: { name: 'Natura' },
      category: { name: 'Perfumaria' },
    });
    expect(
      await prisma.product.findUniqueOrThrow({ where: { id: product.id } }),
    ).toMatchObject({ active: false, updatedById: userId });
    expect(
      await prisma.inventoryMovement.findUnique({ where: { id: movement.id } }),
    ).not.toBeNull();
    expect(
      await prisma.auditLog.findFirst({
        where: { action: 'PRODUCT_DEACTIVATED', entityId: product.id },
      }),
    ).toMatchObject({
      actorType: 'USER',
      userId,
      entityType: 'Product',
      requestId: 'req-integration-deactivate-product',
    });
  });

  it('reactivates an inactive product according to the HTTP contract', async () => {
    const { cookie, userId } = await authenticatedActor();
    const product = await createProduct(userId, false);

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/products/${product.id}/active`)
      .set('Cookie', cookie)
      .send({ active: true })
      .expect(200);

    expect(response.body.data).toMatchObject({ id: product.id, active: true });
    expect(
      await prisma.auditLog.findFirst({
        where: { action: 'PRODUCT_ACTIVATED', entityId: product.id },
      }),
    ).not.toBeNull();
  });

  it('returns not found without audit for an unknown product', async () => {
    const { cookie } = await authenticatedActor();

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/products/${randomUUID()}/active`)
      .set('Cookie', cookie)
      .send({ active: false })
      .expect(404);

    expect(response.body.error).toMatchObject({
      code: 'PRODUCT_NOT_FOUND',
      message: 'Produto não encontrado.',
    });
    expect(
      await prisma.auditLog.count({
        where: {
          action: { in: ['PRODUCT_ACTIVATED', 'PRODUCT_DEACTIVATED'] },
        },
      }),
    ).toBe(0);
  });

  it.each([
    {},
    { active: 'false' },
    { active: false, unexpected: true },
  ])('rejects invalid payload %j without changing the product', async (payload) => {
    const { cookie, userId } = await authenticatedActor();
    const product = await createProduct(userId);

    await request(app.getHttpServer())
      .patch(`/api/v1/products/${product.id}/active`)
      .set('Cookie', cookie)
      .send(payload)
      .expect(400);

    expect(
      await prisma.product.findUniqueOrThrow({ where: { id: product.id } }),
    ).toMatchObject({ active: true });
  });

  it('rejects an invalid product identifier', async () => {
    const { cookie } = await authenticatedActor();

    await request(app.getHttpServer())
      .patch('/api/v1/products/not-a-uuid/active')
      .set('Cookie', cookie)
      .send({ active: false })
      .expect(400);
  });

  it('requires an authenticated session', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/products/${randomUUID()}/active`)
      .send({ active: false })
      .expect(401);

    expect(response.body.error).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Autenticação necessária.',
    });
  });
});
