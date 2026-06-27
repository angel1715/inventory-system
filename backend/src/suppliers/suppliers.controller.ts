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

import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { SubscriptionGuard } from "../subscription/subscription.guard";

@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller("suppliers")
export class SuppliersController {

  constructor(
    private readonly suppliersService: SuppliersService,
  ) { }

  // =========================
  // CREATE
  // =========================
  @Post()
  create(
    @Body() dto: CreateSupplierDto,
    @Req() req: any,
  ) {

    return this.suppliersService.create(
      dto,
      req.user.businessId,
    );
  }

  // =========================
  // FIND ALL
  // =========================
  @Get()
  findAll(
    @Req() req: any,
  ) {

    return this.suppliersService.findAll(
      req.user.businessId,
    );
  }

  // =========================
  // FIND ONE
  // =========================
  @Get(":id")
  findOne(
    @Param("id") id: string,
    @Req() req: any,
  ) {

    return this.suppliersService.findOne(
      id,
      req.user.businessId,
    );
  }

  // =========================
  // UPDATE
  // =========================
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: CreateSupplierDto,
    @Req() req: any,
  ) {

    return this.suppliersService.update(
      id,
      dto,
      req.user.businessId,
    );
  }

  // =========================
  // DELETE
  // =========================
  @Delete(":id")
  remove(
    @Param("id") id: string,
    @Req() req: any,
  ) {

    return this.suppliersService.remove(
      id,
      req.user.businessId,
    );
  }
}

