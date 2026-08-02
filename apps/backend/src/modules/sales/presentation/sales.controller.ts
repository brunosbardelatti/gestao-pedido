import {
  Body,
  Controller,
  Inject,
  ParseUUIDPipe,
  Post,
  Req,
  ValidationPipe,
} from '@nestjs/common';

import type { RequestWithId } from '../../../common/http/request-with-id';
import { GetCurrentUserUseCase } from '../../auth/application/use-cases/get-current-user.use-case';
import { CreateSaleUseCase } from '../application/use-cases/create-sale.use-case';
import { CreateSaleDto } from './dto/create-sale.dto';

const idempotencyKeyPipe = new ParseUUIDPipe({ version: '4' });

@Controller('sales')
export class SalesController {
  constructor(
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    @Inject(CreateSaleUseCase)
    private readonly createSaleUseCase: CreateSaleUseCase,
  ) {}

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
    const actor = await this.getCurrentUserUseCase.execute({ token: cookies.session });
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
