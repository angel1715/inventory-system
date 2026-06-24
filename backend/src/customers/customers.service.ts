import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCustomerDto, RecordPaymentDto } from "./dto/customer.dto"; // Asegúrate de agregar UpdateCustomerDto si lo usas
import { CreditMovementType, PaymentMethod } from "@prisma/client";

@Injectable()
export class CustomersService {
    constructor(private prisma: PrismaService) { }
    private round(num: number | any): number {
        return Math.round(Number(num) * 100) / 100;
    }

    // ==========================================
    // CREATE CUSTOMER + CREDIT ACCOUNT
    // ==========================================
    async create(dto: CreateCustomerDto, businessId: string) {
        if (dto.taxId) {
            const exists = await this.prisma.customer.findFirst({
                where: { businessId, taxId: dto.taxId },
            });
            if (exists) throw new BadRequestException("Ya existe un cliente con este RNC/Cédula.");
        }

        return this.prisma.$transaction(async (tx) => {
            const customer = await tx.customer.create({
                data: {
                    name: dto.name,
                    phone: dto.phone,
                    taxId: dto.taxId,
                    email: dto.email,
                    address: dto.address,
                    businessId,
                },
            });

            await tx.creditAccount.create({
                data: {
                    customerId: customer.id,
                    businessId,
                    maxCredit: dto.maxCredit ?? 0,
                    currentDebt: 0,
                },
            });

            return customer;
        });
    }

    // ==========================================
    // OBTENER TODOS LOS CLIENTES (MAPEADOS PARA EL FRONTEND)
    // ==========================================
    async findAll(businessId: string) {
        const customers = await this.prisma.customer.findMany({
            where: { businessId },
            include: { creditAccount: true },
            orderBy: { name: "asc" },
        });

        // Mapeamos para aplanar el maxCredit al nivel del objeto principal como lo espera el Frontend
        return customers.map((customer) => ({
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            taxId: customer.taxId,
            active: customer.active,
            createdAt: customer.createdAt,
            maxCredit: customer.creditAccount?.maxCredit ? Number(customer.creditAccount.maxCredit) : 0,
            currentDebt: customer.creditAccount?.currentDebt ? Number(customer.creditAccount.currentDebt) : 0,
        }));
    }

    // ==========================================
    // 🔥 NUEVO: ACTUALIZAR CLIENTE Y SU CRÉDITO MAX
    // ==========================================
    async update(id: string, dto: any, businessId: string) {
        // Validar existencia del cliente
        const customer = await this.prisma.customer.findFirst({
            where: { id, businessId },
        });
        if (!customer) throw new NotFoundException("Cliente no encontrado.");

        // Validar RNC si cambió
        if (dto.taxId && dto.taxId !== customer.taxId) {
            const exists = await this.prisma.customer.findFirst({
                where: { businessId, taxId: dto.taxId, NOT: { id } },
            });
            if (exists) throw new BadRequestException("El RNC/Cédula ya está asignado a otro cliente.");
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. Actualizar datos del cliente
            const updatedCustomer = await tx.customer.update({
                where: { id },
                data: {
                    name: dto.name,
                    phone: dto.phone,
                    taxId: dto.taxId,
                    email: dto.email,
                    address: dto.address,
                },
            });

            // 2. Actualizar límite en la cuenta de crédito vinculada
            await tx.creditAccount.update({
                where: { customerId: id },
                data: {
                    maxCredit: dto.maxCredit ?? 0,
                },
            });

            return updatedCustomer;
        });
    }

    // ==========================================
    // 🔥 NUEVO: CAMBIAR ESTADO (ENABLE / DISABLE)
    // ==========================================
    async toggleActive(id: string, businessId: string) {
        const customer = await this.prisma.customer.findFirst({
            where: { id, businessId },
        });
        if (!customer) throw new NotFoundException("Cliente no encontrado.");

        return this.prisma.customer.update({
            where: { id },
            data: {
                active: !customer.active,
            },
        });
    }


    // ==========================================
    // ==========================================
    // REGISTRAR ABONO / PAGO A LA DEUDA (SOLUCIÓN DEFINITIVA)
    // ==========================================
    // En CustomersService.ts

    async recordPayment(customerId: string, dto: RecordPaymentDto, businessId: string, userId: string) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Verificaciones iniciales
            const activeSession = await tx.cashSession.findFirst({ where: { businessId, status: "OPEN" } });
            if (!activeSession) throw new BadRequestException("Debe abrir la caja para registrar pagos.");

            const account = await tx.creditAccount.findUnique({ where: { customerId } });
            if (!account) throw new NotFoundException("Cuenta de crédito no encontrada.");

            // Validar que el monto sea lógico
            if (dto.amount <= 0) throw new BadRequestException("El monto debe ser mayor a cero.");
            if (dto.amount > Number(account.currentDebt)) {
                throw new BadRequestException(`El abono supera la deuda actual (RD$ ${account.currentDebt})`);
            }

            // 2. Obtener facturas pendientes (ordenadas por antigüedad)
            const pendingARs = await tx.accountsReceivable.findMany({
                where: { customerId, status: { in: ["PENDING", "PARTIAL"] } },
                orderBy: { createdAt: "asc" }
            });

            let remainingPayment = dto.amount;
            let totalPaid = 0;

            // 3. Aplicar pago a las facturas (Bucle de distribución)
            for (const ar of pendingARs) {
                if (remainingPayment <= 0) break;

                const pendingAmount = Number(ar.pendingAmount);
                const paymentForThisAR = Math.min(remainingPayment, pendingAmount);

                const newPaidAmount = this.round(Number(ar.paidAmount) + paymentForThisAR);
                const newPending = this.round(pendingAmount - paymentForThisAR);

                await tx.accountsReceivable.update({
                    where: { id: ar.id },
                    data: {
                        paidAmount: newPaidAmount,
                        pendingAmount: newPending,
                        status: newPending <= 0 ? "PAID" : "PARTIAL"
                    }
                });

                remainingPayment -= paymentForThisAR;
                totalPaid += paymentForThisAR;
            }

            // 4. Actualizar saldo final del cliente
            const newDebt = this.round(Number(account.currentDebt) - totalPaid);
            await tx.creditAccount.update({
                where: { id: account.id },
                data: { currentDebt: newDebt }
            });

            // 5. Registro de movimientos (Auditoría)
            await tx.creditMovement.create({
                data: {
                    creditAccountId: account.id,
                    type: "PAYMENT",
                    amount: totalPaid,
                    saleId: pendingARs[0]?.saleId, // Referencia a la primera factura afectada
                    currentDebtSnapshot: newDebt,
                    note: dto.note ?? "Abono a cuenta",
                    cashSessionId: activeSession.id,
                },
            });

            await tx.cashMovement.create({
                data: {
                    cashSessionId: activeSession.id,
                    type: "INCOME",
                    amount: totalPaid,
                    description: `Abono de deuda: ${dto.note ?? 'Cliente'}`,
                    userId: userId,
                },
            });

            return { message: "Pago procesado con éxito", newDebt };
        }, { isolationLevel: "Serializable" });
    }

    // ==========================================
    // OBTENER ESTADO DE CUENTA DEL CLIENTE
    // ==========================================
    async getAccountStatus(customerId: string, businessId: string) {
        const customer = await this.prisma.customer.findFirst({
            where: { id: customerId, businessId },
            include: {
                creditAccount: {
                    include: {
                        movements: {
                            orderBy: { createdAt: "desc" },
                            take: 20,
                        },
                    },
                },
            },
        });
        if (!customer) throw new NotFoundException("Cliente no encontrado.");
        return customer;
    }
}