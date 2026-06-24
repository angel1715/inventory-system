import { Module } from "@nestjs/common";

import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "./prisma/prisma.module";

import { AuthModule } from "./auth/auth.module";

import { UsersModule } from "./users/users.module";

import { ProductsModule } from "./products/products.module";

import { SalesModule } from "./sales/sales.module";

import { CashModule } from "./cash/cash.module";

import { InventoryModule } from "./inventory/inventory.module";

import { SettingsModule } from "./settings/settings.module";

import { UploadModule } from "./upload/upload.module";
import { SuppliersModule } from "./suppliers/suppliers.module";

import { PurchasesModule } from "./purchases/purchases.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { AuditModule } from './audit/audit.module';
import { ReportsModule } from './reports/reports.module';
import { CustomersModule } from './customers/customers.module';
import { ImeiTrackerModule } from './imei-tracker/imei-tracker.module';
import { ServiceOrdersModule } from "./service-orders/service-orders.module";
import { NcfModule } from './ncf/ncf.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
@Module({
  imports: [
    // =========================
    // ENV CONFIG
    // =========================

    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 60000, // 1 minuto
      limit: 100,  // máximo 10 peticiones por minuto por IP
    }]),

    // =========================
    // APP MODULES
    // =========================

    PrismaModule,

    AuthModule,

    UsersModule,

    ProductsModule,

    SalesModule,

    CashModule,

    InventoryModule,

    SettingsModule,

    UploadModule,

    SuppliersModule,

    PurchasesModule,

    ExpensesModule,

    AuditModule,

    ReportsModule,

    CustomersModule,

    ImeiTrackerModule,

    ServiceOrdersModule,

    NcfModule,

    SubscriptionModule,
  ],

  controllers: [],

  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Esto blinda absolutamente todo el backend
    },
  ],
})
export class AppModule { }