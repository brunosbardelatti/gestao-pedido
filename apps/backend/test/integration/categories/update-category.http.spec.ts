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

describe('PUT /api/v1/categories/:id', () => {
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

  async function createCategory(
    userId: string,
    name: string,
  ): Promise<{ id: string }> {
    return prisma.category.create({
      data: {
        name,
        normalizedName: name.normalize('NFKC').trim().toLowerCase(),
        createdById: userId,
        updatedById: userId,
      },
      select: { id: true },
    });
  }

  it('updates the category with audit without altering associated products', async () => {
    const { cookie, userId } = await authenticatedActor();
    const category = await createCategory(userId, 'Perfumaria');
    const brand = await prisma.brand.create({
      data: {
        name: 'Natura',
        normalizedName: 'natura',
        createdById: userId,
        updatedById: userId,
      },
    });
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        categoryId: category.id,
        code: 'PROD-001',
        normalizedCode: 'prod-001',
        description: 'Perfume teste',
        catalogPrice: '100.00',
        purchasePrice: '60.00',
        originalPrice: '100.00',
        suggestedSalePrice: '110.00',
        createdById: userId,
        updatedById: userId,
      },
    });

    const response = await request(app.getHttpServer())
      .put(`/api/v1/categories/${category.id}`)
      .set('Cookie', cookie)
      .set('x-request-id', 'req-integration-update-category')
      .send({ name: '  Perfumaria Feminina  ' })
      .expect(200);

    expect(response.body).toEqual({
      data: {
        id: category.id,
        name: 'Perfumaria Feminina',
        active: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    });
    expect(
      await prisma.category.findUniqueOrThrow({ where: { id: category.id } }),
    ).toMatchObject({
      name: 'Perfumaria Feminina',
      normalizedName: 'perfumaria feminina',
      createdById: userId,
      updatedById: userId,
    });
    expect(
      await prisma.product.findUniqueOrThrow({ where: { id: product.id } }),
    ).toMatchObject({ categoryId: category.id });
    expect(
      await prisma.auditLog.findFirst({
        where: { action: 'CATEGORY_UPDATED', entityId: category.id },
      }),
    ).toMatchObject({
      actorType: 'USER',
      userId,
      entityType: 'Category',
      requestId: 'req-integration-update-category',
    });
  });

  it('returns not found without audit for an unknown category', async () => {
    const { cookie } = await authenticatedActor();

    const response = await request(app.getHttpServer())
      .put(`/api/v1/categories/${randomUUID()}`)
      .set('Cookie', cookie)
      .send({ name: 'Perfumaria Feminina' })
      .expect(404);

    expect(response.body.error).toMatchObject({
      code: 'CATEGORY_NOT_FOUND',
      message: 'Categoria não encontrada.',
      requestId: expect.any(String),
    });
    expect(
      await prisma.auditLog.count({ where: { action: 'CATEGORY_UPDATED' } }),
    ).toBe(0);
  });

  it('returns conflict without changing the category or recording audit', async () => {
    const { cookie, userId } = await authenticatedActor();
    await createCategory(userId, 'Perfumaria');
    const category = await createCategory(userId, 'Maquiagem');

    const response = await request(app.getHttpServer())
      .put(`/api/v1/categories/${category.id}`)
      .set('Cookie', cookie)
      .send({ name: '  pErFuMaRiA  ' })
      .expect(409);

    expect(response.body.error).toMatchObject({
      code: 'CATEGORY_ALREADY_EXISTS',
      message: 'Já existe uma categoria com este nome.',
      requestId: expect.any(String),
    });
    expect(
      await prisma.category.findUniqueOrThrow({ where: { id: category.id } }),
    ).toMatchObject({ name: 'Maquiagem', normalizedName: 'maquiagem' });
    expect(
      await prisma.auditLog.count({ where: { action: 'CATEGORY_UPDATED' } }),
    ).toBe(0);
  });

  it('rejects invalid input without changing the category', async () => {
    const { cookie, userId } = await authenticatedActor();
    const category = await createCategory(userId, 'Perfumaria');

    const response = await request(app.getHttpServer())
      .put(`/api/v1/categories/${category.id}`)
      .set('Cookie', cookie)
      .send({ name: '   ', unexpected: true })
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Dados de entrada inválidos.',
    });
    expect(
      await prisma.category.findUniqueOrThrow({ where: { id: category.id } }),
    ).toMatchObject({ name: 'Perfumaria', normalizedName: 'perfumaria' });
  });

  it('rejects an invalid category identifier', async () => {
    const { cookie } = await authenticatedActor();

    await request(app.getHttpServer())
      .put('/api/v1/categories/not-a-uuid')
      .set('Cookie', cookie)
      .send({ name: 'Perfumaria Feminina' })
      .expect(400);
  });

  it('requires an authenticated session', async () => {
    const response = await request(app.getHttpServer())
      .put(`/api/v1/categories/${randomUUID()}`)
      .send({ name: 'Perfumaria Feminina' })
      .expect(401);

    expect(response.body.error).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Autenticação necessária.',
    });
  });
});
