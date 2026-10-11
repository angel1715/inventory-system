const round2 = (n: number) => Math.round(n * 100) / 100;

export type DisplayItem = {
  raw: any;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  laborIncluded: boolean;
};

// Líneas de la factura tal como las ve el cliente.
// En una reparación, la mano de obra se suma a la primera pieza para mostrar
// un solo precio. En la base de datos la mano de obra sigue separada
// (serviceOrder.laborCost), así que los reportes de utilidad no cambian.
export function getDisplayItems(sale: any): DisplayItem[] {
  const source: any[] = Array.isArray(sale?.items)
    ? sale.items
    : Array.isArray(sale?.saleItems)
      ? sale.saleItems
      : Array.isArray(sale?.details)
        ? sale.details
        : [];

  const rows: DisplayItem[] = source.map((item) => {
    const quantity = Number(item.quantity ?? item.qty ?? 1);
    const unitPrice = Number(
      item.salePrice ?? item.price ?? item.unitPrice ?? 0,
    );
    const lineTotal = Number(
      item.lineTotal ?? item.total ?? quantity * unitPrice,
    );
    return { raw: item, quantity, unitPrice, lineTotal, laborIncluded: false };
  });

  const labor = Number(sale?.serviceOrder?.laborCost ?? 0);
  const itemsSum = rows.reduce((acc, row) => acc + row.lineTotal, 0);
  const total = Number(sale?.total ?? sale?.grandTotal ?? 0);

  // Solo se suma si la mano de obra no está ya incluida en las líneas
  if (
    labor > 0 &&
    rows.length > 0 &&
    Math.abs(itemsSum + labor - total) < 0.01
  ) {
    const first = rows[0];
    first.lineTotal = round2(first.lineTotal + labor);
    first.unitPrice = round2(first.lineTotal / (first.quantity || 1));
    first.laborIncluded = true;
  }

  return rows;
}