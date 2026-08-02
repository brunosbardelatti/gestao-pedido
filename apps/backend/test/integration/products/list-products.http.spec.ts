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

describe('GET /api/v1/products', () => {
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

  async function authenticatedActor() {
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

  async function createReferences(userId: string) {
    const natura = await prisma.brand.create({
      data: {
        name: 'Natura',
        normalizedName: 'natura',
        createdById: userId,
        updatedById: userId,
      },
    });
    const avon = await prisma.brand.create({
      data: {
        name: 'Avon',
        normalizedName: 'avon',
        createdById: userId,
        updatedById: userId,
      },
    });
    const perfumaria = await prisma.category.create({
      data: {
        name: 'Perfumaria',
        normalizedName: 'perfumaria',
        createdById: userId,
        updatedById: userId,
      },
    });
    const cuidados = await prisma.category.create({
      data: {
        name: 'Cuidados',
        normalizedName: 'cuidados',
        createdById: userId,
        updatedById: userId,
      },
    });

    return { natura, avon, perfumaria, cuidados };
  }

  async function createProduct(
    userId: string,
    brandId: string,
    categoryId: string,
    code: string,
    description: string,
    active = true,
  ) {
    return prisma.product.create({
      data: {
        brandId,
        categoryId,
        code,
        normalizedCode: code.toLowerCase(),
        description,
        catalogPrice: '149.90',
        purchasePrice: '89.00',
        originalPrice: '179.90',
        suggestedSalePrice: active ? '169.90' : null,
        active,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  it('returns both active and inactive products with pagination metadata', async () => {
    const { cookie, userId } = await authenticatedActor();
    const refs = await createReferences(userId);
    await createProduct(
      userId,
      refs.natura.id,
      refs.perfumaria.id,
      'PERF-002',
      'Kaiak masculino',
      false,
    );
    await createProduct(
      userId,
      refs.natura.id,
      refs.perfumaria.id,
      'PERF-001',
      'Essencial feminino',
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/products?page=1&pageSize=1')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toMatchObject({
      data: [
        {
          id: expect.any(String),
          code: expect.any(String),
          brand: { id: refs.natura.id, name: 'Natura' },
          category: { id: refs.perfumaria.id, name: 'Perfumaria' },
          catalogPrice: '149.90',
          suggestedSalePrice: expect.anything(),
          active: expect.any(Boolean),
        },
      ],
      meta: { page: 1, pageSize: 1, total: 2, totalPages: 2 },
    });
  });

  it('finds a partial description case-insensitively', async () => {
    const { cookie, userId } = await authenticatedActor();
    const refs = await createReferences(userId);
    const expected = await createProduct(
      userId,
      refs.natura.id,
      refs.perfumaria.id,
      'PERF-001',
      'Essencial Feminino',
    );
    await createProduct(
      userId,
      refs.avon.id,
      refs.cuidados.id,
      'CREME-001',
      'Creme corporal',
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/products?search=femIN&page=1&pageSize=20')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({ id: expected.id });
  });

  it('finds a partial code case-insensitively', async () => {
    const { cookie, userId } = await authenticatedActor();
    const refs = await createReferences(userId);
    const expected = await createProduct(
      userId,
      refs.natura.id,
      refs.perfumaria.id,
      'PERF-ABC-001',
      'Essencial feminino',
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/products?search=abc')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(expected.id);
  });

  it('combines brand, category and active filters', async () => {
    const { cookie, userId } = await authenticatedActor();
    const refs = await createReferences(userId);
    const expected = await createProduct(
      userId,
      refs.natura.id,
      refs.perfumaria.id,
      'PERF-001',
      'Essencial feminino',
      false,
    );
    await createProduct(
      userId,
      refs.natura.id,
      refs.cuidados.id,
      'CREME-001',
      'Creme corporal',
      false,
    );
    await createProduct(
      userId,
      refs.avon.id,
      refs.perfumaria.id,
      'PERF-002',
      'Far Away',
      true,
    );

    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/products?brandId=${refs.natura.id}&categoryId=${refs.perfumaria.id}&active=false`,
      )
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: expected.id,
      active: false,
    });
  });

  it.each([
    'page=0',
    'pageSize=101',
    'brandId=invalid',
    'categoryId=invalid',
    'active=invalid',
    'unexpected=true',
  ])('rejects invalid query %s', async (query) => {
    const { cookie } = await authenticatedActor();

    const response = await request(app.getHttpServer())
      .get(`/api/v1/products?${query}`)
      .set('Cookie', cookie)
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/products').expect(401);
  });
});
