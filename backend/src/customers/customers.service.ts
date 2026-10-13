import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCustomerDto, RecordPaymentDto } from "./dto/customer.dto"; // Asegúrate de agregar UpdateCustomerDto si lo usas
import { CreditMovementType, PaymentMethod } from "@prisma/client";

const receiptInclude = {
    lines: true,
    customer: { select: { id: true, name: true, taxId: true, phone: true } },
    createdBy: { select: { name: true } },
} as const;

@Injectable()
export class CustomersService {
    constructor(private prisma: PrismaService) { }
    private round(num: number | any): number {
        return Math.round(Number(num) * 100) / 100;
    }

    
    // undefined = no tocar el campo; vacío o null = borrar el correo
    private normalizeEmail(email?: string | null): string | null | undefined {
        if (email === undefined) return undefined;
        const clean = email?.trim().toLowerCase();
        return clean ? clean : null;
    }

    // ==========================================
    // CREATE CUSTOMER + CREDIT ACCOUNT
    // ==========================================
        async create(dto: CreateCustomerDto, businessId: string, role?: string) {
        // Solo el dueño (o admin) autoriza crédito: lo que cree un empleado queda sin crédito
        const canGrantCredit = role === "OWNER" || role === "ADMIN";
        const maxCredit = canGrantCredit ? (dto.maxCredit ?? 0) : 0;
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
                    email: this.normalizeEmail(dto.email),
                    address: dto.address,
                    businessId,
                },
            });

            await tx.creditAccount.create({
                data: {
                    customerId: customer.id,
                    businessId,
                    maxCredit,
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
            email: customer.email,
            address: customer.address,
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
                    email: this.normalizeEmail(dto.email),
                    address: dto.address,
                },
            });

            // 2. Actualizar límite en la cuenta de crédito vinculada
                       // 2. Actualizar el límite solo si viene en la petición
            if (dto.maxCredit !== undefined) {
                await tx.creditAccount.upsert({
                    where: { customerId: id },
                    update: { maxCredit: dto.maxCredit },
                    create: {
                        customerId: id,
                        businessId,
                        maxCredit: dto.maxCredit,
                        currentDebt: 0,
                    },
                });
            }

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

            const account = await tx.creditAccount.findFirst({ where: { customerId, businessId } });
            if (!account) throw new NotFoundException("Cuenta de crédito no encontrada.");

            const amount = this.round(dto.amount);
            if (!(amount > 0)) throw new BadRequestException("El monto debe ser mayor a cero.");

            const debtBefore = Number(account.currentDebt);
            if (amount > debtBefore) {
                throw new BadRequestException(`El abono supera la deuda actual (RD$ ${debtBefore})`);
            }

            // 2. Facturas pendientes, de la más antigua a la más reciente
            const pendingARs = await tx.accountsReceivable.findMany({
                where: {
                    customerId,
                    status: { in: ["PENDING", "PARTIAL"] },
                    sale: { businessId },
                },
                include: { sale: { select: { invoiceNumber: true, ncf: true } } },
                orderBy: { createdAt: "asc" },
            });

            // 3. Aplicar el pago a cada factura, guardando qué se aplicó (para el recibo)
            let remainingPayment = amount;
            let totalPaid = 0;
            const lines: {
                saleId: string;
                invoiceNumber: string;
                ncf: string | null;
                amountApplied: number;
                pendingAfter: number;
            }[] = [];

            for (const ar of pendingARs) {
                if (remainingPayment <= 0) break;

                const pendingAmount = Number(ar.pendingAmount);
                const paymentForThisAR = this.round(Math.min(remainingPayment, pendingAmount));

                const newPaidAmount = this.round(Number(ar.paidAmount) + paymentForThisAR);
                const newPending = this.round(pendingAmount - paymentForThisAR);

                await tx.accountsReceivable.update({
                    where: { id: ar.id },
                    data: {
                        paidAmount: newPaidAmount,
                        pendingAmount: newPending,
                        status: newPending <= 0 ? "PAID" : "PARTIAL",
                    },
                });

                remainingPayment = this.round(remainingPayment - paymentForThisAR);
                totalPaid = this.round(totalPaid + paymentForThisAR);

                await tx.creditMovement.create({
                    data: {
                        creditAccountId: account.id,
                        type: "PAYMENT",
                        amount: paymentForThisAR,
                        saleId: ar.saleId,
                        currentDebtSnapshot: this.round(debtBefore - totalPaid),
                        note: dto.note ?? "Abono a cuenta",
                        cashSessionId: activeSession.id,
                    },
                });

                lines.push({
                    saleId: ar.saleId,
                    invoiceNumber: ar.sale.invoiceNumber,
                    ncf: ar.sale.ncf,
                    amountApplied: paymentForThisAR,
                    pendingAfter: newPending,
                });
            }

            if (totalPaid <= 0) {
                throw new BadRequestException("El cliente no tiene facturas pendientes por cobrar.");
            }

            // 4. Saldo final del cliente y movimiento de caja
            const newDebt = this.round(debtBefore - totalPaid);
            await tx.creditAccount.update({
                where: { id: account.id },
                data: { currentDebt: newDebt },
            });

            await tx.cashMovement.create({
                data: {
                    cashSessionId: activeSession.id,
                    type: "INCOME",
                    amount: totalPaid,
                    description: `Abono de deuda: ${dto.note ?? "Cliente"}`,
                    userId,
                },
            });

            // 5. Recibo de pago con número consecutivo por negocio (REC-000001)
            const last = await tx.paymentReceipt.findFirst({
                where: { businessId },
                orderBy: { createdAt: "desc" },
                select: { receiptNumber: true },
            });
            const nextNumber = (last ? parseInt(last.receiptNumber.replace(/\D/g, ""), 10) || 0 : 0) + 1;
            const receiptNumber = `REC-${String(nextNumber).padStart(6, "0")}`;

            const receipt = await tx.paymentReceipt.create({
                data: {
                    businessId,
                    customerId,
                    receiptNumber,
                    amount: totalPaid,
                    debtBefore,
                    debtAfter: newDebt,
                    note: dto.note,
                    cashSessionId: activeSession.id,
                    createdById: userId,
                    lines: { create: lines },
                },
                include: receiptInclude,
            });

            return { message: "Pago procesado con éxito", newDebt, receipt };
        }, { isolationLevel: "Serializable" });
    }

    // ==========================================
    // RECIBOS DE PAGO (historial y reimpresión)
    // ==========================================
    async listPaymentReceipts(businessId: string, customerId?: string) {
        return this.prisma.paymentReceipt.findMany({
            where: { businessId, ...(customerId ? { customerId } : {}) },
            include: receiptInclude,
            orderBy: { createdAt: "desc" },
            take: 200,
        });
    }

    async getPaymentReceipt(id: string, businessId: string) {
        const receipt = await this.prisma.paymentReceipt.findFirst({
            where: { id, businessId },
            include: receiptInclude,
        });

        if (!receipt) throw new NotFoundException("Recibo no encontrado.");
        return receipt;
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