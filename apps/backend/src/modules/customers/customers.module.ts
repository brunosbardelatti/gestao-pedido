import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { CreateCustomerPersistence } from './application/ports/create-customer-persistence';
import {
  CREATE_CUSTOMER_PERSISTENCE,
  GET_CUSTOMER_PERSISTENCE,
  UPDATE_CUSTOMER_PERSISTENCE,
} from './application/ports/customers.tokens';
import type { GetCustomerPersistence } from './application/ports/get-customer-persistence';
import type { UpdateCustomerPersistence } from './application/ports/update-customer-persistence';
import { CreateCustomerUseCase } from './application/use-cases/create-customer.use-case';
import { GetCustomerUseCase } from './application/use-cases/get-customer.use-case';
import { UpdateCustomerUseCase } from './application/use-cases/update-customer.use-case';
import { PrismaCreateCustomerPersistence } from './infrastructure/persistence/prisma-create-customer.persistence';
import { PrismaGetCustomerPersistence } from './infrastructure/persistence/prisma-get-customer.persistence';
import { PrismaUpdateCustomerPersistence } from './infrastructure/persistence/prisma-update-customer.persistence';
import { CustomersController } from './presentation/customers.controller';

@Module({
  imports: [AuthModule],
  controllers: [CustomersController],
  providers: [
    PrismaCreateCustomerPersistence,
    PrismaGetCustomerPersistence,
    PrismaUpdateCustomerPersistence,
    {
      provide: CREATE_CUSTOMER_PERSISTENCE,
      useExisting: PrismaCreateCustomerPersistence,
    },
    {
      provide: GET_CUSTOMER_PERSISTENCE,
      useExisting: PrismaGetCustomerPersistence,
    },
    {
      provide: UPDATE_CUSTOMER_PERSISTENCE,
      useExisting: PrismaUpdateCustomerPersistence,
    },
    {
      provide: CreateCustomerUseCase,
      inject: [CREATE_CUSTOMER_PERSISTENCE],
      useFactory: (persistence: CreateCustomerPersistence) =>
        new CreateCustomerUseCase(persistence),
    },
    {
      provide: GetCustomerUseCase,
      inject: [GET_CUSTOMER_PERSISTENCE],
      useFactory: (persistence: GetCustomerPersistence) =>
        new GetCustomerUseCase(persistence),
    },
    {
      provide: UpdateCustomerUseCase,
      inject: [UPDATE_CUSTOMER_PERSISTENCE],
      useFactory: (persistence: UpdateCustomerPersistence) =>
        new UpdateCustomerUseCase(persistence),
    },
  ],
})
export class CustomersModule {}
