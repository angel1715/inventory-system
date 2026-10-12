import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { SuppliersService } from "./suppliers.service";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { SubscriptionGuard } from "../subscription/subscription.guard";

// Proveedores: solo el dueño
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@Roles("OWNER")
@Controller("suppliers")
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) { }

  @Post()
  create(@Body() dto: CreateSupplierDto, @Req() req: any) {
    return this.suppliersService.create(dto, req.user.businessId);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.suppliersService.findAll(req.user.businessId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Req() req: any) {
    return this.suppliersService.findOne(id, req.user.businessId);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: CreateSupplierDto, @Req() req: any) {
    return this.suppliersService.update(id, dto, req.user.businessId);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: any) {
    return this.suppliersService.remove(id, req.user.businessId);
  }
}