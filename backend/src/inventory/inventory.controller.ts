import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { InventoryService } from "./inventory.service";
import { GetUser } from "../auth/decorators/get-user.decorator";

@Controller("inventory")
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) { }

  @Get("movements")
  async getMovements(
    @Query("page") page = "1",
    @Query("limit") limit = "10",
    @Query("search") search = "",
    @GetUser() user: any // Usamos el decorador para obtener el businessId seguro
  ) {
    return this.inventoryService.getMovements(
      user.businessId,
      Number(page),
      Number(limit),
      search
    );
  }

  @Post("restock/:productId")
  restock(
    @Param("productId") productId: string,
    @Body() body: { quantity: number; note?: string },
    @GetUser() user: any
  ) {
    return this.inventoryService.restockProduct(
      productId,
      body.quantity,
      user.id,
      user.businessId,
      body.note
    );
  }

  @Post("write-off/:productId")
  writeOff(
    @Param("productId") productId: string,
    @Body() body: { quantity: number; reason: string },
    @GetUser() user: any
  ) {
    return this.inventoryService.writeOffProduct(
      productId,
      body.quantity,
      user.id,
      user.businessId,
      body.reason
    );
  }
}