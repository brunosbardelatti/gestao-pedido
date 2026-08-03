import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import { type INestApplication } from '@nestjs/common';
import { PrismaClient, UserRole } from '@prisma/client';
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

describe('X-API-Key authentication', () => {
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
    await prisma.apiKey.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await container?.stop();
  });

  async function createApiKey(): Promise<{ cookie: string; plainTextKey: string }> {
    await prisma.user.create({
      data: {
        name: 'Admin',
        login: 'admin',
        normalizedLogin: 'admin',
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ login: 'admin', password: 'correct-password' })
      .expect(200);
    const cookie = loginResponse.headers['set-cookie']?.[0] ?? '';

    const keyResponse = await request(app.getHttpServer())
      .post('/api/v1/integrations/api-keys')
      .set('Cookie', cookie)
      .send({ name: 'Test Integration' })
      .expect(201);

    return { cookie, plainTextKey: keyResponse.body.data.plainTextKey };
  }

  it('authenticates a request using X-API-Key header', async () => {
    const { plainTextKey } = await createApiKey();

    const response = await request(app.getHttpServer())
      .get('/api/v1/brands?page=1&pageSize=20')
      .set('X-API-Key', plainTextKey)
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('meta');
  });

  it('updates lastUsedAt on the API key after authentication', async () => {
    const { plainTextKey } = await createApiKey();
    const keyBefore = await prisma.apiKey.findFirst();
    expect(keyBefore?.lastUsedAt).toBeNull();

    await request(app.getHttpServer())
      .get('/api/v1/brands?page=1&pageSize=20')
      .set('X-API-Key', plainTextKey)
      .expect(200);

    const keyAfter = await prisma.apiKey.findFirst();
    expect(keyAfter?.lastUsedAt).toBeTruthy();
  });

  it('rejects a revoked API key', async () => {
    const { cookie, plainTextKey } = await createApiKey();
    const apiKey = await prisma.apiKey.findFirst();

    await request(app.getHttpServer())
      .delete(`/api/v1/integrations/api-keys/${apiKey!.id}`)
      .set('Cookie', cookie)
      .expect(204);

    await request(app.getHttpServer())
      .get('/api/v1/brands?page=1&pageSize=20')
      .set('X-API-Key', plainTextKey)
      .expect(401);
  });

  it('rejects an invalid API key', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/brands?page=1&pageSize=20')
      .set('X-API-Key', 'completely-invalid-key')
      .expect(401);
  });

  it('rejects an expired API key', async () => {
    const { cookie } = await createApiKey();
    const expiredKeyResponse = await request(app.getHttpServer())
      .post('/api/v1/integrations/api-keys')
      .set('Cookie', cookie)
      .send({ name: 'Expired Key', expiresAt: '2020-01-01T00:00:00.000Z' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/brands?page=1&pageSize=20')
      .set('X-API-Key', expiredKeyResponse.body.data.plainTextKey)
      .expect(401);
  });

  it('prefers cookie auth when both are present', async () => {
    const { cookie, plainTextKey } = await createApiKey();

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie)
      .set('X-API-Key', plainTextKey)
      .expect(200);

    expect(response.body.data.login).toBe('admin');
    expect(response.body.data.id).not.toContain('api-key:');
  });
});
