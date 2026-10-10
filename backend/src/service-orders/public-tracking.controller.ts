import { Controller, Get, Param } from "@nestjs/common";
import { ServiceOrdersService } from "./service-orders.service";

// SIN guards: es público a propósito. Solo expone lo mínimo,
// ver findByTrackingToken() en el service.
@Controller("public/tracking")
export class PublicTrackingController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Get(":token")
  findOne(@Param("token") token: string) {
    return this.serviceOrdersService.findByTrackingToken(token);
  }
}