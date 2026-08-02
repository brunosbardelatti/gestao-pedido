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

describe('PUT /api/v1/products/:id', () => {
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

  async function createBrand(userId: string, name: string) {
    return prisma.brand.create({
      data: {
        name,
        normalizedName: name.toLowerCase(),
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async function createCategory(userId: string, name: string) {
    return prisma.category.create({
      data: {
        name,
        normalizedName: name.toLowerCase(),
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async function createProduct(
    userId: string,
    brandId: string,
    categoryId: string,
    code = 'PERF-001',
  ) {
    return prisma.product.create({
      data: {
        brandId,
        categoryId,
        code,
        normalizedCode: code.toLowerCase(),
        description: 'Descrição original',
        catalogPrice: '149.90',
        purchasePrice: '89.00',
        originalPrice: '179.90',
        suggestedSalePrice: '169.90',
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  function validPayload(brandId: string, categoryId: string) {
    return {
      brandId,
      categoryId,
      code: '  PERF-002  ',
      description: '  Descrição atualizada  ',
      catalogPrice: '159.9',
      purchasePrice: '99',
      originalPrice: '189.90',
      suggestedSalePrice: null,
    };
  }

  it('updates the product with audit and keeps prior order snapshots unchanged', async () => {
    const { cookie, userId } = await authenticatedActor();
    const oldBrand = await createBrand(userId, 'Natura');
    const newBrand = await createBrand(userId, 'Avon');
    const oldCategory = await createCategory(userId, 'Perfumaria');
    const newCategory = await createCategory(userId, 'Cuidados');
    const product = await createProduct(
      userId,
      oldBrand.id,
      oldCategory.id,
    );
    const order = await prisma.order.create({
      data: {
        brandId: oldBrand.id,
        cycle: '2026-08',
        orderDate: new Date('2026-08-01T00:00:00.000Z'),
        createdById: userId,
        updatedById: userId,
      },
    });
    const orderItem = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product.id,
        quantityOrdered: 2,
        catalogUnitPrice: '149.90',
        purchaseUnitPrice: '89.00',
        originalUnitPrice: '179.90',
      },
    });

    const response = await request(app.getHttpServer())
      .put(`/api/v1/products/${product.id}`)
      .set('Cookie', cookie)
      .set('x-request-id', 'req-integration-update-product')
      .send(validPayload(newBrand.id, newCategory.id))
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: product.id,
      brand: { id: newBrand.id, name: 'Avon' },
      category: { id: newCategory.id, name: 'Cuidados' },
      code: 'PERF-002',
      description: 'Descrição atualizada',
      catalogPrice: '159.90',
      purchasePrice: '99.00',
      originalPrice: '189.90',
      suggestedSalePrice: null,
      active: true,
    });

    expect(
      await prisma.product.findUniqueOrThrow({ where: { id: product.id } }),
    ).toMatchObject({
      brandId: newBrand.id,
      categoryId: newCategory.id,
      normalizedCode: 'perf-002',
      createdById: userId,
      updatedById: userId,
    });
    const snapshot = await prisma.orderItem.findUniqueOrThrow({
      where: { id: orderItem.id },
    });
    expect(snapshot.productId).toBe(product.id);
    expect(snapshot.catalogUnitPrice.toFixed(2)).toBe('149.90');
    expect(snapshot.purchaseUnitPrice.toFixed(2)).toBe('89.00');
    expect(snapshot.originalUnitPrice.toFixed(2)).toBe('179.90');
    expect(
      await prisma.auditLog.findFirst({
        where: { action: 'PRODUCT_UPDATED', entityId: product.id },
      }),
    ).toMatchObject({
      actorType: 'USER',
      userId,
      entityType: 'Product',
      requestId: 'req-integration-update-product',
    });
  });

  it('returns the product by id using the documented contract', async () => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId, 'Natura');
    const category = await createCategory(userId, 'Perfumaria');
    const product = await createProduct(userId, brand.id, category.id);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/products/${product.id}`)
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: product.id,
      brand: { id: brand.id, name: 'Natura' },
      category: { id: category.id, name: 'Perfumaria' },
      code: 'PERF-001',
      description: 'Descrição original',
      suggestedSalePrice: '169.90',
      active: true,
    });
  });

  it('returns conflict without changing either product when brand and code collide', async () => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId, 'Natura');
    const category = await createCategory(userId, 'Perfumaria');
    const product = await createProduct(
      userId,
      brand.id,
      category.id,
      'PERF-001',
    );
    await createProduct(userId, brand.id, category.id, 'PERF-002');

    const response = await request(app.getHttpServer())
      .put(`/api/v1/products/${product.id}`)
      .set('Cookie', cookie)
      .send({
        ...validPayload(brand.id, category.id),
        code: ' perf-002 ',
      })
      .expect(409);

    expect(response.body.error.code).toBe('PRODUCT_ALREADY_EXISTS');
    expect(
      await prisma.product.findUniqueOrThrow({ where: { id: product.id } }),
    ).toMatchObject({ code: 'PERF-001', description: 'Descrição original' });
    expect(
      await prisma.auditLog.count({ where: { action: 'PRODUCT_UPDATED' } }),
    ).toBe(0);
  });

  it('returns not found for an unknown product', async () => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId, 'Natura');
    const category = await createCategory(userId, 'Perfumaria');

    const response = await request(app.getHttpServer())
      .put(`/api/v1/products/${randomUUID()}`)
      .set('Cookie', cookie)
      .send(validPayload(brand.id, category.id))
      .expect(404);

    expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it.each([
    { reference: 'brand', expectedCode: 'BRAND_NOT_FOUND' },
    { reference: 'category', expectedCode: 'CATEGORY_NOT_FOUND' },
  ])('returns not found for an unknown $reference', async ({ reference, expectedCode }) => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId, 'Natura');
    const category = await createCategory(userId, 'Perfumaria');
    const product = await createProduct(userId, brand.id, category.id);
    const payload = validPayload(brand.id, category.id);

    if (reference === 'brand') payload.brandId = randomUUID();
    if (reference === 'category') payload.categoryId = randomUUID();

    const response = await request(app.getHttpServer())
      .put(`/api/v1/products/${product.id}`)
      .set('Cookie', cookie)
      .send(payload)
      .expect(404);

    expect(response.body.error.code).toBe(expectedCode);
    expect(
      await prisma.product.findUniqueOrThrow({ where: { id: product.id } }),
    ).toMatchObject({ code: 'PERF-001', description: 'Descrição original' });
  });

  it.each([
    { description: '   ' },
    { catalogPrice: '10.999' },
    { unexpected: true },
  ])('rejects invalid payload %j without a partial update', async (invalid) => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId, 'Natura');
    const category = await createCategory(userId, 'Perfumaria');
    const product = await createProduct(userId, brand.id, category.id);

    const response = await request(app.getHttpServer())
      .put(`/api/v1/products/${product.id}`)
      .set('Cookie', cookie)
      .send({ ...validPayload(brand.id, category.id), ...invalid })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(
      await prisma.product.findUniqueOrThrow({ where: { id: product.id } }),
    ).toMatchObject({ code: 'PERF-001', description: 'Descrição original' });
  });

  it('rejects an invalid product id', async () => {
    const { cookie } = await authenticatedActor();

    const response = await request(app.getHttpServer())
      .put('/api/v1/products/not-a-uuid')
      .set('Cookie', cookie)
      .send(validPayload(randomUUID(), randomUUID()))
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/products/${randomUUID()}`)
      .send(validPayload(randomUUID(), randomUUID()))
      .expect(401);
  });
});
