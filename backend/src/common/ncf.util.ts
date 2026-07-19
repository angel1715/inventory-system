import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

/**
 * Generates the next NCF (Comprobante Fiscal) string from an active sequence and
 * increments its counter. Shared by SalesService (sale invoices) and EcfService
 * (credit notes), since both consume from the same NcfSequence pool.
 *
 * Sequential digit count depends on the series: legacy paper NCF (B-series) uses
 * 8 digits (e.g. B0100000001, 11 chars total); electronic e-CF (E-series) per
 * DGII's eNCF spec is exactly 13 chars total: 1 letter + 2-digit doc type + 10-digit
 * sequence (e.g. E320000000001). DGII rejects the whole invoice ("actual length is
 * greater than the MaxLength value") if this is off by even one digit.
 */
export interface GeneratedNcf {
    ncf: string;
    ncfSequenceId: string;
    expiryDate: Date;
}

export async function generateAndConsumeNcf(
    tx: Prisma.TransactionClient,
    businessId: string,
    ncfType: string,
): Promise<GeneratedNcf> {
    const sequence = await tx.ncfSequence.findFirst({ where: { businessId, type: ncfType, active: true } });
    if (!sequence) throw new BadRequestException(`No hay secuencia fiscal para: ${ncfType}`);
    if (new Date() > new Date(sequence.expiryDate)) throw new BadRequestException("Rango fiscal vencido.");
    if (sequence.current > sequence.endAt) throw new BadRequestException("Rango fiscal agotado.");

    const seqLength = sequence.type.startsWith("E") ? 10 : 8;
    const ncf = `${sequence.prefix}${sequence.type.replace(sequence.prefix, "")}${String(sequence.current).padStart(seqLength, "0")}`;
    await tx.ncfSequence.update({ where: { id: sequence.id }, data: { current: { increment: 1 } } });
    return { ncf, ncfSequenceId: sequence.id, expiryDate: sequence.expiryDate };
}
