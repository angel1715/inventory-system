import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { NcfService } from './ncf.service';
import { CreateNcfSequenceDto } from './dto/create-ncf-sequence.dto';

@Controller('ncf')
// @UseGuards(JwtAuthGuard) // Descomenta cuando tengas tu guard de auth
export class NcfController {
    constructor(private readonly ncfService: NcfService) { }

    @Post('sequences')
    async createSequence(@Request() req, @Body() dto: CreateNcfSequenceDto) {
        // Asumimos que el businessId viene en el objeto request del usuario autenticado
        const businessId = req.user.businessId;
        return await this.ncfService.createSequence(businessId, dto);
    }

    @Get('sequences')
    async getSequences(@Request() req) {
        const businessId = req.user.businessId;
        return await this.ncfService.getSequences(businessId);
    }
}