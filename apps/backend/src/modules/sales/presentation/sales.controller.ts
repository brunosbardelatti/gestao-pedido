import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';

import type { RequestWithId } from '../../../common/http/request-with-id';
import { GetCurrentUserUseCase } from '../../auth/application/use-cases/get-current-user.use-case';
import { CancelSaleUseCase } from '../application/use-cases/cancel-sale.use-case';
import { CreateSaleUseCase } from '../application/use-cases/create-sale.use-case';
import { DownloadSaleReceiptUseCase } from '../application/use-cases/download-sale-receipt.use-case';
import { ListSalesUseCase } from '../application/use-cases/list-sales.use-case';
import { CancelSaleDto } from './dto/cancel-sale.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ListSalesQueryDto } from './dto/list-sales-query.dto';

const idempotencyKeyPipe = new ParseUUIDPipe({ version: '4' });

@Controller('sales')
export class SalesController {
  constructor(
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    @Inject(CancelSaleUseCase)
    private readonly cancelSaleUseCase: CancelSaleUseCase,
    @Inject(CreateSaleUseCase)
    private readonly createSaleUseCase: CreateSaleUseCase,
    @Inject(DownloadSaleReceiptUseCase)
    private readonly downloadSaleReceiptUseCase: DownloadSaleReceiptUseCase,
    @Inject(ListSalesUseCase)
    private readonly listSalesUseCase: ListSalesUseCase,
  ) {}

  @Get()
  async list(
    @Query(
      new ValidationPipe({
        expectedType: ListSalesQueryDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    query: ListSalesQueryDto,
    @Req() request: RequestWithId,
  ) {
    const cookies = request.cookies as Record<string, string | undefined>;
    await this.getCurrentUserUseCase.execute({ token: cookies.session, apiKey: request.get('x-api-key') });
    const result = await this.listSalesUseCase.execute(query);
    return { data: result.items, meta: result.meta };
  }

  @Get(':id/receipt')
  async downloadReceipt(
    @Param('id', new ParseUUIDPipe({ version: '4' })) saleId: string,
    @Req() request: RequestWithId,
    @Res() response: Response,
  ): Promise<void> {
    const cookies = request.cookies as Record<string, string | undefined>;
    const actor = await this.getCurrentUserUseCase.execute({
      token: cookies.session,
    apiKey: request.get('x-api-key'),
    });
    const receipt = await this.downloadSaleReceiptUseCase.execute({
      actorId: actor.id,
      saleId,
      requestId: request.requestId,
    });
    response
      .status(HttpStatus.OK)
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${receipt.filename}"`,
        'Content-Length': String(receipt.content.byteLength),
      })
      .send(receipt.content);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id', new ParseUUIDPipe({ version: '4' })) saleId: string,
    @Body(
      new ValidationPipe({
        expectedType: CancelSaleDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: CancelSaleDto,
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
    apiKey: request.get('x-api-key'),
    });
    const sale = await this.cancelSaleUseCase.execute({
      actorId: actor.id,
      saleId,
      idempotencyKey,
      reason: input.reason,
      requestId: request.requestId,
    });
    return { data: sale };
  }

  @Post()
  async create(
    @Body(
      new ValidationPipe({
        expectedType: CreateSaleDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: CreateSaleDto,
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
    const actor = await this.getCurrentUserUseCase.execute({ token: cookies.session, apiKey: request.get('x-api-key') });
    const sale = await this.createSaleUseCase.execute({
      actorId: actor.id,
      idempotencyKey,
      customerId: input.customerId,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
      confirmNegativeStock: input.confirmNegativeStock,
      items: input.items,
      requestId: request.requestId,
    });
    return { data: sale };
  }
}
