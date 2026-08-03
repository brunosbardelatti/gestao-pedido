import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { GetInventoryReportPersistence } from './application/ports/get-inventory-report-persistence';
import type { GetSalesReportPersistence } from './application/ports/get-sales-report-persistence';
import {
  GET_INVENTORY_REPORT_PERSISTENCE,
  GET_SALES_REPORT_PERSISTENCE,
} from './application/ports/reports.tokens';
import { GetInventoryReportUseCase } from './application/use-cases/get-inventory-report.use-case';
import { GetSalesReportUseCase } from './application/use-cases/get-sales-report.use-case';
import { PrismaGetInventoryReportPersistence } from './infrastructure/persistence/prisma-get-inventory-report.persistence';
import { PrismaGetSalesReportPersistence } from './infrastructure/persistence/prisma-get-sales-report.persistence';
import { ReportsController } from './presentation/reports.controller';

@Module({
  imports: [AuthModule],
  controllers: [ReportsController],
  providers: [
    PrismaGetInventoryReportPersistence,
    PrismaGetSalesReportPersistence,
    {
      provide: GET_INVENTORY_REPORT_PERSISTENCE,
      useExisting: PrismaGetInventoryReportPersistence,
    },
    {
      provide: GET_SALES_REPORT_PERSISTENCE,
      useExisting: PrismaGetSalesReportPersistence,
    },
    {
      provide: GetInventoryReportUseCase,
      inject: [GET_INVENTORY_REPORT_PERSISTENCE],
      useFactory: (persistence: GetInventoryReportPersistence) =>
        new GetInventoryReportUseCase(persistence),
    },
    {
      provide: GetSalesReportUseCase,
      inject: [GET_SALES_REPORT_PERSISTENCE],
      useFactory: (persistence: GetSalesReportPersistence) =>
        new GetSalesReportUseCase(persistence),
    },
  ],
})
export class ReportsModule {}
