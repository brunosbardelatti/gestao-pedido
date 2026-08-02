import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import { type INestApplication } from '@nestjs/common';
import {
  InventoryMovementType,
  PrismaClient,
  UserRole,
} from '@prisma/client';
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

describe('GET /api/v1/inventory', () => {
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

  async function createCatalog(userId: string) {
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

    const createProduct = (input: {
      brandId: string;
      categoryId: string;
      code: string;
      description: string;
      suggestedSalePrice?: string;
    }) =>
      prisma.product.create({
        data: {
          ...input,
          normalizedCode: input.code.toLowerCase(),
          catalogPrice: '100.00',
          purchasePrice: '60.00',
          originalPrice: '120.00',
          createdById: userId,
          updatedById: userId,
        },
      });
    const perfume = await createProduct({
      brandId: natura.id,
      categoryId: perfumaria.id,
      code: 'PERF-001',
      description: 'Essencial feminino',
      suggestedSalePrice: '149.90',
    });
    const creme = await createProduct({
      brandId: natura.id,
      categoryId: cuidados.id,
      code: 'CREME-001',
      description: 'Creme corporal',
    });
    const cologne = await createProduct({
      brandId: avon.id,
      categoryId: perfumaria.id,
      code: 'COL-001',
      description: 'Colônia clássica',
    });

    return { perfumaria, cuidados, natura, avon, perfume, creme, cologne };
  }

  async function move(
    userId: string,
    productId: string,
    quantityDelta: number,
  ) {
    await prisma.inventoryMovement.create({
      data: {
        productId,
        type: InventoryMovementType.CORRECTION,
        quantityDelta,
        reason: 'Preparação do teste',
        createdById: userId,
      },
    });
  }

  it('returns balances derived from all movements and includes zero stock', async () => {
    const { cookie, userId } = await authenticatedActor();
    const catalog = await createCatalog(userId);
    await move(userId, catalog.perfume.id, 8);
    await move(userId, catalog.perfume.id, -3);
    await move(userId, catalog.creme.id, -2);

    const response = await request(app.getHttpServer())
      .get('/api/v1/inventory?page=1&pageSize=20')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body.meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 3,
      totalPages: 1,
    });
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        {
          productId: catalog.perfume.id,
          productCode: 'PERF-001',
          description: 'Essencial feminino',
          brandName: 'Natura',
          balance: 5,
          suggestedSalePrice: '149.90',
        },
        expect.objectContaining({
          productId: catalog.creme.id,
          balance: -2,
        }),
        expect.objectContaining({
          productId: catalog.cologne.id,
          balance: 0,
        }),
      ]),
    );
  });

  it('combines search, brand, category and negative balance filters before pagination', async () => {
    const { cookie, userId } = await authenticatedActor();
    const catalog = await createCatalog(userId);
    await move(userId, catalog.perfume.id, -4);
    await move(userId, catalog.creme.id, -2);
    await move(userId, catalog.cologne.id, -6);

    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/inventory?search=PERF&brandId=${catalog.natura.id}&categoryId=${catalog.perfumaria.id}&negativeOnly=true&page=1&pageSize=1`,
      )
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body.data).toEqual([
      expect.objectContaining({
        productId: catalog.perfume.id,
        balance: -4,
      }),
    ]);
    expect(response.body.meta).toEqual({
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
  });

  it.each([
    'page=0',
    'pageSize=101',
    'brandId=invalid',
    'categoryId=invalid',
    'negativeOnly=invalid',
    `search=${'a'.repeat(121)}`,
    'unexpected=true',
  ])('rejects invalid query %s', async (query) => {
    const { cookie } = await authenticatedActor();

    const response = await request(app.getHttpServer())
      .get(`/api/v1/inventory?${query}`)
      .set('Cookie', cookie)
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/inventory').expect(401);
  });
});
