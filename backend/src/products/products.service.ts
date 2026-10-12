import {
   Injectable,
   BadRequestException,
   NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, ProductCategory } from "@prisma/client";
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
   // HELPERS
   // ======================
   private async assertSupplier(supplierId: string, businessId: string) {
      const supplier = await this.prisma.supplier.findFirst({
         where: { id: supplierId, businessId },
         select: { id: true },
      });

      if (!supplier) {
         throw new BadRequestException("Proveedor no encontrado");
      }
   }

   // Un código de barras o SKU repetido sale como error claro, no como un 500
   private mapUniqueError(error: unknown): unknown {
      if (
         error instanceof Prisma.PrismaClientKnownRequestError &&
         error.code === "P2002"
      ) {
         return new BadRequestException(
            "Ya existe un producto con ese código de barras o SKU",
         );
      }
      return error;
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

      // Solo se valida si viene un código de barras. Con undefined, Prisma ignora
      // el filtro y el producto "chocaba" con cualquier otro del negocio.
      if (dto.barcode) {
         const exists = await this.prisma.product.findFirst({
            where: { barcode: dto.barcode, businessId },
         });

         if (exists) {
            throw new BadRequestException("Barcode already exists");
         }
      }

      const supplierId = (dto as { supplierId?: string }).supplierId;
      if (supplierId) {
         await this.assertSupplier(supplierId, businessId);
      }

      try {
         return await this.prisma.$transaction(
            async (tx) => {
               const product = await tx.product.create({
                  data: {
                     ...dto,
                     businessId,
                     sku: dto.sku || this.generateSKU(),
                     minStock: dto.minStock ?? 5,
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
      } catch (error) {
         throw this.mapUniqueError(error);
      }
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
      const current = await this.findOne(id, businessId);

      // Solo estos campos se pueden editar. Quedan fuera businessId, id, status,
      // fechas y cualquier otro: antes se pasaban tal cual a la base de datos.
      const data: Prisma.ProductUncheckedUpdateInput = {};

      const text = (value: unknown) => {
         const clean = String(value ?? "").trim();
         return clean === "" ? null : clean;
      };
      const bool = (value: unknown) => value === true || value === "true";

      if (dto.name !== undefined) {
         const name = String(dto.name).trim();
         if (!name) {
            throw new BadRequestException("El nombre no puede estar vacío");
         }
         data.name = name;
      }

      if (dto.description !== undefined) data.description = text(dto.description);
      if (dto.imageUrl !== undefined) data.imageUrl = text(dto.imageUrl);
      if (dto.lotNumber !== undefined) data.lotNumber = text(dto.lotNumber);

      if (dto.sku !== undefined) {
         const sku = text(dto.sku);
         if (sku) data.sku = sku; // un SKU vacío se ignora: se conserva el actual
      }

      if (dto.barcode !== undefined) {
         const barcode = text(dto.barcode);

         if (barcode) {
            const duplicated = await this.prisma.product.findFirst({
               where: { businessId, barcode, NOT: { id } },
               select: { id: true },
            });

            if (duplicated) {
               throw new BadRequestException("Barcode already exists");
            }
         }

         data.barcode = barcode;
      }

      for (const field of ["costPrice", "salePrice"] as const) {
         const raw = dto[field];
         if (raw !== undefined && raw !== null && raw !== "") {
            const value = Number(raw);
            if (!Number.isFinite(value) || value < 0) {
               throw new BadRequestException(
                  "Los precios deben ser números mayores o iguales a cero",
               );
            }
            data[field] = value;
         }
      }

      if (dto.minStock !== undefined && dto.minStock !== null && dto.minStock !== "") {
         const minStock = Number(dto.minStock);
         if (!Number.isInteger(minStock) || minStock < 0) {
            throw new BadRequestException(
               "El stock mínimo debe ser un entero mayor o igual a cero",
            );
         }
         data.minStock = minStock;
      }

      if (dto.category !== undefined) {
         if (!Object.values(ProductCategory).includes(dto.category)) {
            throw new BadRequestException("Categoría inválida");
         }
         data.category = dto.category;
      }

      if (dto.isSerialized !== undefined) data.isSerialized = bool(dto.isSerialized);
      if (dto.hasExpiry !== undefined) data.hasExpiry = bool(dto.hasExpiry);
      if (dto.active !== undefined) data.active = bool(dto.active);

      if (dto.expiryDate !== undefined) {
         if (!dto.expiryDate) {
            data.expiryDate = null;
         } else {
            const date = new Date(dto.expiryDate);
            if (isNaN(date.getTime())) {
               throw new BadRequestException("La fecha de vencimiento no es válida");
            }
            data.expiryDate = date;
         }
      }

      if (dto.supplierId !== undefined) {
         if (dto.supplierId) {
            await this.assertSupplier(dto.supplierId, businessId);
            data.supplierId = dto.supplierId;
         } else {
            data.supplierId = null;
         }
      }

      // Si el formulario trae un stock distinto, se aplica como AJUSTE con su
      // movimiento de inventario (antes cambiaba sin dejar rastro).
      let delta = 0;
      if (dto.stock !== undefined && dto.stock !== null && dto.stock !== "") {
         const newStock = Number(dto.stock);
         if (!Number.isInteger(newStock) || newStock < 0) {
            throw new BadRequestException(
               "El stock debe ser un entero mayor o igual a cero",
            );
         }
         delta = newStock - current.stock;
      }

      try {
         return await this.prisma.$transaction(async (tx) => {
            const updated = await tx.product.update({
               where: { id, businessId },
               data: {
                  ...data,
                  ...(delta !== 0 ? { stock: { increment: delta } } : {}),
               },
            });

            if (delta !== 0) {
               await tx.inventoryMovement.create({
                  data: {
                     businessId,
                     productId: id,
                     type: "ADJUSTMENT",
                     quantity: delta,
                     previousStock: updated.stock - delta,
                     newStock: updated.stock,
                     note: "Ajuste desde la edición del producto",
                  },
               });
            }

            return updated;
         });
      } catch (error) {
         throw this.mapUniqueError(error);
      }
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
      const qty = Number(quantity);

      if (!Number.isInteger(qty) || qty <= 0) {
         throw new BadRequestException("Quantity must be greater than zero");
      }

      // Validamos propiedad antes de operar
      await this.findOne(id, businessId);

      return this.prisma.$transaction(async (tx) => {
         // Incremento atómico; "status" vuelve a AVAILABLE porque ya hay existencia
         const updatedProduct = await tx.product.update({
            where: { id },
            data: {
               stock: { increment: qty },
               status: "AVAILABLE",
            },
         });

         // previousStock sale del resultado de la transacción, no de una lectura anterior
         await tx.inventoryMovement.create({
            data: {
               businessId,
               productId: id,
               type: "RESTOCK",
               quantity: qty,
               previousStock: updatedProduct.stock - qty,
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
               active: true,
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