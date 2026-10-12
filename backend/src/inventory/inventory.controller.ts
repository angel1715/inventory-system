import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { InventoryService } from "./inventory.service";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { SubscriptionGuard } from "../subscription/subscription.guard";
import { RestockDto, WriteOffDto } from "./dto/inventory.dto";

// Movimientos, reabastecimiento y bajas de mercancía: solo el dueño
@Controller("inventory")
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@Roles("OWNER")
export class InventoryController {
  constructor(private inventoryService: InventoryService) { }

  @Get("movements")
  async getMovements(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query("search", new DefaultValuePipe("")) search: string,
    @GetUser() user: any,
  ) {
    return this.inventoryService.getMovements(
      user.businessId,
      Math.max(page, 1),
      Math.min(Math.max(limit, 1), 100), // tope de 100 filas por página
      search.slice(0, 100),
    );
  }

  @Post("restock/:productId")
  restock(
    @Param("productId") productId: string,
    @Body() dto: RestockDto,
    @GetUser() user: any,
  ) {
    return this.inventoryService.restockProduct(
      productId,
      dto.quantity,
      user.id,
      user.businessId,
      dto.note,
    );
  }

  @Post("write-off/:productId")
  writeOff(
    @Param("productId") productId: string,
    @Body() dto: WriteOffDto,
    @GetUser() user: any,
  ) {
    return this.inventoryService.writeOffProduct(
      productId,
      dto.quantity,
      user.id,
      user.businessId,
      dto.reason,
    );
  }
}