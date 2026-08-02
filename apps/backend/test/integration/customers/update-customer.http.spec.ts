import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import { type INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
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

describe('PUT /api/v1/customers/:id', () => {
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
      ['prisma', 'migrate', 'deploy', '--schema', resolve(process.cwd(), 'prisma/schema.prisma')],
      { cwd: process.cwd(), env: process.env, stdio: 'pipe' },
    );
    prisma = new PrismaClient();
    await prisma.$connect();
    passwordHash = await argon2.hash('correct-password', {
      type: argon2.argon2id,
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await container?.stop();
  });

  async function fixture() {
    const user = await prisma.user.create({
      data: {
        name: 'Ana Silva',
        login: 'ana',
        normalizedLogin: 'ana',
        passwordHash,
        role: 'OPERATOR',
      },
    });
    const customer = await prisma.customer.create({
      data: {
        name: 'Maria Original',
        cpf: '12345678901',
        createdById: user.id,
        updatedById: user.id,
      },
    });
    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        total: '10.00',
        createdById: user.id,
      },
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ login: 'ana', password: 'correct-password' })
      .expect(200);
    return {
      user,
      customer,
      sale,
      cookie: login.headers['set-cookie']?.[0] ?? '',
    };
  }

  it('loads and updates a customer while preserving the historical sale link', async () => {
    const { cookie, customer, sale, user } = await fixture();

    const getResponse = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customer.id}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(getResponse.body.data).toMatchObject({
      id: customer.id,
      name: 'Maria Original',
      cpf: '12345678901',
    });

    const response = await request(app.getHttpServer())
      .put(`/api/v1/customers/${customer.id}`)
      .set('Cookie', cookie)
      .set('x-request-id', 'req-update-customer')
      .send({
        name: ' Maria Atualizada ',
        cpf: null,
        phone: ' 11988887777 ',
        addressLine: null,
        city: ' Campinas ',
        state: 'sp',
        postalCode: null,
      })
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: customer.id,
      name: 'Maria Atualizada',
      cpf: null,
      phone: '11988887777',
      city: 'Campinas',
      state: 'SP',
    });
    expect(
      await prisma.sale.findUniqueOrThrow({ where: { id: sale.id } }),
    ).toMatchObject({ customerId: customer.id, total: expect.anything() });
    expect(
      await prisma.auditLog.findFirst({
        where: { action: 'CUSTOMER_UPDATED', entityId: customer.id },
      }),
    ).toMatchObject({
      userId: user.id,
      entityType: 'Customer',
      requestId: 'req-update-customer',
    });
  });

  it('returns conflict without partial changes when CPF belongs to another customer', async () => {
    const { cookie, customer, user } = await fixture();
    await prisma.customer.create({
      data: {
        name: 'Outra cliente',
        cpf: '10987654321',
        createdById: user.id,
        updatedById: user.id,
      },
    });

    const response = await request(app.getHttpServer())
      .put(`/api/v1/customers/${customer.id}`)
      .set('Cookie', cookie)
      .send({ name: 'Nome alterado', cpf: '10987654321' })
      .expect(409);

    expect(response.body.error.code).toBe('CUSTOMER_CPF_ALREADY_EXISTS');
    expect(await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } })).toMatchObject({
      name: 'Maria Original',
      cpf: '12345678901',
    });
    expect(await prisma.auditLog.count({ where: { action: 'CUSTOMER_UPDATED' } })).toBe(0);
  });

  it('returns not found for an unknown customer on read and update', async () => {
    const { cookie } = await fixture();
    const unknownId = '99999999-9999-4999-8999-999999999999';

    const readResponse = await request(app.getHttpServer())
      .get(`/api/v1/customers/${unknownId}`)
      .set('Cookie', cookie)
      .expect(404);
    expect(readResponse.body.error.code).toBe('CUSTOMER_NOT_FOUND');

    const updateResponse = await request(app.getHttpServer())
      .put(`/api/v1/customers/${unknownId}`)
      .set('Cookie', cookie)
      .send({ name: 'Maria' })
      .expect(404);
    expect(updateResponse.body.error.code).toBe('CUSTOMER_NOT_FOUND');
  });

  it.each([
    { name: '' },
    { name: 'Maria', cpf: '123' },
    { name: 'Maria', unexpected: true },
  ])('rejects invalid payload %j without changing the customer', async (payload) => {
    const { cookie, customer } = await fixture();

    await request(app.getHttpServer())
      .put(`/api/v1/customers/${customer.id}`)
      .set('Cookie', cookie)
      .send(payload)
      .expect(400);

    expect(await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } })).toMatchObject({
      name: 'Maria Original',
      cpf: '12345678901',
    });
  });

  it('validates the identifier and requires authentication', async () => {
    const { customer } = await fixture();

    await request(app.getHttpServer())
      .put('/api/v1/customers/not-a-uuid')
      .send({ name: 'Maria' })
      .expect(400);
    await request(app.getHttpServer())
      .put(`/api/v1/customers/${customer.id}`)
      .send({ name: 'Maria' })
      .expect(401);
  });
});
