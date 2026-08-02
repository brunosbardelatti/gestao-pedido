import { execFileSync } from 'node:child_process';
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

describe('POST /api/v1/categories', () => {
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
    await prisma.category.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await container?.stop();
  });

  async function authenticatedCookie(
    role: UserRole = UserRole.OPERATOR,
  ): Promise<{ cookie: string; userId: string }> {
    const user = await prisma.user.create({
      data: {
        name: 'Ana Silva',
        login: 'ana',
        normalizedLogin: 'ana',
        passwordHash,
        role,
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

  it('creates a category and its audit record for an authenticated operator', async () => {
    const { cookie, userId } = await authenticatedCookie();

    const response = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Cookie', cookie)
      .set('x-request-id', 'req-integration-create-category')
      .send({ name: '  Perfumaria  ' })
      .expect(201);

    expect(response.headers['x-request-id']).toBe(
      'req-integration-create-category',
    );
    expect(response.body).toEqual({
      data: {
        id: expect.any(String),
        name: 'Perfumaria',
        active: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    });

    const category = await prisma.category.findUniqueOrThrow({
      where: { id: response.body.data.id },
    });
    expect(category).toMatchObject({
      name: 'Perfumaria',
      normalizedName: 'perfumaria',
      active: true,
      createdById: userId,
      updatedById: userId,
    });
    expect(
      await prisma.auditLog.findFirst({
        where: { action: 'CATEGORY_CREATED', entityId: category.id },
      }),
    ).toMatchObject({
      actorType: 'USER',
      userId,
      entityType: 'Category',
      requestId: 'req-integration-create-category',
    });
  });

  it('returns conflict for a duplicate name regardless of case', async () => {
    const { cookie } = await authenticatedCookie(UserRole.ADMIN);

    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Cookie', cookie)
      .send({ name: 'Perfumaria' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Cookie', cookie)
      .send({ name: '  pErFuMaRiA  ' })
      .expect(409);

    expect(response.body.error).toMatchObject({
      code: 'CATEGORY_ALREADY_EXISTS',
      message: 'Já existe uma categoria com este nome.',
      requestId: expect.any(String),
    });
    expect(await prisma.category.count()).toBe(1);
    expect(
      await prisma.auditLog.count({ where: { action: 'CATEGORY_CREATED' } }),
    ).toBe(1);
  });

  it.each([
    { name: '   ' },
    { name: 'a'.repeat(101) },
    { name: 'Perfumaria', unexpected: true },
  ])('rejects the invalid payload %j without persistence', async (payload) => {
    const { cookie } = await authenticatedCookie();

    const response = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Cookie', cookie)
      .send(payload)
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Dados de entrada inválidos.',
      requestId: expect.any(String),
    });
    expect(await prisma.category.count()).toBe(0);
    expect(
      await prisma.auditLog.count({ where: { action: 'CATEGORY_CREATED' } }),
    ).toBe(0);
  });

  it('requires an authenticated session', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .send({ name: 'Perfumaria' })
      .expect(401);

    expect(response.body.error).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Autenticação necessária.',
      requestId: expect.any(String),
    });
    expect(await prisma.category.count()).toBe(0);
  });
});
