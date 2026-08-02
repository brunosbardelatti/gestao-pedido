import { Module } from '@nestjs/common';

import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { BrandsModule } from './modules/brands/brands.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [PrismaModule, AuthModule, BrandsModule],
  controllers: [HealthController],
})
export class AppModule {}
