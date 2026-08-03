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

describe('API Keys endpoints', () => {
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
    await prisma.apiKey.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await container?.stop();
  });

  async function loginAsAdmin() {
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
    return loginResponse.headers['set-cookie']?.[0] ?? '';
  }

  it('creates an API key and returns the plain text key only once', async () => {
    const cookie = await loginAsAdmin();
    const response = await request(app.getHttpServer())
      .post('/api/v1/integrations/api-keys')
      .set('Cookie', cookie)
      .send({ name: 'ERP Integration' })
      .expect(201);

    expect(response.body.data).toMatchObject({
      name: 'ERP Integration',
      scopes: [],
      expiresAt: null,
    });
    expect(response.body.data.plainTextKey).toBeDefined();
    expect(response.body.data.keyPrefix).toBeDefined();
    expect(response.body.data.id).toBeDefined();

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'API_KEY_CREATED' },
    });
    expect(audit).toBeTruthy();
  });

  it('creates an API key with scopes and expiration', async () => {
    const cookie = await loginAsAdmin();
    const response = await request(app.getHttpServer())
      .post('/api/v1/integrations/api-keys')
      .set('Cookie', cookie)
      .send({
        name: 'Scoped Key',
        scopes: ['orders:read', 'products:read'],
        expiresAt: '2027-12-31T23:59:59.000Z',
      })
      .expect(201);

    expect(response.body.data.scopes).toEqual([
      'orders:read',
      'products:read',
    ]);
    expect(response.body.data.expiresAt).toBe('2027-12-31T23:59:59.000Z');
  });

  it('lists API keys without exposing key hashes', async () => {
    const cookie = await loginAsAdmin();
    await request(app.getHttpServer())
      .post('/api/v1/integrations/api-keys')
      .set('Cookie', cookie)
      .send({ name: 'Key A' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/integrations/api-keys')
      .set('Cookie', cookie)
      .send({ name: 'Key B' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/v1/integrations/api-keys')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
    });
    for (const key of response.body.data) {
      expect(key.keyPrefix).toBeDefined();
      expect(key).not.toHaveProperty('keyHash');
      expect(key).not.toHaveProperty('plainTextKey');
    }
  });

  it('revokes an API key and records audit', async () => {
    const cookie = await loginAsAdmin();
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/integrations/api-keys')
      .set('Cookie', cookie)
      .send({ name: 'To Revoke' })
      .expect(201);

    const keyId = createResponse.body.data.id;

    await request(app.getHttpServer())
      .delete(`/api/v1/integrations/api-keys/${keyId}`)
      .set('Cookie', cookie)
      .expect(204);

    const dbKey = await prisma.apiKey.findUnique({ where: { id: keyId } });
    expect(dbKey?.status).toBe('REVOKED');
    expect(dbKey?.revokedAt).toBeTruthy();

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'API_KEY_REVOKED', entityId: keyId },
    });
    expect(audit).toBeTruthy();
  });

  it('returns conflict when revoking an already revoked key', async () => {
    const cookie = await loginAsAdmin();
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/integrations/api-keys')
      .set('Cookie', cookie)
      .send({ name: 'Double Revoke' })
      .expect(201);

    const keyId = createResponse.body.data.id;

    await request(app.getHttpServer())
      .delete(`/api/v1/integrations/api-keys/${keyId}`)
      .set('Cookie', cookie)
      .expect(204);

    const response = await request(app.getHttpServer())
      .delete(`/api/v1/integrations/api-keys/${keyId}`)
      .set('Cookie', cookie)
      .expect(409);

    expect(response.body.error.code).toBe('API_KEY_ALREADY_REVOKED');
  });

  it('returns not found for an unknown API key', async () => {
    const cookie = await loginAsAdmin();

    const response = await request(app.getHttpServer())
      .delete('/api/v1/integrations/api-keys/00000000-0000-0000-0000-000000000000')
      .set('Cookie', cookie)
      .expect(404);

    expect(response.body.error.code).toBe('API_KEY_NOT_FOUND');
  });

  it('rejects invalid input without persisting', async () => {
    const cookie = await loginAsAdmin();

    await request(app.getHttpServer())
      .post('/api/v1/integrations/api-keys')
      .set('Cookie', cookie)
      .send({ name: '' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/integrations/api-keys')
      .set('Cookie', cookie)
      .send({ name: 'Valid', unexpected: true })
      .expect(400);

    const count = await prisma.apiKey.count();
    expect(count).toBe(0);
  });

  it('requires authentication for all endpoints', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/integrations/api-keys')
      .send({ name: 'No Auth' })
      .expect(401);

    await request(app.getHttpServer())
      .get('/api/v1/integrations/api-keys')
      .expect(401);

    await request(app.getHttpServer())
      .delete('/api/v1/integrations/api-keys/00000000-0000-0000-0000-000000000000')
      .expect(401);
  });
});
