import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { ApiKeyHashService } from './application/ports/api-key-hash.service';
import type { ApproveImportedOrderPersistence } from './application/ports/approve-imported-order-persistence';
import type { CreateApiKeyPersistence } from './application/ports/create-api-key-persistence';
import type { ImportNfePersistence } from './application/ports/import-nfe-persistence';
import {
  API_KEY_HASH_SERVICE,
  APPROVE_IMPORTED_ORDER_PERSISTENCE,
  CREATE_API_KEY_PERSISTENCE,
  IMPORT_NFE_PERSISTENCE,
  LIST_API_KEYS_PERSISTENCE,
  REVOKE_API_KEY_PERSISTENCE,
} from './application/ports/integrations.tokens';
import type { ListApiKeysPersistence } from './application/ports/list-api-keys-persistence';
import type { RevokeApiKeyPersistence } from './application/ports/revoke-api-key-persistence';
import { ApproveImportedOrderUseCase } from './application/use-cases/approve-imported-order.use-case';
import { CreateApiKeyUseCase } from './application/use-cases/create-api-key.use-case';
import { ImportNfeUseCase } from './application/use-cases/import-nfe.use-case';
import { ListApiKeysUseCase } from './application/use-cases/list-api-keys.use-case';
import { RevokeApiKeyUseCase } from './application/use-cases/revoke-api-key.use-case';
import { CryptoApiKeyHashService } from './infrastructure/cryptography/crypto-api-key-hash.service';
import { PrismaApproveImportedOrderPersistence } from './infrastructure/persistence/prisma-approve-imported-order.persistence';
import { PrismaCreateApiKeyPersistence } from './infrastructure/persistence/prisma-create-api-key.persistence';
import { PrismaImportNfePersistence } from './infrastructure/persistence/prisma-import-nfe.persistence';
import { PrismaListApiKeysPersistence } from './infrastructure/persistence/prisma-list-api-keys.persistence';
import { PrismaRevokeApiKeyPersistence } from './infrastructure/persistence/prisma-revoke-api-key.persistence';
import { ApiKeysController } from './presentation/api-keys.controller';
import { NfeImportsController } from './presentation/nfe-imports.controller';

@Module({
  imports: [AuthModule],
  controllers: [ApiKeysController, NfeImportsController],
  providers: [
    CryptoApiKeyHashService,
    PrismaCreateApiKeyPersistence,
    PrismaRevokeApiKeyPersistence,
    PrismaListApiKeysPersistence,
    PrismaImportNfePersistence,
    PrismaApproveImportedOrderPersistence,
    {
      provide: API_KEY_HASH_SERVICE,
      useExisting: CryptoApiKeyHashService,
    },
    {
      provide: CREATE_API_KEY_PERSISTENCE,
      useExisting: PrismaCreateApiKeyPersistence,
    },
    {
      provide: REVOKE_API_KEY_PERSISTENCE,
      useExisting: PrismaRevokeApiKeyPersistence,
    },
    {
      provide: LIST_API_KEYS_PERSISTENCE,
      useExisting: PrismaListApiKeysPersistence,
    },
    {
      provide: IMPORT_NFE_PERSISTENCE,
      useExisting: PrismaImportNfePersistence,
    },
    {
      provide: APPROVE_IMPORTED_ORDER_PERSISTENCE,
      useExisting: PrismaApproveImportedOrderPersistence,
    },
    {
      provide: CreateApiKeyUseCase,
      inject: [API_KEY_HASH_SERVICE, CREATE_API_KEY_PERSISTENCE],
      useFactory: (
        hashService: ApiKeyHashService,
        persistence: CreateApiKeyPersistence,
      ) => new CreateApiKeyUseCase(hashService, persistence),
    },
    {
      provide: RevokeApiKeyUseCase,
      inject: [REVOKE_API_KEY_PERSISTENCE],
      useFactory: (persistence: RevokeApiKeyPersistence) =>
        new RevokeApiKeyUseCase(persistence),
    },
    {
      provide: ListApiKeysUseCase,
      inject: [LIST_API_KEYS_PERSISTENCE],
      useFactory: (persistence: ListApiKeysPersistence) =>
        new ListApiKeysUseCase(persistence),
    },
    {
      provide: ImportNfeUseCase,
      inject: [IMPORT_NFE_PERSISTENCE],
      useFactory: (persistence: ImportNfePersistence) =>
        new ImportNfeUseCase(persistence),
    },
    {
      provide: ApproveImportedOrderUseCase,
      inject: [APPROVE_IMPORTED_ORDER_PERSISTENCE],
      useFactory: (persistence: ApproveImportedOrderPersistence) =>
        new ApproveImportedOrderUseCase(persistence),
    },
  ],
})
export class IntegrationsModule {}
