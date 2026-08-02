import {
  Body,
  Controller,
  Get,
  Inject,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  ValidationPipe,
} from '@nestjs/common';

import type { RequestWithId } from '../../../common/http/request-with-id';
import { GetCurrentUserUseCase } from '../../auth/application/use-cases/get-current-user.use-case';
import { AdjustStockUseCase } from '../application/use-cases/adjust-stock.use-case';
import { GetCurrentStockUseCase } from '../application/use-cases/get-current-stock.use-case';
import { ListInventoryMovementsUseCase } from '../application/use-cases/list-inventory-movements.use-case';
import { GetCurrentStockQueryDto } from './dto/get-current-stock-query.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ListInventoryMovementsQueryDto } from './dto/list-inventory-movements-query.dto';

const idempotencyKeyPipe = new ParseUUIDPipe({ version: '4' });

@Controller('inventory')
export class InventoryController {
  constructor(
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    @Inject(AdjustStockUseCase)
    private readonly adjustStockUseCase: AdjustStockUseCase,
    @Inject(GetCurrentStockUseCase)
    private readonly getCurrentStockUseCase: GetCurrentStockUseCase,
    @Inject(ListInventoryMovementsUseCase)
    private readonly listInventoryMovementsUseCase: ListInventoryMovementsUseCase,
  ) {}

  @Post('adjustments')
  async adjustStock(
    @Body(
      new ValidationPipe({
        expectedType: AdjustStockDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: AdjustStockDto,
    @Req() request: RequestWithId,
  ) {
    const idempotencyHeader = request.headers['idempotency-key'];
    const idempotencyKey = await idempotencyKeyPipe.transform(
      Array.isArray(idempotencyHeader)
        ? (idempotencyHeader[0] ?? '')
        : (idempotencyHeader ?? ''),
      { type: 'custom' },
    );
    const cookies = request.cookies as Record<string, string | undefined>;
    const actor = await this.getCurrentUserUseCase.execute({
      token: cookies.session,
    });
    const movement = await this.adjustStockUseCase.execute({
      actorId: actor.id,
      idempotencyKey,
      productId: input.productId,
      type: input.type,
      quantityDelta: input.quantityDelta,
      reason: input.reason,
      confirmNegativeStock: input.confirmNegativeStock,
      requestId: request.requestId,
    });

    return { data: movement };
  }

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
