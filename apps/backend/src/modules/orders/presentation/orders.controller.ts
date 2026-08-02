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
  Put,
  Query,
  Req,
  ValidationPipe,
} from '@nestjs/common';

import type { RequestWithId } from '../../../common/http/request-with-id';
import { GetCurrentUserUseCase } from '../../auth/application/use-cases/get-current-user.use-case';
import { CancelOrderUseCase } from '../application/use-cases/cancel-order.use-case';
import { CreateOrderUseCase } from '../application/use-cases/create-order.use-case';
import { GetOrderUseCase } from '../application/use-cases/get-order.use-case';
import { ListOrdersUseCase } from '../application/use-cases/list-orders.use-case';
import { ReceiveOrderUseCase } from '../application/use-cases/receive-order.use-case';
import { UpdateOrderUseCase } from '../application/use-cases/update-order.use-case';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { ReceiveOrderDto } from './dto/receive-order.dto';

const idempotencyKeyPipe = new ParseUUIDPipe({ version: '4' });

@Controller('orders')
export class OrdersController {
  constructor(
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    @Inject(CancelOrderUseCase)
    private readonly cancelOrderUseCase: CancelOrderUseCase,
    @Inject(CreateOrderUseCase)
    private readonly createOrderUseCase: CreateOrderUseCase,
    @Inject(GetOrderUseCase)
    private readonly getOrderUseCase: GetOrderUseCase,
    @Inject(ListOrdersUseCase)
    private readonly listOrdersUseCase: ListOrdersUseCase,
    @Inject(ReceiveOrderUseCase)
    private readonly receiveOrderUseCase: ReceiveOrderUseCase,
    @Inject(UpdateOrderUseCase)
    private readonly updateOrderUseCase: UpdateOrderUseCase,
  ) {}

  @Get()
  async list(
    @Query(
      new ValidationPipe({
        expectedType: ListOrdersQueryDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    query: ListOrdersQueryDto,
    @Req() request: RequestWithId,
  ) {
    const cookies = request.cookies as Record<string, string | undefined>;
    await this.getCurrentUserUseCase.execute({ token: cookies.session });
    const result = await this.listOrdersUseCase.execute(query);

    return { data: result.items, meta: result.meta };
  }

  @Get(':id')
  async getById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Req() request: RequestWithId,
  ) {
    const cookies = request.cookies as Record<string, string | undefined>;
    await this.getCurrentUserUseCase.execute({ token: cookies.session });

    return { data: await this.getOrderUseCase.execute(orderId) };
  }

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

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Body(
      new ValidationPipe({
        expectedType: CancelOrderDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: CancelOrderDto,
    @Req() request: RequestWithId,
  ) {
    const cookies = request.cookies as Record<string, string | undefined>;
    const actor = await this.getCurrentUserUseCase.execute({
      token: cookies.session,
    });
    const order = await this.cancelOrderUseCase.execute({
      actorId: actor.id,
      orderId,
      reason: input.reason,
      requestId: request.requestId,
    });

    return { data: order };
  }

  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  async receive(
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Body(
      new ValidationPipe({
        expectedType: ReceiveOrderDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: ReceiveOrderDto,
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
    const order = await this.receiveOrderUseCase.execute({
      actorId: actor.id,
      orderId,
      idempotencyKey,
      items: input.items,
      requestId: request.requestId,
    });

    return { data: order };
  }

  @Put(':id')
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
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
    const cookies = request.cookies as Record<string, string | undefined>;
    const actor = await this.getCurrentUserUseCase.execute({
      token: cookies.session,
    });
    const order = await this.updateOrderUseCase.execute({
      actorId: actor.id,
      orderId,
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
