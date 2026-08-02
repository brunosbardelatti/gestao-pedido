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
import { CreateOrderUseCase } from '../application/use-cases/create-order.use-case';
import { CreateOrderDto } from './dto/create-order.dto';

const idempotencyKeyPipe = new ParseUUIDPipe({ version: '4' });

@Controller('orders')
export class OrdersController {
  constructor(
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    @Inject(CreateOrderUseCase)
    private readonly createOrderUseCase: CreateOrderUseCase,
  ) {}

  @Post()
  async create(
    @Body(
      new ValidationPipe({
        expectedType: CreateOrderDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: CreateOrderDto,
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
    const order = await this.createOrderUseCase.execute({
      actorId: actor.id,
      idempotencyKey,
      brandId: input.brandId,
      cycle: input.cycle,
      orderDate: input.orderDate,
      notes: input.notes,
      items: input.items,
      requestId: request.requestId,
    });

    return { data: order };
  }
}
