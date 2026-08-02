import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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

describe('POST /api/v1/auth/login', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let app: INestApplication;
  let passwordHash: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    process.env.DATABASE_URL = container.getConnectionUri();
    process.env.NODE_ENV = 'test';
    process.env.SESSION_TTL_SECONDS = '28800';

    execFileSync(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      [
        'prisma',
        'migrate',
        'deploy',
        '--schema',
        resolve(process.cwd(), 'prisma/schema.prisma'),
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'pipe',
      },
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
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await container?.stop();
  });

  it('creates a session cookie and audit record for valid credentials', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Ana Silva',
        login: 'Ana',
        normalizedLogin: 'ana',
        passwordHash,
        role: UserRole.ADMIN,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-request-id', 'req-integration-login')
      .send({ login: ' ANA ', password: 'correct-password' })
      .expect(200);

    expect(response.headers['x-request-id']).toBe('req-integration-login');
    expect(response.body).toEqual({
      data: {
        id: user.id,
        name: 'Ana Silva',
        login: 'Ana',
        role: 'ADMIN',
        active: true,
      },
    });
    const sessionCookie = response.headers['set-cookie']?.[0] ?? '';
    expect(sessionCookie).toMatch(
      /^session=.+; Max-Age=28(?:799|800); Path=\/; Expires=.+; HttpOnly; SameSite=Lax$/,
    );
    const plainTextToken = sessionCookie.match(/^session=([^;]+)/)?.[1];
    expect(plainTextToken).toEqual(expect.any(String));

    const session = await prisma.session.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(session.tokenHash).toBe(
      createHash('sha256').update(plainTextToken ?? '').digest('hex'),
    );
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(audit).toMatchObject({
      actorType: 'USER',
      action: 'AUTH_LOGIN',
      entityType: 'User',
      entityId: user.id,
      requestId: 'req-integration-login',
    });
  });

  it('returns the same unauthorized error for a wrong password', async () => {
    await prisma.user.create({
      data: {
        name: 'Ana Silva',
        login: 'ana',
        normalizedLogin: 'ana',
        passwordHash,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ login: 'ana', password: 'wrong-password' })
      .expect(401);

    expect(response.body.error).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'Login ou senha inválidos.',
    });
    expect(response.body.error.requestId).toEqual(expect.any(String));
    expect(await prisma.session.count()).toBe(0);
  });

  it('does not authenticate an inactive user', async () => {
    await prisma.user.create({
      data: {
        name: 'Usuario Inativo',
        login: 'inactive',
        normalizedLogin: 'inactive',
        passwordHash,
        active: false,
      },
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ login: 'inactive', password: 'correct-password' })
      .expect(401);

    expect(await prisma.session.count()).toBe(0);
  });

  it('returns the standard error envelope for an invalid payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ login: '', password: 'short' })
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Dados de entrada inválidos.',
      requestId: expect.any(String),
    });
    expect(response.body.error.details).toEqual(expect.any(Array));
  });

  it('returns the current user for the session cookie', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Ana Silva',
        login: 'ana',
        normalizedLogin: 'ana',
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ login: 'ana', password: 'correct-password' })
      .expect(200);
    const cookie = loginResponse.headers['set-cookie']?.[0] ?? '';

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toEqual({
      data: {
        id: user.id,
        name: user.name,
        login: user.login,
        role: 'ADMIN',
        active: true,
      },
    });
  });

  it('rejects access to the current user without a valid session', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401);

    expect(response.body.error).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Autenticação necessária.',
      requestId: expect.any(String),
    });
  });

});
