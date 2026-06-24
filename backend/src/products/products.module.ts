import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  providers: [ProductsService],
  imports: [PrismaModule],
  controllers: [ProductsController]
})
export class ProductsModule { }
