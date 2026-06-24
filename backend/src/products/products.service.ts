import {
   Injectable,
   BadRequestException,
   NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { CreateProductDto } from "./dto/create-product.dto";

@Injectable()
export class ProductsService {
   constructor(
      private prisma: PrismaService,
   ) { }

   // ======================
   // SKU GENERATOR
   // ======================
   private generateSKU() {
      return "SKU-" + Date.now();
   }

   // ======================
   // CREATE PRODUCT
   // ======================
   async create(
      dto: CreateProductDto,
      businessId: string,
   ) {
      if (dto.stock < 0) {
         throw new BadRequestException("Stock cannot be negative");
      }

      const exists = await this.prisma.product.findFirst({
         where: {
            barcode: dto.barcode,
            businessId,
         },
      });

      if (exists) {
         throw new BadRequestException("Barcode already exists");
      }

      return this.prisma.$transaction(
         async (tx) => {
            const product = await tx.product.create({
               data: {
                  ...dto,
                  businessId,
                  sku: dto.sku || this.generateSKU(),
                  minStock: dto.minStock ?? 5,
                  // La categoría se incluye automáticamente mediante el spread del dto
               },
            });

            await tx.inventoryMovement.create({
               data: {
                  businessId,
                  productId: product.id,
                  type: "RESTOCK",
                  quantity: dto.stock,
                  previousStock: 0,
                  newStock: dto.stock,
                  note: "Initial stock load",
               },
            });

            return product;
         },
      );
   }


   // ======================
   // GET ALL
   // ======================
   async findAll(businessId: string) {
      return this.prisma.product.findMany({
         where: { businessId },
         orderBy: { createdAt: "desc" },
      });
   }

   // ======================
   // GET ONE
   // ======================
   async findOne(id: string, businessId: string) {
      const product = await this.prisma.product.findFirst({
         where: { id, businessId },
      });

      if (!product) {
         throw new NotFoundException("Product not found");
      }

      return product;
   }

   // ======================
   // UPDATE PRODUCT
   // ======================
   async update(id: string, dto: any, businessId: string) {
      // 1. Validamos primero que el producto exista Y pertenezca al negocio
      await this.findOne(id, businessId);

      // 2. Extraemos los campos, incluyendo la nueva 'category'
      const { isSerialized, hasExpiry, active, costPrice, salePrice, category, ...restOfData } = dto;

      // Creamos el objeto de datos formateado
      const updateData: any = {
         ...restOfData,
      };

      // 3. Normalización de valores
      if (isSerialized !== undefined) updateData.isSerialized = Boolean(isSerialized);
      if (hasExpiry !== undefined) updateData.hasExpiry = Boolean(hasExpiry);
      if (active !== undefined) updateData.active = Boolean(active);
      if (category !== undefined) updateData.category = category; // Integración de categoría

      // Asignación directa de precios
      if (costPrice !== undefined) updateData.costPrice = costPrice;
      if (salePrice !== undefined) updateData.salePrice = salePrice;

      // 4. Actualizamos asegurando el contexto del negocio
      return this.prisma.product.update({
         where: {
            id,
            businessId,
         },
         data: updateData,
      });
   }

   // ======================
   // FIND BY BARCODE
   // ======================
   async findByBarcode(barcode: string, businessId: string) {
      const product = await this.prisma.product.findFirst({
         where: { barcode, businessId },
      });

      if (!product) {
         throw new NotFoundException("Product not found");
      }

      return product;
   }

   // ======================
   // SEARCH (POS)
   // ======================
   async search(search: string, businessId: string) {
      return this.prisma.product.findMany({
         where: {
            businessId,
            active: true,
            OR: [
               {
                  name: {
                     contains: search,
                     mode: Prisma.QueryMode.insensitive,
                  },
               },
               { barcode: { contains: search } },
               { sku: { contains: search } },
            ],
         },
         include: { supplier: true },
         take: 20,
         orderBy: { name: "asc" },
      });
   }

   // ======================
   // UPDATE STOCK (SAFE AGAINST RACE CONDITIONS)
   // ======================
   async updateStock(
      id: string,
      quantity: number,
      businessId: string,
      note?: string,
   ) {
      if (quantity <= 0) {
         throw new BadRequestException("Quantity must be greater than zero");
      }

      // Validamos propiedad antes de operar
      const currentProduct = await this.findOne(id, businessId);
      const previousStock = currentProduct.stock;

      return this.prisma.$transaction(async (tx) => {
         // Usamos incremento atómico de base de datos para evitar Race Conditions
         const updatedProduct = await tx.product.update({
            where: { id },
            data: {
               stock: {
                  increment: quantity
               }
            }
         });

         // Registramos el movimiento histórico de inventario
         await tx.inventoryMovement.create({
            data: {
               businessId,
               productId: id,
               type: "RESTOCK",
               quantity: quantity,
               previousStock,
               newStock: updatedProduct.stock,
               note: note || "Manual stock replenishment",
            },
         });

         return updatedProduct;
      });
   }

   // ======================
   // TOGGLE ACTIVE (SAFE)
   // ======================
   async toggleActive(id: string, businessId: string) {
      const product = await this.findOne(id, businessId);

      return this.prisma.product.update({
         where: { id },
         data: {
            active: !product.active,
         },
      });
   }

   // ======================
   // LOW STOCK PRODUCTS
   // ======================
   async getLowStockProducts(businessId: string) {
      const products = await this.prisma.product.findMany({
         where: {
            businessId,
            active: true,
         },
         orderBy: { stock: "asc" },
      });

      return products.filter(p => p.stock <= p.minStock);
   }

   // ======================
   // PURCHASE RECOMMENDATIONS
   // ======================
   async getPurchaseRecommendations(businessId: string) {
      const products = await this.prisma.product.findMany({
         where: {
            businessId,
            active: true,
         },
      });

      return products
         .filter(product => product.stock <= product.minStock)
         .map((product) => {
            const suggestedQuantity = Math.max(
               (product.minStock * 2) - product.stock,
               1,
            );

            return {
               id: product.id,
               name: product.name,
               stock: product.stock,
               minStock: product.minStock,
               costPrice: product.costPrice,
               suggestedQuantity,
            };
         });
   }

   // ======================
   // GENERATE AUTO PURCHASES
   // ======================
   async generateAutoPurchases(businessId: string) {
      const products = await this.prisma.product.findMany({
         where: {
            businessId,
            active: true,
         },
         include: { supplier: true },
      });

      const lowStock = products.filter(p => p.stock <= p.minStock);
      const grouped = new Map<string, any[]>();

      for (const product of lowStock) {
         const supplierId = product.supplierId;
         if (!supplierId) continue;

         if (!grouped.has(supplierId)) {
            grouped.set(supplierId, []);
         }

         grouped.get(supplierId)!.push({
            productId: product.id,
            name: product.name,
            costPrice: product.costPrice,
            quantity: Math.max(
               product.minStock * 2 - product.stock,
               1,
            ),
         });
      }

      return Array.from(grouped.entries()).map(
         ([supplierId, items]) => ({
            supplierId,
            items,
            total: items.reduce(
               (acc, item) => acc + item.quantity * Number(item.costPrice),
               0,
            ),
         }),
      );
   }

   // ==========================================
   // LÓGICA DE SERIALES / IMEIS (CORREGIDO PARA ITEMSERIAL)
   // ==========================================

   // ProductosService.ts - Método optimizado
   async getAvailableSerialsByProduct(productId: string, businessId: string): Promise<string[]> {
      // 1. Validar existencia del producto en el negocio
      const product = await this.prisma.product.findFirst({
         where: { id: productId, businessId },
      });

      if (!product) {
         throw new NotFoundException("Producto no encontrado.");
      }

      // 2. Si el producto NO es serializado, no deberías pedir IMEIs.
      // Esto evita que un usuario intente buscar IMEIs de un producto que no los requiere.
      if (!product.isSerialized) {
         return [];
      }

      // 3. Consulta estricta filtrando solo los disponibles
      const serialsData = await this.prisma.itemSerial.findMany({
         where: {
            productId: productId,
            isSold: false, // <--- Este es el filtro que garantiza que solo veas lo que NO se ha vendido
         },
         select: {
            serial: true,
         },
      });

      return serialsData.map((item) => item.serial);
   }

   async getSingleAvailableSerial(serial: string, businessId: string) {
      // Buscamos el IMEI en la tabla 'itemSerial' validando que no esté vendido
      // y que su producto padre pertenezca al 'businessId' logueado
      const serialRecord = await this.prisma.itemSerial.findFirst({
         where: {
            serial: serial,
            isSold: false,
            product: {
               businessId: businessId,
            },
         },
         include: {
            product: true, // Inyectamos la data completa del producto (precio, costo, stock, etc.)
         },
      });

      if (!serialRecord) {
         throw new NotFoundException("El IMEI/Serial no está disponible o ya fue vendido");
      }

      // Estructura exacta que maneja tu barra de búsqueda en el POS
      return {
         product: serialRecord.product,
         serialString: serialRecord.serial,
      };
   }
}