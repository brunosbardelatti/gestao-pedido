import { Module } from '@nestjs/common';

import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { BrandsModule } from './modules/brands/brands.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { HealthController } from './modules/health/health.controller';
import { ProductsModule } from './modules/products/products.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    BrandsModule,
    CategoriesModule,
    ProductsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
