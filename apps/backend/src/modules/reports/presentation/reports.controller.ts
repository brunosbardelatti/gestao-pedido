import { Controller, Get, Inject, Query, Req, ValidationPipe } from '@nestjs/common';

import type { RequestWithId } from '../../../common/http/request-with-id';
import { GetCurrentUserUseCase } from '../../auth/application/use-cases/get-current-user.use-case';
import { GetInventoryReportUseCase } from '../application/use-cases/get-inventory-report.use-case';
import { GetSalesReportUseCase } from '../application/use-cases/get-sales-report.use-case';
import { GetInventoryReportQueryDto } from './dto/get-inventory-report-query.dto';
import { GetSalesReportQueryDto } from './dto/get-sales-report-query.dto';

@Controller('reports')
export class ReportsController {
  constructor(
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    @Inject(GetInventoryReportUseCase)
    private readonly getInventoryReportUseCase: GetInventoryReportUseCase,
    @Inject(GetSalesReportUseCase)
    private readonly getSalesReportUseCase: GetSalesReportUseCase,
  ) {}

  @Get('sales')
  async getSales(
    @Query(
      new ValidationPipe({
        expectedType: GetSalesReportQueryDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    query: GetSalesReportQueryDto,
    @Req() request: RequestWithId,
  ) {
    const cookies = request.cookies as Record<string, string | undefined>;
    await this.getCurrentUserUseCase.execute({ token: cookies.session });
    const result = await this.getSalesReportUseCase.execute(query);

    return { data: result };
  }

  @Get('inventory')
  async getInventory(
    @Query(
      new ValidationPipe({
        expectedType: GetInventoryReportQueryDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    query: GetInventoryReportQueryDto,
    @Req() request: RequestWithId,
  ) {
    const cookies = request.cookies as Record<string, string | undefined>;
    await this.getCurrentUserUseCase.execute({ token: cookies.session });
    const result = await this.getInventoryReportUseCase.execute(query);

    return { data: result.items, meta: result.meta };
  }
}
