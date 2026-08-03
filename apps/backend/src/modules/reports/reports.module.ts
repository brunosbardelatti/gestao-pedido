import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { GetInventoryReportPersistence } from './application/ports/get-inventory-report-persistence';
import { GET_INVENTORY_REPORT_PERSISTENCE } from './application/ports/reports.tokens';
import { GetInventoryReportUseCase } from './application/use-cases/get-inventory-report.use-case';
import { PrismaGetInventoryReportPersistence } from './infrastructure/persistence/prisma-get-inventory-report.persistence';
import { ReportsController } from './presentation/reports.controller';

@Module({
  imports: [AuthModule],
  controllers: [ReportsController],
  providers: [
    PrismaGetInventoryReportPersistence,
    {
      provide: GET_INVENTORY_REPORT_PERSISTENCE,
      useExisting: PrismaGetInventoryReportPersistence,
    },
    {
      provide: GetInventoryReportUseCase,
      inject: [GET_INVENTORY_REPORT_PERSISTENCE],
      useFactory: (persistence: GetInventoryReportPersistence) =>
        new GetInventoryReportUseCase(persistence),
    },
  ],
})
export class ReportsModule {}
