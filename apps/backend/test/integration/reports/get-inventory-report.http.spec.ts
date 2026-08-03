import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import { type INestApplication } from '@nestjs/common';
import { InventoryMovementType, PrismaClient, UserRole } from '@prisma/client';
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

describe('GET /api/v1/reports/inventory', () => {
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
    passwordHash = await argon2.hash('correct-password', { type: argon2.argon2id });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.inventoryMovement.deleteMany();
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

  async function setupCatalog() {
    const user = await prisma.user.create({
      data: {
        name: 'Ana Silva',
        login: 'ana',
        normalizedLogin: 'ana',
        passwordHash,
        role: UserRole.OPERATOR,
      },
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ login: 'ana', password: 'correct-password' })
      .expect(200);
    const category = await prisma.category.create({
      data: {
        name: 'Perfumaria',
        normalizedName: 'perfumaria',
        createdById: user.id,
        updatedById: user.id,
      },
    });
    const natura = await prisma.brand.create({
      data: {
        name: 'Natura',
        normalizedName: 'natura',
        createdById: user.id,
        updatedById: user.id,
      },
    });
    const avon = await prisma.brand.create({
      data: {
        name: 'Avon',
        normalizedName: 'avon',
        createdById: user.id,
        updatedById: user.id,
      },
    });
    const createProduct = (brandId: string, code: string, description: string) =>
      prisma.product.create({
        data: {
          brandId,
          categoryId: category.id,
          code,
          normalizedCode: code.toLowerCase(),
          description,
          catalogPrice: '100.00',
          purchasePrice: '60.00',
          originalPrice: '120.00',
          suggestedSalePrice: code === 'PERF-001' ? '149.90' : null,
          createdById: user.id,
          updatedById: user.id,
        },
      });
    const perfume = await createProduct(natura.id, 'PERF-001', 'Essencial feminino');
    const creme = await createProduct(avon.id, 'CREME-001', 'Creme corporal');

    await prisma.inventoryMovement.createMany({
      data: [
        {
          productId: perfume.id,
          type: InventoryMovementType.CORRECTION,
          quantityDelta: 8,
          reason: 'Preparação do teste',
          createdById: user.id,
        },
        {
          productId: perfume.id,
          type: InventoryMovementType.CORRECTION,
          quantityDelta: -3,
          reason: 'Preparação do teste',
          createdById: user.id,
        },
      ],
    });

    return {
      cookie: login.headers['set-cookie']?.[0] ?? '',
      perfume,
      creme,
    };
  }

  it('returns ledger-derived balances with pagination and selected ordering', async () => {
    const fixture = await setupCatalog();

    const response = await request(app.getHttpServer())
      .get('/api/v1/reports/inventory?page=1&pageSize=20&sortBy=balance&sortOrder=desc')
      .set('Cookie', fixture.cookie)
      .expect(200);

    expect(response.body.meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
    });
    expect(response.body.data).toEqual([
      {
        productId: fixture.perfume.id,
        productCode: 'PERF-001',
        description: 'Essencial feminino',
        brandName: 'Natura',
        balance: 5,
        suggestedSalePrice: '149.90',
      },
      expect.objectContaining({ productId: fixture.creme.id, balance: 0 }),
    ]);
  });

  it('searches product and brand fields before pagination', async () => {
    const fixture = await setupCatalog();

    const response = await request(app.getHttpServer())
      .get('/api/v1/reports/inventory?search=natura&page=1&pageSize=1')
      .set('Cookie', fixture.cookie)
      .expect(200);

    expect(response.body.data).toEqual([
      expect.objectContaining({ productId: fixture.perfume.id, brandName: 'Natura' }),
    ]);
    expect(response.body.meta.total).toBe(1);
  });

  it.each([
    'page=0',
    'pageSize=101',
    `search=${'a'.repeat(121)}`,
    'sortBy=invalid',
    'sortOrder=invalid',
    'unexpected=true',
  ])('rejects invalid query %s', async (query) => {
    const fixture = await setupCatalog();
    const response = await request(app.getHttpServer())
      .get(`/api/v1/reports/inventory?${query}`)
      .set('Cookie', fixture.cookie)
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/reports/inventory').expect(401);
  });
});
