import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BusinessSettings, Prisma, Sale } from "@prisma/client";
import { EcfConnectorService, EcfConnectorException, EcfSendItem } from "./ecf-connector.service";
import { generateAndConsumeNcf } from "../common/ncf.util";
import { CreateCreditNoteDto } from "./dto/create-credit-note.dto";

const round = (num: number | Prisma.Decimal): number => Math.round(Number(num) * 100) / 100;

type SaleWithRelations = Sale & {
    items: { quantity: number; salePrice: Prisma.Decimal; product: { name: string } | null }[];
    customer: { name: string; taxId: string | null } | null;
    accountsReceivable: { dueDate: Date } | null;
    ncfSequence: { expiryDate: Date } | null;
};

@Injectable()
export class EcfService {
    constructor(
        private prisma: PrismaService,
        private connector: EcfConnectorService,
    ) { }

    // ==========================================
    // CONFIGURACION / CREDENCIALES
    // ==========================================
    private async getCredentials(businessId: string, requireEnabled: boolean): Promise<BusinessSettings> {
        const settings = await this.prisma.businessSettings.findFirst({ where: { businessId } });
        if (!settings?.ecfApiKey || !settings.ecfBaseUrl) {
            throw new BadRequestException("Configura la URL y la API Key del conector e-CF antes de continuar.");
        }
        if (requireEnabled && !settings.ecfEnabled) {
            throw new BadRequestException("El conector e-CF no está habilitado para este negocio.");
        }
        return settings;
    }

    async testConnection(businessId: string) {
        const settings = await this.getCredentials(businessId, false);
        return this.connector.verify(settings.ecfBaseUrl!, settings.ecfApiKey!);
    }

    async getTaxes(businessId: string) {
        const settings = await this.getCredentials(businessId, false);
        return this.connector.listTaxes(settings.ecfBaseUrl!, settings.ecfApiKey!);
    }

    // ==========================================
    // FACTURAS DE VENTA (E31 / E32 / E45)
    // ==========================================
    private buildSaleItems(sale: SaleWithRelations, settings: BusinessSettings): EcfSendItem[] {
        const taxIds = settings.useItbis && settings.ecfTaxId ? [settings.ecfTaxId] : undefined;

        // SaleItem.salePrice ya es el precio SIN ITBIS: el POS calcula
        // subtotal = Σ(salePrice × cantidad) y luego SUMA el impuesto encima
        // (frontend/app/pos/page.tsx), nunca lo extrae de un precio con
        // impuesto incluido. No hay que volver a dividir aquí.
        return sale.items.map((item) => ({
            name: item.product?.name ?? "Producto",
            quantity: item.quantity,
            price_unit: round(Number(item.salePrice)),
            tax_ids: taxIds,
            discount: 0,
        }));
    }

    // invoice_date_due no es una "fecha de pago": el conector lo mapea al
    // FechaVencimientoSecuencia del XML del e-CF, es decir, la fecha de
    // vencimiento autorizada de la secuencia NCF (la que se configura en
    // Settings), no la fecha de la venta ni de una cuenta por cobrar.
    private resolveInvoiceDateDue(sale: SaleWithRelations): string {
        const date = sale.ncfSequence?.expiryDate ?? sale.accountsReceivable?.dueDate ?? sale.createdAt;
        return new Date(date).toISOString().split("T")[0];
    }

