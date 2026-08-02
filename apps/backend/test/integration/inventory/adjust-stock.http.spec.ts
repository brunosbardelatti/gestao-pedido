import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
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

describe('POST /api/v1/inventory/adjustments', () => {
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
    await prisma.idempotencyRecord.deleteMany();
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
      user,
    };
  }

  async function createProduct(userId: string) {
    const brand = await prisma.brand.create({
      data: {
        name: 'Natura',
        normalizedName: 'natura',
        createdById: userId,
        updatedById: userId,
      },
    });
    const category = await prisma.category.create({
      data: {
        name: 'Perfumaria',
        normalizedName: 'perfumaria',
        createdById: userId,
        updatedById: userId,
      },
    });

    return prisma.product.create({
      data: {
        brandId: brand.id,
        categoryId: category.id,
        code: 'PERF-001',
        normalizedCode: 'perf-001',
        description: 'Essencial',
        catalogPrice: '100.00',
        purchasePrice: '60.00',
        originalPrice: '120.00',
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  function adjustmentRequest(
    cookie: string,
    key: string,
    body: Record<string, unknown>,
  ) {
    return request(app.getHttpServer())
      .post('/api/v1/inventory/adjustments')
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(body);
  }

  it('creates an immutable adjustment movement and audit atomically', async () => {
    const { cookie, user } = await authenticatedActor();
    const product = await createProduct(user.id);

    const response = await adjustmentRequest(cookie, randomUUID(), {
      productId: product.id,
      type: 'CORRECTION',
      quantityDelta: 4,
      reason: '  Contagem física  ',
    }).expect(201);

    expect(response.body.data).toMatchObject({
      id: expect.any(String),
      productId: product.id,
      type: 'CORRECTION',
      quantityDelta: 4,
      reason: 'Contagem física',
      orderItemId: null,
      saleItemId: null,
      createdBy: { id: user.id, name: 'Ana Silva' },
      createdAt: expect.any(String),
    });
    expect(await prisma.inventoryMovement.count()).toBe(1);
    expect(
      await prisma.auditLog.findFirst({
        where: { action: 'INVENTORY_ADJUSTED' },
      }),
    ).toMatchObject({
      action: 'INVENTORY_ADJUSTED',
      entityType: 'InventoryMovement',
      entityId: response.body.data.id,
      userId: user.id,
    });
  });

  it('replays the same adjustment without duplicating movement or audit', async () => {
    const { cookie, user } = await authenticatedActor();
    const product = await createProduct(user.id);
    const key = randomUUID();
    const body = {
      productId: product.id,
      type: 'RETURN',
      quantityDelta: 2,
      reason: 'Devolução da cliente',
    };

    const first = await adjustmentRequest(cookie, key, body).expect(201);
    const replay = await adjustmentRequest(cookie, key, body).expect(201);

    expect(replay.body).toEqual(first.body);
    expect(await prisma.inventoryMovement.count()).toBe(1);
    expect(
      await prisma.auditLog.count({
        where: { action: 'INVENTORY_ADJUSTED' },
      }),
    ).toBe(1);
  });

  it('rejects reuse of a key with a different adjustment', async () => {
    const { cookie, user } = await authenticatedActor();
    const product = await createProduct(user.id);
    const key = randomUUID();
    await adjustmentRequest(cookie, key, {
      productId: product.id,
      type: 'CORRECTION',
      quantityDelta: 2,
      reason: 'Contagem',
    }).expect(201);

    const response = await adjustmentRequest(cookie, key, {
      productId: product.id,
      type: 'CORRECTION',
      quantityDelta: 3,
      reason: 'Contagem',
    }).expect(409);

    expect(response.body.error.code).toBe('IDEMPOTENCY_KEY_CONFLICT');
    expect(await prisma.inventoryMovement.count()).toBe(1);
  });

  it('requires explicit confirmation before creating negative stock', async () => {
    const { cookie, user } = await authenticatedActor();
    const product = await createProduct(user.id);
    const body = {
      productId: product.id,
      type: 'PERSONAL_USE',
      quantityDelta: -1,
      reason: 'Uso em demonstração',
    };

    const rejected = await adjustmentRequest(cookie, randomUUID(), body).expect(
      422,
    );
    expect(rejected.body.error.code).toBe(
      'NEGATIVE_STOCK_CONFIRMATION_REQUIRED',
    );
    expect(await prisma.inventoryMovement.count()).toBe(0);

    await adjustmentRequest(cookie, randomUUID(), {
      ...body,
      confirmNegativeStock: true,
    }).expect(201);
    expect(await prisma.inventoryMovement.count()).toBe(1);
  });

  it('serializes concurrent adjustments against the current balance', async () => {
    const { cookie, user } = await authenticatedActor();
    const product = await createProduct(user.id);
    await prisma.inventoryMovement.create({
      data: {
        productId: product.id,
        type: InventoryMovementType.CORRECTION,
        quantityDelta: 5,
        reason: 'Saldo inicial',
        createdById: user.id,
      },
    });
    const body = {
      productId: product.id,
      type: 'PERSONAL_USE',
      quantityDelta: -4,
      reason: 'Separação simultânea',
    };

    const responses = await Promise.all([
      adjustmentRequest(cookie, randomUUID(), body),
      adjustmentRequest(cookie, randomUUID(), body),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 422,
    ]);
    const aggregate = await prisma.inventoryMovement.aggregate({
      where: { productId: product.id },
      _sum: { quantityDelta: true },
    });
    expect(aggregate._sum.quantityDelta).toBe(1);
    expect(await prisma.inventoryMovement.count()).toBe(2);
  });

  it('returns not found without side effects for an unknown product', async () => {
    const { cookie } = await authenticatedActor();

    const response = await adjustmentRequest(cookie, randomUUID(), {
      productId: randomUUID(),
      type: 'CORRECTION',
      quantityDelta: 1,
      reason: 'Contagem',
    }).expect(404);

    expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    expect(await prisma.inventoryMovement.count()).toBe(0);
  });

  it.each([
    [{ type: 'PURCHASE', quantityDelta: 1, reason: 'Inválido' }, 400],
    [{ type: 'CORRECTION', quantityDelta: 0, reason: 'Inválido' }, 400],
    [{ type: 'RETURN', quantityDelta: 1, reason: '   ' }, 400],
    [{ type: 'RETURN', quantityDelta: 1, reason: 'Válido', extra: true }, 400],
  ])('rejects invalid payload %#', async (partial, status) => {
    const { cookie, user } = await authenticatedActor();
    const product = await createProduct(user.id);

    await adjustmentRequest(cookie, randomUUID(), {
      productId: product.id,
      ...partial,
    }).expect(status);
    expect(await prisma.inventoryMovement.count()).toBe(0);
  });

  it('requires authentication and a valid idempotency key', async () => {
    const { cookie, user } = await authenticatedActor();
    const product = await createProduct(user.id);
    const body = {
      productId: product.id,
      type: 'CORRECTION',
      quantityDelta: 1,
      reason: 'Contagem',
    };

    await request(app.getHttpServer())
      .post('/api/v1/inventory/adjustments')
      .set('Idempotency-Key', randomUUID())
      .send(body)
      .expect(401);
    await adjustmentRequest(cookie, 'invalid', body).expect(400);
  });
});
