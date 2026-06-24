import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { PrismaModule } from '../prisma/prisma.module';
@Module({
  imports: [
    PrismaModule, // 🔥 Agrégalo aquí para que CustomersService pueda usar Prisma
  ],
  providers: [CustomersService],
  controllers: [CustomersController],

})
export class CustomersModule { }
