import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

import { type INestApplication } from '@nestjs/common';
import { PrismaClient, UserRole } from '@prisma/client';
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

const VALID_XML = `<?xml version="1.0"?>
<nfeProc>
  <NFe>
    <infNFe>
      <ide><cNF>12345678</cNF></ide>
      <emit><xNome>Natura Cosméticos</xNome></emit>
      <det nItem="1">
        <prod>
          <cProd>NAT-001</cProd>
          <xProd>Perfume essencial</xProd>
          <qCom>5</qCom>
          <vUnCom>12.50</vUnCom>
        </prod>
      </det>
      <protNFe><infProt><chNFe>35260812345678901234550010000012341000012349</chNFe></infProt></protNFe>
    </infNFe>
  </NFe>
</nfeProc>`;

describe('NF-e import and approval endpoints', () => {
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
    await prisma.importedOrderItem.deleteMany();
    await prisma.importedOrder.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
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

  async function loginAsAdmin() {
    await prisma.user.create({
      data: {
        name: 'Admin',
        login: 'admin',
        normalizedLogin: 'admin',
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ login: 'admin', password: 'correct-password' })
      .expect(200);
    return loginResponse.headers['set-cookie']?.[0] ?? '';
  }

  it('imports an NF-e XML and creates a draft with parsed items', async () => {
    const cookie = await loginAsAdmin();
    const key = randomUUID();

    const response = await request(app.getHttpServer())
      .post('/api/v1/integrations/nfe-xml')
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send({ xml: VALID_XML })
      .expect(201);

    expect(response.body.data).toMatchObject({
      idempotencyKey: key,
      nfeAccessKey: '35260812345678901234550010000012341000012349',
      supplierName: 'Natura Cosméticos',
      status: 'DRAFT',
    });
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0]).toMatchObject({
      productCode: 'NAT-001',
      description: 'Perfume essencial',
      quantity: 5,
    });

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'NFE_IMPORTED' },
    });
    expect(audit).toBeTruthy();
  });

  it('returns conflict for a duplicate idempotency key', async () => {
    const cookie = await loginAsAdmin();
    const key = randomUUID();

    await request(app.getHttpServer())
      .post('/api/v1/integrations/nfe-xml')
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send({ xml: VALID_XML })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/integrations/nfe-xml')
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send({ xml: VALID_XML })
      .expect(409);

    expect(response.body.error.code).toBe('IMPORT_IDEMPOTENCY_CONFLICT');
  });

  it('rejects invalid XML', async () => {
    const cookie = await loginAsAdmin();

    const response = await request(app.getHttpServer())
      .post('/api/v1/integrations/nfe-xml')
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send({ xml: '<html>not nfe</html>' })
      .expect(422);

    expect(response.body.error.code).toBe('INVALID_NFE_XML');
  });

  it('approves a draft and creates an OPEN order', async () => {
    const cookie = await loginAsAdmin();
    const user = await prisma.user.findFirst();
    const brand = await prisma.brand.create({
      data: {
        name: 'Natura',
        normalizedName: 'natura',
        createdById: user!.id,
        updatedById: user!.id,
      },
    });
    const category = await prisma.category.create({
      data: {
        name: 'Perfumaria',
        normalizedName: 'perfumaria',
        createdById: user!.id,
        updatedById: user!.id,
      },
    });
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        categoryId: category.id,
        code: 'NAT-001',
        normalizedCode: 'nat-001',
        description: 'Perfume essencial',
        catalogPrice: '25.00',
        purchasePrice: '12.50',
        originalPrice: '25.00',
        createdById: user!.id,
        updatedById: user!.id,
      },
    });

    const importResponse = await request(app.getHttpServer())
      .post('/api/v1/integrations/nfe-xml')
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send({ xml: VALID_XML })
      .expect(201);

    const importedId = importResponse.body.data.id;

    const approveResponse = await request(app.getHttpServer())
      .post(`/api/v1/integrations/imported-orders/${importedId}/approve`)
      .set('Cookie', cookie)
      .send({
        brandId: brand.id,
        cycle: 'Ciclo 08/2026',
        orderDate: '2026-08-02',
        items: [
          {
            productId: product.id,
            quantityOrdered: 5,
            catalogUnitPrice: '25.00',
            purchaseUnitPrice: '12.50',
            originalUnitPrice: '25.00',
          },
        ],
      })
      .expect(200);

    expect(approveResponse.body.data).toMatchObject({
      importedOrderId: importedId,
      status: 'APPROVED',
    });
    expect(approveResponse.body.data.orderId).toBeDefined();

    const order = await prisma.order.findUnique({
      where: { id: approveResponse.body.data.orderId },
      include: { items: true },
    });
    expect(order?.status).toBe('OPEN');
    expect(order?.items).toHaveLength(1);
    expect(order?.items[0].quantityOrdered).toBe(5);

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'IMPORTED_ORDER_APPROVED' },
    });
    expect(audit).toBeTruthy();
  });

  it('rejects approval of an already approved draft', async () => {
    const cookie = await loginAsAdmin();
    const user = await prisma.user.findFirst();
    const brand = await prisma.brand.create({
      data: {
        name: 'Avon',
        normalizedName: 'avon',
        createdById: user!.id,
        updatedById: user!.id,
      },
    });
    const category = await prisma.category.create({
      data: {
        name: 'Maquiagem',
        normalizedName: 'maquiagem',
        createdById: user!.id,
        updatedById: user!.id,
      },
    });
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        categoryId: category.id,
        code: 'AVN-001',
        normalizedCode: 'avn-001',
        description: 'Batom matte',
        catalogPrice: '15.00',
        purchasePrice: '6.00',
        originalPrice: '15.00',
        createdById: user!.id,
        updatedById: user!.id,
      },
    });

    const importResponse = await request(app.getHttpServer())
      .post('/api/v1/integrations/nfe-xml')
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send({ xml: VALID_XML })
      .expect(201);

    const importedId = importResponse.body.data.id;
    const approveBody = {
      brandId: brand.id,
      cycle: 'Ciclo 08/2026',
      orderDate: '2026-08-02',
      items: [
        {
          productId: product.id,
          quantityOrdered: 5,
          catalogUnitPrice: '15.00',
          purchaseUnitPrice: '6.00',
          originalUnitPrice: '15.00',
        },
      ],
    };

    await request(app.getHttpServer())
      .post(`/api/v1/integrations/imported-orders/${importedId}/approve`)
      .set('Cookie', cookie)
      .send(approveBody)
      .expect(200);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/integrations/imported-orders/${importedId}/approve`)
      .set('Cookie', cookie)
      .send(approveBody)
      .expect(422);

    expect(response.body.error.code).toBe('IMPORTED_ORDER_NOT_DRAFT');
  });

  it('returns not found for an unknown imported order', async () => {
    const cookie = await loginAsAdmin();

    const unknownId = randomUUID();
    const response = await request(app.getHttpServer())
      .post(
        `/api/v1/integrations/imported-orders/${unknownId}/approve`,
      )
      .set('Cookie', cookie)
      .send({
        brandId: randomUUID(),
        cycle: 'Ciclo',
        orderDate: '2026-08-02',
        items: [
          {
            productId: randomUUID(),
            quantityOrdered: 1,
            catalogUnitPrice: '10.00',
            purchaseUnitPrice: '5.00',
            originalUnitPrice: '10.00',
          },
        ],
      })
      .expect(404);

    expect(response.body.error.code).toBe('IMPORTED_ORDER_NOT_FOUND');
  });

  it('requires authentication for all endpoints', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/integrations/nfe-xml')
      .set('Idempotency-Key', randomUUID())
      .send({ xml: VALID_XML })
      .expect(401);

    await request(app.getHttpServer())
      .post(
        `/api/v1/integrations/imported-orders/${randomUUID()}/approve`,
      )
      .send({
        brandId: randomUUID(),
        cycle: 'Ciclo',
        orderDate: '2026-08-02',
        items: [
          {
            productId: randomUUID(),
            quantityOrdered: 1,
            catalogUnitPrice: '10.00',
            purchaseUnitPrice: '5.00',
            originalUnitPrice: '10.00',
          },
        ],
      })
      .expect(401);
  });
});
