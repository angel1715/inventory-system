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
import { ServiceOrdersService } from "./service-orders.service";
import { CreateServiceOrderDto } from "./dto/create-service-order.dto";
import { ChangeStatusDto } from "./dto/change-status.dto";
import { AssignTechnicianDto } from "./dto/assign-technician.dto";
import { AddServiceItemDto } from "./dto/add-service-item.dto";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { UpdateLaborCostDto } from "./dto/update-labor-cost.dto";
import { UpdateServiceOrderDto } from "./dto/update-service-order.dto";
import { SubscriptionGuard } from "../subscription/subscription.guard";
import { InvoiceServiceOrderDto } from "./dto/invoice-service-order.dto";

@Controller("service-orders")
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) { }

  @Post()
  async create(
    @Body() dto: CreateServiceOrderDto,
    @Req() req: any,
  ) {
    return this.serviceOrdersService.create(
      dto,
      req.user.businessId,
      req.user.id,
    );
  }

  @Get()
  findAll(@Req() req: any) {
    return this.serviceOrdersService.findAll(req.user.businessId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Req() req: any) {
    return this.serviceOrdersService.findOne(id, req.user.businessId);
  }

  @Patch(":id/assign")
  assignTechnician(
    @Param("id") id: string,
    @Body() dto: AssignTechnicianDto,
    @Req() req: any
  ) {
    return this.serviceOrdersService.assignTechnician(
      id,
      dto,
      req.user.businessId
    );
  }

  @Patch(":id/status")
  changeStatus(
    @Param("id") id: string,
    @Body() dto: ChangeStatusDto,
    @Req() req: any
  ) {
    return this.serviceOrdersService.changeStatus(
      id,
      dto,
      req.user.businessId,
      req.user.id
    );
  }

  @Post(":id/items")
  async addItem(
    @Param("id") id: string,
    @Body() dto: AddServiceItemDto,
    @Req() req: any
  ) {
    return this.serviceOrdersService.addItem(
      id,
      dto,
      req.user.businessId,
      req.user.id
    );
  }

  @Patch(":id/labor-cost")
  async updateLaborCost(
    @Param("id") id: string,
    @Body() dto: UpdateLaborCostDto,
    @Req() req: any
  ) {
    // AJUSTE: Pasamos req.user.id para la auditoría (log)
    return this.serviceOrdersService.updateLaborCost(
      id,
      req.user.businessId,
      dto.laborCost,
      req.user.id
    );
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateServiceOrderDto,
    @Req() req: any
  ) {
    // AJUSTE: Pasamos req.user.id para la auditoría (log)
    return this.serviceOrdersService.update(
      id,
      dto,
      req.user.businessId,
      req.user.id
    );
  }

  @Delete(":id/items/:itemId")
  async removeItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Req() req: any
  ) {
    return this.serviceOrdersService.removeItem(
      id,
      itemId,
      req.user.businessId,
      req.user.id
    );
  }


  @Post(":id/invoice")
  invoiceServiceOrder(
    @Param("id") id: string,
    @Req() req: any,
    @Body() dto: InvoiceServiceOrderDto,
  ) {
    return this.serviceOrdersService.invoiceServiceOrder(
      id,
      req.user.id,
      req.user.businessId,
      dto,
    );
  }



  @Patch(":id/delivered")
  deliverDevice(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    return this.serviceOrdersService.deliverDevice(
      id,
      req.user.id,
      req.user.businessId,
    );
  }
}