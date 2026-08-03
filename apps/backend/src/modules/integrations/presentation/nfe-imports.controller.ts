import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  ValidationPipe,
} from '@nestjs/common';

import type { RequestWithId } from '../../../common/http/request-with-id';
import { GetCurrentUserUseCase } from '../../auth/application/use-cases/get-current-user.use-case';
import { IdempotencyKeyRequiredError } from '../domain/errors/idempotency-key-required.error';
import { ApproveImportedOrderUseCase } from '../application/use-cases/approve-imported-order.use-case';
import { ImportNfeUseCase } from '../application/use-cases/import-nfe.use-case';
import { RejectImportedOrderUseCase } from '../application/use-cases/reject-imported-order.use-case';
import { ApproveImportedOrderDto } from './dto/approve-imported-order.dto';
import { ImportNfeDto } from './dto/import-nfe.dto';
import { RejectImportedOrderDto } from './dto/reject-imported-order.dto';

@Controller('integrations')
export class NfeImportsController {
  constructor(
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    @Inject(ImportNfeUseCase)
    private readonly importNfeUseCase: ImportNfeUseCase,
    @Inject(ApproveImportedOrderUseCase)
    private readonly approveImportedOrderUseCase: ApproveImportedOrderUseCase,
    @Inject(RejectImportedOrderUseCase)
    private readonly rejectImportedOrderUseCase: RejectImportedOrderUseCase,
  ) {}

  @Post('nfe-xml')
  async importNfe(
    @Body(
      new ValidationPipe({
        expectedType: ImportNfeDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: ImportNfeDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @Req() request: RequestWithId,
  ) {
    const cookies = request.cookies as Record<string, string | undefined>;
    const user = await this.getCurrentUserUseCase.execute({
      token: cookies.session,
    apiKey: request.get('x-api-key'),
    });

    if (!idempotencyKey) {
      throw new IdempotencyKeyRequiredError();
    }

    const result = await this.importNfeUseCase.execute({
      xml: input.xml,
      idempotencyKey,
      userId: user.id,
      requestId: request.requestId,
    });

    return { data: result };
  }

  @Post('imported-orders/:id/approve')
  @HttpCode(200)
  async approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(
      new ValidationPipe({
        expectedType: ApproveImportedOrderDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: ApproveImportedOrderDto,
    @Req() request: RequestWithId,
  ) {
    const cookies = request.cookies as Record<string, string | undefined>;
    const user = await this.getCurrentUserUseCase.execute({
      token: cookies.session,
    apiKey: request.get('x-api-key'),
    });

    const result = await this.approveImportedOrderUseCase.execute({
      importedOrderId: id,
      userId: user.id,
      brandId: input.brandId,
      cycle: input.cycle,
      orderDate: input.orderDate,
      notes: input.notes,
      items: input.items,
      requestId: request.requestId,
    });

    return { data: result };
  }

  @Post('imported-orders/:id/reject')
  @HttpCode(204)
  async reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(
      new ValidationPipe({
        expectedType: RejectImportedOrderDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: RejectImportedOrderDto,
    @Req() request: RequestWithId,
  ) {
    const cookies = request.cookies as Record<string, string | undefined>;
    const user = await this.getCurrentUserUseCase.execute({
      token: cookies.session,
      apiKey: request.get('x-api-key'),
    });

    await this.rejectImportedOrderUseCase.execute({
      importedOrderId: id,
      userId: user.id,
      reason: input.reason,
      requestId: request.requestId,
    });
  }
}
