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

describe('GET /api/v1/customers', () => {
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
    await prisma.sale.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.auditLog.deleteMany();
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
        name: 'Ana',
        login: 'ana',
        normalizedLogin: 'ana',
        passwordHash,
        role: 'OPERATOR',
      },
    });
    await prisma.customer.createMany({
      data: [
        {
          name: 'Ana Souza',
          cpf: '11111111111',
          phone: '11911112222',
          city: 'Sao Paulo',
          active: false,
          createdById: user.id,
          updatedById: user.id,
        },
        {
          name: 'Maria Almeida',
          cpf: '22222222222',
          phone: '11933334444',
          city: 'Campinas',
          createdById: user.id,
          updatedById: user.id,
        },
        {
          name: 'Mariana Lima',
          cpf: '33333333333',
          phone: '21933335555',
          city: 'Rio de Janeiro',
          createdById: user.id,
          updatedById: user.id,
        },
      ],
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ login: 'ana', password: 'correct-password' })
      .expect(200);
    return login.headers['set-cookie']?.[0] ?? '';
  }

  it('returns active and inactive customers ordered by name with pagination', async () => {
    const cookie = await fixture();

    const response = await request(app.getHttpServer())
      .get('/api/v1/customers?page=1&pageSize=2')
      .set('Cookie', cookie)
      .expect(200);

    expect(
      (response.body.data as Array<{ name: string }>).map(
        (customer) => customer.name,
      ),
    ).toEqual(['Ana Souza', 'Maria Almeida']);
    expect(response.body.data[0]).toMatchObject({
      cpf: '11111111111',
      phone: '11911112222',
      city: 'Sao Paulo',
      active: false,
    });
    expect(response.body.meta).toEqual({
      page: 1,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    });
  });

  it('finds a partial name case-insensitively', async () => {
    const cookie = await fixture();

    const response = await request(app.getHttpServer())
      .get('/api/v1/customers?search=MARIA')
      .set('Cookie', cookie)
      .expect(200);

    expect(
      (response.body.data as Array<{ name: string }>).map(
        (customer) => customer.name,
      ),
    ).toEqual(['Maria Almeida', 'Mariana Lima']);
  });

  it('combines exact CPF and partial phone filters', async () => {
    const cookie = await fixture();

    const response = await request(app.getHttpServer())
      .get('/api/v1/customers?cpf=22222222222&phone=3333')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Maria Almeida');
  });

  it.each([
    'page=0',
    'pageSize=101',
    'search=' + 'a'.repeat(151),
    'cpf=123',
    'phone=' + '1'.repeat(21),
    'unexpected=true',
  ])('rejects invalid query %s', async (query) => {
    const cookie = await fixture();

    await request(app.getHttpServer())
      .get(`/api/v1/customers?${query}`)
      .set('Cookie', cookie)
      .expect(400);
  });

  it('requires authentication', async () => {
    await fixture();
    await request(app.getHttpServer()).get('/api/v1/customers').expect(401);
  });
});
