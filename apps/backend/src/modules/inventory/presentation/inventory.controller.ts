import { Controller, Get, Inject, Query, Req, ValidationPipe } from '@nestjs/common';

import type { RequestWithId } from '../../../common/http/request-with-id';
import { GetCurrentUserUseCase } from '../../auth/application/use-cases/get-current-user.use-case';
import { GetCurrentStockUseCase } from '../application/use-cases/get-current-stock.use-case';
import { ListInventoryMovementsUseCase } from '../application/use-cases/list-inventory-movements.use-case';
import { GetCurrentStockQueryDto } from './dto/get-current-stock-query.dto';
import { ListInventoryMovementsQueryDto } from './dto/list-inventory-movements-query.dto';

@Controller('inventory')
export class InventoryController {
  constructor(
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    @Inject(GetCurrentStockUseCase)
    private readonly getCurrentStockUseCase: GetCurrentStockUseCase,
    @Inject(ListInventoryMovementsUseCase)
    private readonly listInventoryMovementsUseCase: ListInventoryMovementsUseCase,
  ) {}

  @Get('movements')
  async listMovements(
    @Query(
      new ValidationPipe({
        expectedType: ListInventoryMovementsQueryDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    query: ListInventoryMovementsQueryDto,
    @Req() request: RequestWithId,
  ) {
    const cookies = request.cookies as Record<string, string | undefined>;
    await this.getCurrentUserUseCase.execute({ token: cookies.session });
    const result = await this.listInventoryMovementsUseCase.execute(query);

    return { data: result.items, meta: result.meta };
  }

  @Get()
  async getCurrentStock(
    @Query(
      new ValidationPipe({
        expectedType: GetCurrentStockQueryDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    query: GetCurrentStockQueryDto,
    @Req() request: RequestWithId,
  ) {
    const cookies = request.cookies as Record<string, string | undefined>;
    await this.getCurrentUserUseCase.execute({ token: cookies.session });
    const result = await this.getCurrentStockUseCase.execute(query);

    return { data: result.items, meta: result.meta };
  }
}
