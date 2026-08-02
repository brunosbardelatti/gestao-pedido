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

describe('POST /api/v1/products', () => {
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

  async function createBrand(
    userId: string,
    name = 'Natura',
    active = true,
  ): Promise<{ id: string }> {
    return prisma.brand.create({
      data: {
        name,
        normalizedName: name.normalize('NFKC').trim().toLowerCase(),
        active,
        createdById: userId,
        updatedById: userId,
      },
      select: { id: true },
    });
  }

  async function createCategory(
    userId: string,
    name = 'Perfumaria',
    active = true,
  ): Promise<{ id: string }> {
    return prisma.category.create({
      data: {
        name,
        normalizedName: name.normalize('NFKC').trim().toLowerCase(),
        active,
        createdById: userId,
        updatedById: userId,
      },
      select: { id: true },
    });
  }

  function validPayload(brandId: string, categoryId: string) {
    return {
      brandId,
      categoryId,
      code: '  PERF-001  ',
      description: '  Essencial feminino  ',
      catalogPrice: '149.90',
      purchasePrice: '89',
      originalPrice: '179.9',
    };
  }

  it('creates an active product with optional suggested price and audit', async () => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId);
    const category = await createCategory(userId);

    const response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', cookie)
      .set('x-request-id', 'req-integration-create-product')
      .send(validPayload(brand.id, category.id))
      .expect(201);

    expect(response.body).toEqual({
      data: {
        id: expect.any(String),
        brand: {
          id: brand.id,
          name: 'Natura',
          active: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        category: {
          id: category.id,
          name: 'Perfumaria',
          active: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        code: 'PERF-001',
        description: 'Essencial feminino',
        catalogPrice: '149.90',
        purchasePrice: '89.00',
        originalPrice: '179.90',
        suggestedSalePrice: null,
        active: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    });

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: response.body.data.id },
    });
    expect(product).toMatchObject({
      brandId: brand.id,
      categoryId: category.id,
      code: 'PERF-001',
      normalizedCode: 'perf-001',
      description: 'Essencial feminino',
      suggestedSalePrice: null,
      active: true,
      createdById: userId,
      updatedById: userId,
    });
    expect(
      await prisma.auditLog.findFirst({
        where: { action: 'PRODUCT_CREATED', entityId: product.id },
      }),
    ).toMatchObject({
      actorType: 'USER',
      userId,
      entityType: 'Product',
      requestId: 'req-integration-create-product',
    });
  });

  it('allows the same normalized code in different brands', async () => {
    const { cookie, userId } = await authenticatedActor();
    const natura = await createBrand(userId);
    const avon = await createBrand(userId, 'Avon');
    const category = await createCategory(userId);

    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', cookie)
      .send({
        ...validPayload(natura.id, category.id),
        suggestedSalePrice: null,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', cookie)
      .send({
        ...validPayload(avon.id, category.id),
        code: 'perf-001',
        suggestedSalePrice: '199.90',
      })
      .expect(201);

    expect(await prisma.product.count()).toBe(2);
  });

  it('returns conflict for the same code in the same brand', async () => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId);
    const category = await createCategory(userId);

    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', cookie)
      .send(validPayload(brand.id, category.id))
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', cookie)
      .send({
        ...validPayload(brand.id, category.id),
        code: '  perf-001  ',
      })
      .expect(409);

    expect(response.body.error).toMatchObject({
      code: 'PRODUCT_ALREADY_EXISTS',
      message: 'Já existe um produto com este código para a marca informada.',
    });
    expect(await prisma.product.count()).toBe(1);
    expect(
      await prisma.auditLog.count({ where: { action: 'PRODUCT_CREATED' } }),
    ).toBe(1);
  });

  it('returns not found for an unknown brand', async () => {
    const { cookie, userId } = await authenticatedActor();
    const category = await createCategory(userId);

    const response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', cookie)
      .send(validPayload(randomUUID(), category.id))
      .expect(404);

    expect(response.body.error).toMatchObject({
      code: 'BRAND_NOT_FOUND',
      message: 'Marca não encontrada.',
    });
    expect(await prisma.product.count()).toBe(0);
  });

  it('returns not found for an unknown category', async () => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId);

    const response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', cookie)
      .send(validPayload(brand.id, randomUUID()))
      .expect(404);

    expect(response.body.error).toMatchObject({
      code: 'CATEGORY_NOT_FOUND',
      message: 'Categoria não encontrada.',
    });
    expect(await prisma.product.count()).toBe(0);
  });

  it('rejects an inactive brand for a new product', async () => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId, 'Natura', false);
    const category = await createCategory(userId);

    const response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', cookie)
      .send(validPayload(brand.id, category.id))
      .expect(422);

    expect(response.body.error).toMatchObject({
      code: 'PRODUCT_BRAND_INACTIVE',
      message: 'A marca informada está inativa e não pode receber novos produtos.',
    });
    expect(await prisma.product.count()).toBe(0);
  });

  it('rejects an inactive category for a new product', async () => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId);
    const category = await createCategory(userId, 'Perfumaria', false);

    const response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', cookie)
      .send(validPayload(brand.id, category.id))
      .expect(422);

    expect(response.body.error).toMatchObject({
      code: 'PRODUCT_CATEGORY_INACTIVE',
      message:
        'A categoria informada está inativa e não pode receber novos produtos.',
    });
    expect(await prisma.product.count()).toBe(0);
  });

  it('lists catalog references using the documented paginated contract', async () => {
    const { cookie, userId } = await authenticatedActor();
    await createBrand(userId, 'Avon');
    const brand = await createBrand(userId, 'Natura');
    const category = await createCategory(userId);

    const brandsResponse = await request(app.getHttpServer())
      .get('/api/v1/brands?page=1&pageSize=100&search=Natura')
      .set('Cookie', cookie)
      .expect(200);
    const categoriesResponse = await request(app.getHttpServer())
      .get('/api/v1/categories?page=1&pageSize=100&search=Perfumaria')
      .set('Cookie', cookie)
      .expect(200);

    expect(brandsResponse.body).toMatchObject({
      data: [{ id: brand.id, name: 'Natura', active: true }],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    });
    expect(categoriesResponse.body).toMatchObject({
      data: [{ id: category.id, name: 'Perfumaria', active: true }],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    });
  });

  it.each([
    (brandId: string, categoryId: string) => ({
      ...validPayload(brandId, categoryId),
      description: '   ',
    }),
    (brandId: string, categoryId: string) => ({
      ...validPayload(brandId, categoryId),
      brandId: 'not-a-uuid',
    }),
    (brandId: string, categoryId: string) => ({
      ...validPayload(brandId, categoryId),
      catalogPrice: '10.999',
    }),
    (brandId: string, categoryId: string) => ({
      ...validPayload(brandId, categoryId),
      unexpected: true,
    }),
  ])('rejects invalid input without persistence', async (makePayload) => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId);
    const category = await createCategory(userId);

    const response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', cookie)
      .send(makePayload(brand.id, category.id))
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Dados de entrada inválidos.',
    });
    expect(await prisma.product.count()).toBe(0);
    expect(
      await prisma.auditLog.count({ where: { action: 'PRODUCT_CREATED' } }),
    ).toBe(0);
  });

  it('requires an authenticated session', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .send(validPayload(randomUUID(), randomUUID()))
      .expect(401);

    expect(response.body.error).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Autenticação necessária.',
    });
  });
});
