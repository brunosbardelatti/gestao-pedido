import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, type User, UserRole } from '@prisma/client';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import * as argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/configure-app';

describe('POST /api/v1/users/:id/reset-password', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let app: INestApplication;

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
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'pipe',
      },
    );

    prisma = new PrismaClient();
    await prisma.$connect();

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

  async function createUser(input: {
    login: string;
    role: UserRole;
    password?: string;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        name: input.login,
        login: input.login,
        normalizedLogin: input.login.toLowerCase(),
        passwordHash: await argon2.hash(input.password ?? 'current-password', {
          type: argon2.argon2id,
        }),
        role: input.role,
      },
    });
  }

  async function login(login: string, password = 'current-password'): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ login, password })
      .expect(200);

    return response.headers['set-cookie']?.[0] ?? '';
  }

  it('changes the target password and records the administrator audit', async () => {
    const admin = await createUser({ login: 'admin', role: UserRole.ADMIN });
    const operator = await createUser({
      login: 'operator',
      role: UserRole.OPERATOR,
    });
    const cookie = await login(admin.login);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/users/${operator.id}/reset-password`)
      .set('Cookie', cookie)
      .set('x-request-id', 'req-integration-reset-password')
      .send({ newPassword: 'new-secure-password' })
      .expect(204);

    expect(response.text).toBe('');
    const updatedOperator = await prisma.user.findUniqueOrThrow({
      where: { id: operator.id },
    });
    expect(
      await argon2.verify(updatedOperator.passwordHash, 'new-secure-password'),
    ).toBe(true);
    expect(
      await argon2.verify(updatedOperator.passwordHash, 'current-password'),
    ).toBe(false);

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'USER_PASSWORD_RESET' },
    });
    expect(audit).toMatchObject({
      actorType: 'USER',
      userId: admin.id,
      action: 'USER_PASSWORD_RESET',
      entityType: 'User',
      entityId: operator.id,
      requestId: 'req-integration-reset-password',
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ login: operator.login, password: 'current-password' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ login: operator.login, password: 'new-secure-password' })
      .expect(200);
  });

  it('rejects an operator without changing the target password', async () => {
    const operator = await createUser({
      login: 'operator',
      role: UserRole.OPERATOR,
    });
    const target = await createUser({ login: 'target', role: UserRole.ADMIN });
    const cookie = await login(operator.login);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/users/${target.id}/reset-password`)
      .set('Cookie', cookie)
      .send({ newPassword: 'new-secure-password' })
      .expect(403);

    expect(response.body.error).toMatchObject({
      code: 'FORBIDDEN',
      message: 'Acesso negado.',
      requestId: expect.any(String),
    });
    const unchangedTarget = await prisma.user.findUniqueOrThrow({
      where: { id: target.id },
    });
    expect(
      await argon2.verify(unchangedTarget.passwordHash, 'current-password'),
    ).toBe(true);
    expect(
      await prisma.auditLog.count({
        where: { action: 'USER_PASSWORD_RESET' },
      }),
    ).toBe(0);
  });

  it('requires an authenticated session', async () => {
    const target = await createUser({
      login: 'operator',
      role: UserRole.OPERATOR,
    });

    const response = await request(app.getHttpServer())
      .post(`/api/v1/users/${target.id}/reset-password`)
      .send({ newPassword: 'new-secure-password' })
      .expect(401);

    expect(response.body.error).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Autenticação necessária.',
      requestId: expect.any(String),
    });
  });

  it('returns not found for an unknown target user', async () => {
    const admin = await createUser({ login: 'admin', role: UserRole.ADMIN });
    const cookie = await login(admin.login);

    const response = await request(app.getHttpServer())
      .post(
        '/api/v1/users/9d546e0e-5d02-48f5-8157-7f56453fd53a/reset-password',
      )
      .set('Cookie', cookie)
      .send({ newPassword: 'new-secure-password' })
      .expect(404);

    expect(response.body.error).toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
      message: 'Usuário não encontrado.',
    });
  });

  it('rejects an administrator resetting their own password', async () => {
    const admin = await createUser({ login: 'admin', role: UserRole.ADMIN });
    const cookie = await login(admin.login);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/users/${admin.id}/reset-password`)
      .set('Cookie', cookie)
      .send({ newPassword: 'new-secure-password' })
      .expect(422);

    expect(response.body.error).toMatchObject({
      code: 'BUSINESS_RULE_VIOLATION',
      message:
        'A senha do próprio usuário não pode ser redefinida por este fluxo.',
    });
  });

  it('validates the target id and the new password payload', async () => {
    const admin = await createUser({ login: 'admin', role: UserRole.ADMIN });
    const cookie = await login(admin.login);

    await request(app.getHttpServer())
      .post('/api/v1/users/not-a-uuid/reset-password')
      .set('Cookie', cookie)
      .send({ newPassword: 'new-secure-password' })
      .expect(400);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/users/${admin.id}/reset-password`)
      .set('Cookie', cookie)
      .send({ newPassword: 'short', unexpected: true })
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Dados de entrada inválidos.',
      details: expect.any(Array),
    });
  });
});
