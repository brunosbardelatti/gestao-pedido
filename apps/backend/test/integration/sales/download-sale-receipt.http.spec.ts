import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
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

describe('GET /api/v1/sales/:id/receipt', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let app: INestApplication;
  let passwordHash: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    process.env.DATABASE_URL = container.getConnectionUri();
    process.env.NODE_ENV = 'test';
    process.env.RESELLER_NAME = 'Ana Cosméticos';
    process.env.RESELLER_DETAILS = 'Atendimento em São Paulo - SP';
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
    await prisma.inventoryMovement.deleteMany();
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.customer.deleteMany();
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
    const brand = await prisma.brand.create({
      data: {
        name: 'Natura',
        normalizedName: 'natura',
        createdById: user.id,
        updatedById: user.id,
      },
    });
    const category = await prisma.category.create({
      data: {
        name: 'Perfumaria',
        normalizedName: 'perfumaria',
        createdById: user.id,
        updatedById: user.id,
      },
    });
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        categoryId: category.id,
        code: 'PERF-1',
        normalizedCode: 'perf-1',
        description: 'Perfume Floral',
        catalogPrice: '15.00',
        purchasePrice: '6.00',
        originalPrice: '15.00',
        createdById: user.id,
        updatedById: user.id,
      },
    });
    const customer = await prisma.customer.create({
      data: {
        name: 'Maria Cliente',
        cpf: '12345678901',
        phone: '11999999999',
        addressLine: 'Rua das Flores, 10',
        city: 'São Paulo',
        state: 'SP',
        postalCode: '01001000',
        createdById: user.id,
        updatedById: user.id,
      },
    });
    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        paymentMethod: 'PIX',
        total: '24.00',
        notes: 'Entregar amanhã',
        createdById: user.id,
        items: {
          create: {
            productId: product.id,
            quantity: 2,
            unitPrice: '12.00',
            unitCostSnapshot: '6.00',
            subtotal: '24.00',
          },
        },
      },
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ login: 'ana', password: 'correct-password' })
      .expect(200);
    return { cookie: login.headers['set-cookie']?.[0] ?? '', sale, user };
  }

  it('downloads a non-fiscal PDF and records the audit', async () => {
    const { cookie, sale, user } = await fixture();
    const response = await request(app.getHttpServer())
      .get(`/api/v1/sales/${sale.id}/receipt`)
      .set('Cookie', cookie)
      .set('x-request-id', 'req-receipt')
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toBe(
      `attachment; filename="recibo-venda-${sale.id}.pdf"`,
    );
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect((response.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    expect((response.body as Buffer).byteLength).toBeGreaterThan(1_000);
    expect(
      await prisma.auditLog.findFirst({
        where: { action: 'SALE_RECEIPT_DOWNLOADED', entityId: sale.id },
      }),
    ).toMatchObject({ userId: user.id, requestId: 'req-receipt' });
  });

  it('returns not found without audit for an unknown sale', async () => {
    const { cookie } = await fixture();
    const response = await request(app.getHttpServer())
      .get(`/api/v1/sales/${randomUUID()}/receipt`)
      .set('Cookie', cookie)
      .expect(404);
    expect(response.body.error.code).toBe('SALE_NOT_FOUND');
    expect(await prisma.auditLog.count({ where: { action: 'SALE_RECEIPT_DOWNLOADED' } })).toBe(0);
  });

  it('requires authentication and a valid sale id', async () => {
    const { cookie, sale } = await fixture();
    await request(app.getHttpServer())
      .get(`/api/v1/sales/${sale.id}/receipt`)
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/sales/invalid/receipt')
      .set('Cookie', cookie)
      .expect(400);
  });
});
