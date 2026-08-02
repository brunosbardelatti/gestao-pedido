import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { CreateCustomerPersistence } from './application/ports/create-customer-persistence';
import { CREATE_CUSTOMER_PERSISTENCE } from './application/ports/customers.tokens';
import { CreateCustomerUseCase } from './application/use-cases/create-customer.use-case';
import { PrismaCreateCustomerPersistence } from './infrastructure/persistence/prisma-create-customer.persistence';
import { CustomersController } from './presentation/customers.controller';

@Module({
  imports: [AuthModule],
  controllers: [CustomersController],
  providers: [
    PrismaCreateCustomerPersistence,
    {
      provide: CREATE_CUSTOMER_PERSISTENCE,
      useExisting: PrismaCreateCustomerPersistence,
    },
    {
      provide: CreateCustomerUseCase,
      inject: [CREATE_CUSTOMER_PERSISTENCE],
      useFactory: (persistence: CreateCustomerPersistence) =>
        new CreateCustomerUseCase(persistence),
    },
  ],
})
export class CustomersModule {}
