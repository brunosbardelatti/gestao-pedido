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

describe('POST /api/v1/customers', () => {
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
    await prisma.customer.deleteMany();
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

  it('creates a normalized customer and its audit record', async () => {
    const { cookie, userId } = await authenticatedCookie();

    const response = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Cookie', cookie)
      .set('x-request-id', 'req-integration-create-customer')
      .send({
        name: '  Maria da Silva  ',
        cpf: '12345678901',
        phone: ' 11999998888 ',
        addressLine: ' Rua das Flores, 10 ',
        city: ' Sao Paulo ',
        state: ' sp ',
        postalCode: '01001000',
      })
      .expect(201);

    expect(response.body).toEqual({
      data: {
        id: expect.any(String),
        name: 'Maria da Silva',
        cpf: '12345678901',
        phone: '11999998888',
        addressLine: 'Rua das Flores, 10',
        city: 'Sao Paulo',
        state: 'SP',
        postalCode: '01001000',
        active: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    });

    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: response.body.data.id },
    });
    expect(customer).toMatchObject({
      createdById: userId,
      updatedById: userId,
    });
    expect(
      await prisma.auditLog.findFirst({
        where: { action: 'CUSTOMER_CREATED', entityId: customer.id },
      }),
    ).toMatchObject({
      actorType: 'USER',
      userId,
      entityType: 'Customer',
      requestId: 'req-integration-create-customer',
    });
  });

  it('accepts only the required name and persists optional fields as null', async () => {
    const { cookie } = await authenticatedCookie();

    const response = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Cookie', cookie)
      .send({ name: 'Cliente sem contato' })
      .expect(201);

    expect(response.body.data).toMatchObject({
      name: 'Cliente sem contato',
      cpf: null,
      phone: null,
      addressLine: null,
      city: null,
      state: null,
      postalCode: null,
      active: true,
    });
  });

  it('returns conflict for a duplicate CPF', async () => {
    const { cookie } = await authenticatedCookie(UserRole.ADMIN);

    await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Cookie', cookie)
      .send({ name: 'Maria', cpf: '12345678901' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Cookie', cookie)
      .send({ name: 'Outra Maria', cpf: '12345678901' })
      .expect(409);

    expect(response.body.error).toMatchObject({
      code: 'CUSTOMER_CPF_ALREADY_EXISTS',
      message: 'Já existe um cliente com este CPF.',
      requestId: expect.any(String),
    });
    expect(await prisma.customer.count()).toBe(1);
  });

  it.each([
    { name: '   ' },
    { name: 'a'.repeat(151) },
    { name: 'Maria', cpf: '123' },
    { name: 'Maria', state: 'S' },
    { name: 'Maria', postalCode: '01001-000' },
    { name: 'Maria', unexpected: true },
  ])('rejects invalid payload %j without persistence', async (payload) => {
    const { cookie } = await authenticatedCookie();

    const response = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Cookie', cookie)
      .send(payload)
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Dados de entrada inválidos.',
      requestId: expect.any(String),
    });
    expect(await prisma.customer.count()).toBe(0);
  });

  it('requires an authenticated session', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .send({ name: 'Maria' })
      .expect(401);

    expect(response.body.error).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Autenticação necessária.',
      requestId: expect.any(String),
    });
    expect(await prisma.customer.count()).toBe(0);
  });
});
