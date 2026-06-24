import { Module } from '@nestjs/common';
import { NcfService } from './ncf.service';
import { NcfController } from './ncf.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Asegúrate de importar el módulo de Prisma

@Module({
    imports: [PrismaModule],
    controllers: [NcfController],
    providers: [NcfService],
    exports: [NcfService] // Lo exportamos por si el SalesService lo necesita luego
})
export class NcfModule { }