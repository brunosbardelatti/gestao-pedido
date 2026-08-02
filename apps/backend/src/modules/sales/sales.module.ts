import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { CancelSalePersistence } from './application/ports/cancel-sale-persistence';
import type { CreateSalePersistence } from './application/ports/create-sale-persistence';
import type { SaleReceiptGenerator } from './application/ports/sale-receipt-generator';
import type { SaleReceiptPersistence } from './application/ports/sale-receipt-persistence';
import type { ListSalesPersistence } from './application/ports/list-sales-persistence';
import {
  CANCEL_SALE_PERSISTENCE,
  CREATE_SALE_PERSISTENCE,
  SALE_RECEIPT_GENERATOR,
  SALE_RECEIPT_PERSISTENCE,
  LIST_SALES_PERSISTENCE,
} from './application/ports/sales.tokens';
import { CancelSaleUseCase } from './application/use-cases/cancel-sale.use-case';
import { CreateSaleUseCase } from './application/use-cases/create-sale.use-case';
import { DownloadSaleReceiptUseCase } from './application/use-cases/download-sale-receipt.use-case';
import { ListSalesUseCase } from './application/use-cases/list-sales.use-case';
import { PdfkitSaleReceiptGenerator } from './infrastructure/pdf/pdfkit-sale-receipt.generator';
import { PrismaCancelSalePersistence } from './infrastructure/persistence/prisma-cancel-sale.persistence';
import { PrismaCreateSalePersistence } from './infrastructure/persistence/prisma-create-sale.persistence';
import { PrismaSaleReceiptPersistence } from './infrastructure/persistence/prisma-sale-receipt.persistence';
import { PrismaListSalesPersistence } from './infrastructure/persistence/prisma-list-sales.persistence';
import { SalesController } from './presentation/sales.controller';

@Module({
  imports: [AuthModule],
  controllers: [SalesController],
  providers: [
    PrismaCancelSalePersistence,
    PrismaCreateSalePersistence,
    PrismaSaleReceiptPersistence,
    PrismaListSalesPersistence,
    PdfkitSaleReceiptGenerator,
    { provide: CANCEL_SALE_PERSISTENCE, useExisting: PrismaCancelSalePersistence },
    { provide: CREATE_SALE_PERSISTENCE, useExisting: PrismaCreateSalePersistence },
    { provide: SALE_RECEIPT_GENERATOR, useExisting: PdfkitSaleReceiptGenerator },
    { provide: SALE_RECEIPT_PERSISTENCE, useExisting: PrismaSaleReceiptPersistence },
    { provide: LIST_SALES_PERSISTENCE, useExisting: PrismaListSalesPersistence },
    {
      provide: CancelSaleUseCase,
      inject: [CANCEL_SALE_PERSISTENCE],
      useFactory: (persistence: CancelSalePersistence) =>
        new CancelSaleUseCase(persistence),
    },
    {
      provide: CreateSaleUseCase,
      inject: [CREATE_SALE_PERSISTENCE],
      useFactory: (persistence: CreateSalePersistence) =>
        new CreateSaleUseCase(persistence),
    },
    {
      provide: DownloadSaleReceiptUseCase,
      inject: [SALE_RECEIPT_PERSISTENCE, SALE_RECEIPT_GENERATOR],
      useFactory: (
        persistence: SaleReceiptPersistence,
        generator: SaleReceiptGenerator,
      ) => new DownloadSaleReceiptUseCase(persistence, generator),
    },
    {
      provide: ListSalesUseCase,
      inject: [LIST_SALES_PERSISTENCE],
      useFactory: (persistence: ListSalesPersistence) =>
        new ListSalesUseCase(persistence),
    },
  ],
})
export class SalesModule {}