    async sendSaleInvoice(businessId: string, saleId: string) {
        const settings = await this.getCredentials(businessId, true);

        const sale = await this.prisma.sale.findFirst({
            where: { id: saleId, businessId },
            include: {
                items: { include: { product: { select: { name: true } } } },
                customer: { select: { name: true, taxId: true } },
                accountsReceivable: { select: { dueDate: true } },
                ncfSequence: { select: { expiryDate: true } },
            },
        });
        if (!sale) throw new NotFoundException("Venta no encontrada.");
        if (!sale.ncf) throw new BadRequestException("Esta venta no tiene un NCF electrónico asignado.");

        // Idempotencia: ya fue aceptada por DGII, no reenviar.
        if (sale.ecfInvoiceId && sale.ecfStatus === "success") {
            return sale;
        }

        const payload = {
            ncf: sale.ncf,
            invoice_date_due: this.resolveInvoiceDateDue(sale),
            invoice_date: sale.createdAt.toISOString().split("T")[0],
            client_name: sale.customer?.name ?? "Consumidor Final",
            client_vat: sale.customer?.taxId ?? undefined,
            income_type: "01",
            items: this.buildSaleItems(sale, settings),
        };

        try {
            const result = await this.connector.send(settings.ecfBaseUrl!, settings.ecfApiKey!, payload);
            return await this.prisma.sale.update({
                where: { id: sale.id },
                data: {
                    ecfStatus: result.ecf_status,
                    ecfInvoiceId: result.invoice_id,
                    ecfQrLink: result.qr_link,
                    ecfMessage: null,
                },
            });
        } catch (err) {
            const message = err instanceof EcfConnectorException ? err.message : "Error desconocido al enviar la factura a DGII.";
            await this.prisma.sale.update({ where: { id: sale.id }, data: { ecfStatus: "failure", ecfMessage: message } });
            throw err instanceof EcfConnectorException ? err : new InternalServerErrorException(message);
        }
    }

    async refreshSaleStatus(businessId: string, saleId: string, live: boolean) {
        const settings = await this.getCredentials(businessId, true);

        const sale = await this.prisma.sale.findFirst({ where: { id: saleId, businessId } });
        if (!sale) throw new NotFoundException("Venta no encontrada.");
        if (!sale.ecfInvoiceId) throw new BadRequestException("Esta venta aún no ha sido enviada al conector e-CF.");

        const result = live
            ? await this.connector.getStatusNow(settings.ecfBaseUrl!, settings.ecfApiKey!, sale.ecfInvoiceId)
            : await this.connector.getStatus(settings.ecfBaseUrl!, settings.ecfApiKey!, sale.ecfInvoiceId);

        return this.prisma.sale.update({
            where: { id: sale.id },
            data: { ecfStatus: result.ecf_status, ecfMessage: result.message_dgii ?? null },
        });
    }

    // ==========================================
    // NOTAS DE CREDITO (E34)
    // ==========================================
    async issueCreditNote(businessId: string, saleId: string, dto: CreateCreditNoteDto, userId?: string) {
        const settings = await this.getCredentials(businessId, true);

        const sale = await this.prisma.sale.findFirst({ where: { id: saleId, businessId } });
        if (!sale) throw new NotFoundException("Venta no encontrada.");
        if (!sale.ncf) throw new BadRequestException("La venta original no tiene NCF electrónico; no se puede generar una nota de crédito.");

        const baseAmount = round(dto.baseAmount ?? Number(sale.total));
        const taxIds = settings.useItbis && settings.ecfTaxId ? [settings.ecfTaxId] : undefined;

        const { creditNote, expiryDate } = await this.prisma.$transaction(async (tx) => {
            const generated = await generateAndConsumeNcf(tx, businessId, "E34");
            const created = await tx.creditNote.create({
                data: {
                    businessId,
                    saleId: sale.id,
                    ncf: generated.ncf,
                    ncfType: "E34",
                    ncfSequenceId: generated.ncfSequenceId,
                    modificationCode: dto.modificationCode,
                    baseAmount,
                    totalAmount: baseAmount,
                    reason: dto.reason,
                    createdById: userId,
                },
            });
            return { creditNote: created, expiryDate: generated.expiryDate };
        });

        try {
            const result = await this.connector.send(settings.ecfBaseUrl!, settings.ecfApiKey!, {
                ncf: creditNote.ncf,
                invoice_date_due: new Date(expiryDate).toISOString().split("T")[0],
                ncf_modificate: sale.ncf,
                modification_code: dto.modificationCode,
                base_amount: baseAmount,
                tax_ids: taxIds,
            });
            return await this.prisma.creditNote.update({
                where: { id: creditNote.id },
                data: {
                    ecfStatus: result.ecf_status,
                    ecfInvoiceId: result.invoice_id,
                    ecfQrLink: result.qr_link,
                    ecfMessage: null,
                },
            });
        } catch (err) {
            const message = err instanceof EcfConnectorException ? err.message : "Error desconocido al enviar la nota de crédito a DGII.";
            await this.prisma.creditNote.update({ where: { id: creditNote.id }, data: { ecfStatus: "failure", ecfMessage: message } });
            throw err instanceof EcfConnectorException ? err : new InternalServerErrorException(message);
        }
    }
}
