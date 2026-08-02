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

describe('PUT /api/v1/brands/:id', () => {
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
    name: string,
  ): Promise<{ id: string }> {
    return prisma.brand.create({
      data: {
        name,
        normalizedName: name.normalize('NFKC').trim().toLowerCase(),
        createdById: userId,
        updatedById: userId,
      },
      select: { id: true },
    });
  }

  it('updates the brand and records an audit for an authenticated operator', async () => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId, 'Natura');

    const response = await request(app.getHttpServer())
      .put(`/api/v1/brands/${brand.id}`)
      .set('Cookie', cookie)
      .set('x-request-id', 'req-integration-update-brand')
      .send({ name: '  Natura Brasil  ' })
      .expect(200);

    expect(response.body).toEqual({
      data: {
        id: brand.id,
        name: 'Natura Brasil',
        active: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    });
    expect(
      await prisma.brand.findUniqueOrThrow({ where: { id: brand.id } }),
    ).toMatchObject({
      name: 'Natura Brasil',
      normalizedName: 'natura brasil',
      createdById: userId,
      updatedById: userId,
    });
    expect(
      await prisma.auditLog.findFirst({
        where: { action: 'BRAND_UPDATED', entityId: brand.id },
      }),
    ).toMatchObject({
      actorType: 'USER',
      userId,
      entityType: 'Brand',
      requestId: 'req-integration-update-brand',
    });
  });

  it('returns not found without audit for an unknown brand', async () => {
    const { cookie } = await authenticatedActor();

    const response = await request(app.getHttpServer())
      .put(`/api/v1/brands/${randomUUID()}`)
      .set('Cookie', cookie)
      .send({ name: 'Natura Brasil' })
      .expect(404);

    expect(response.body.error).toMatchObject({
      code: 'BRAND_NOT_FOUND',
      message: 'Marca não encontrada.',
      requestId: expect.any(String),
    });
    expect(
      await prisma.auditLog.count({ where: { action: 'BRAND_UPDATED' } }),
    ).toBe(0);
  });

  it('returns conflict without changing the brand or recording audit', async () => {
    const { cookie, userId } = await authenticatedActor();
    await createBrand(userId, 'Natura');
    const brand = await createBrand(userId, 'Avon');

    const response = await request(app.getHttpServer())
      .put(`/api/v1/brands/${brand.id}`)
      .set('Cookie', cookie)
      .send({ name: '  nAtUrA  ' })
      .expect(409);

    expect(response.body.error).toMatchObject({
      code: 'BRAND_ALREADY_EXISTS',
      message: 'Já existe uma marca com este nome.',
      requestId: expect.any(String),
    });
    expect(
      await prisma.brand.findUniqueOrThrow({ where: { id: brand.id } }),
    ).toMatchObject({ name: 'Avon', normalizedName: 'avon' });
    expect(
      await prisma.auditLog.count({ where: { action: 'BRAND_UPDATED' } }),
    ).toBe(0);
  });

  it('rejects invalid input without changing the brand', async () => {
    const { cookie, userId } = await authenticatedActor();
    const brand = await createBrand(userId, 'Natura');

    const response = await request(app.getHttpServer())
      .put(`/api/v1/brands/${brand.id}`)
      .set('Cookie', cookie)
      .send({ name: '   ', unexpected: true })
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Dados de entrada inválidos.',
    });
    expect(
      await prisma.brand.findUniqueOrThrow({ where: { id: brand.id } }),
    ).toMatchObject({ name: 'Natura', normalizedName: 'natura' });
  });

  it('rejects an invalid brand identifier', async () => {
    const { cookie } = await authenticatedActor();

    await request(app.getHttpServer())
      .put('/api/v1/brands/not-a-uuid')
      .set('Cookie', cookie)
      .send({ name: 'Natura Brasil' })
      .expect(400);
  });

  it('requires an authenticated session', async () => {
    const response = await request(app.getHttpServer())
      .put(`/api/v1/brands/${randomUUID()}`)
      .send({ name: 'Natura Brasil' })
      .expect(401);

    expect(response.body.error).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Autenticação necessária.',
    });
  });
});
