"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useSettings } from "@/hooks/useSettings";

export default function Receipt({ sale }: any) {
  const { settings } = useSettings();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const ecfQrLink = sale?.ecfQrLink;

  useEffect(() => {
    if (!ecfQrLink) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(ecfQrLink, { width: 160, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [ecfQrLink]);

  if (!sale) return null;

  const formatMoney = (value: any) =>
    `RD$${Number(value ?? 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })}`;

  const items = Array.isArray(sale?.items)
    ? sale.items
    : Array.isArray(sale?.saleItems)
      ? sale.saleItems
      : Array.isArray(sale?.details)
        ? sale.details
        : [];

  const formattedDate = new Date(
    sale.createdAt || sale.date || Date.now(),
  ).toLocaleString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalItemsCount = items.reduce(
    (acc: number, item: any) => acc + Number(item.quantity ?? item.qty ?? 1),
    0,
  );

  const subtotal = Number(sale.subtotal ?? sale.subTotal ?? 0);
  const tax = Number(sale.tax ?? sale.itbis ?? 0);
  const discount = Number(sale.discount ?? 0);
  const total = Number(sale.total ?? sale.grandTotal ?? 0);

  return (
    <>
      {/* 🖨️ ESTILOS DE IMPRESIÓN TÉRMICA NÍTIDA */}
      <style jsx global>{`
        @media print {
          /* Ocultar absolutamente todo por defecto */
          body * {
            visibility: hidden;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Mostrar únicamente el contenedor del recibo */
          #receipt,
          #receipt * {
            visibility: visible;
          }

          /* Reset de página para impresoras térmicas de 80mm / rollos continuos */
          @page {
            size: 80mm auto;
            margin: 0mm;
          }

          body {
            margin: 0;
            padding: 0;
            background-color: white;
          }

          #receipt {
            position: absolute;
            left: 0 !important;
            top: 0 !important;
            width: 78mm !important; /* Margen de seguridad para papel de 80mm */
            max-width: 78mm !important;
            margin: 0 auto !important;
            padding: 4px !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      <div
        id="receipt"
        className="w-[300px] bg-white text-black p-4 font-mono text-[11px] shadow-sm select-none mx-auto leading-relaxed"
      >
        {/* LOGO */}
        {settings?.logoUrl && (
          <div className="flex justify-center mb-3">
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="w-16 h-16 object-contain filter grayscale contrast-200"
            />
          </div>
        )}

        {/* CABECERA */}
        <div className="text-center mb-4 space-y-0.5">
          <h1 className="font-bold uppercase text-sm tracking-wider">
            {settings?.businessName || "OG-@DMIN"}
          </h1>
          {settings?.rnc && <p>RNC: {settings.rnc}</p>}
          <p>{settings?.address || "República Dominicana"}</p>
          <p>{settings?.phone || "809-000-0000"}</p>
        </div>

        <div className="border-t border-dashed border-black my-2" />

        {/* DETALLES DE LA FACTURA */}
        <div className="space-y-1.5 text-[11px] my-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Factura:</span>
            <span className="font-bold">
              {sale.invoiceNumber || sale.id?.slice(0, 10)}
            </span>
          </div>
          {sale.ncf && (
            <div className="flex justify-between">
              <span className="text-gray-600">NCF:</span>
              <span className="font-bold">{sale.ncf}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Fecha:</span>
            <span>{formattedDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Método de Pago:</span>
            <span>
              {sale.paymentMethod === "CASH"
                ? "Efectivo"
                : sale.paymentMethod === "CREDIT"
                  ? "A Crédito"
                  : sale.paymentMethod || "Efectivo"}
            </span>
          </div>
          {sale.customer && (
            <div className="flex justify-between">
              <span className="text-gray-600">Cliente:</span>
              <span className="truncate max-w-[160px] font-medium">
                {sale.customer.name}
              </span>
            </div>
          )}
        </div>

        {/* 🛠️ SECCIÓN DE ORDEN DE SERVICIO / TALLER */}
        {sale.serviceOrder && (
          <>
            <div className="border-t border-dashed border-black my-2" />
            <div className="space-y-1 text-[10px] p-2 border border-dashed border-black rounded">
              <div className="font-bold uppercase text-center text-black mb-1">
                Orden de Servicio #{sale.serviceOrder.ticketNumber}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Dispositivo:</span>
                <span className="font-medium">
                  {sale.serviceOrder.deviceBrand}{" "}
                  {sale.serviceOrder.deviceModel}
                </span>
              </div>
                            {sale.serviceOrder.serialOrImei && (
                <div className="flex justify-between">
                  <span className="text-gray-600">IMEI/Serial:</span>
                  <span className="font-mono">
                    {sale.serviceOrder.serialOrImei}
                  </span>
                </div>
              )}
              {Number(sale.serviceOrder.warrantyDays) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Garantía:</span>
                  <span className="font-medium">
                    {sale.serviceOrder.warrantyUntil
                      ? `hasta ${new Date(
                          sale.serviceOrder.warrantyUntil,
                        ).toLocaleDateString("es-DO", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          timeZone: "America/Santo_Domingo",
                        })}`
                      : `${sale.serviceOrder.warrantyDays} días desde la entrega`}
                  </span>
                </div>
              )}
              {Number(sale.serviceOrder.laborCost) > 0 && (
                <div className="flex justify-between pt-1 border-t border-black font-semibold">
                  <span>Mano de Obra / Taller:</span>
                  <span>{formatMoney(sale.serviceOrder.laborCost)}</span>
                </div>
              )}
            </div>
          </>
        )}

        <div className="border-t border-dashed border-black my-2" />

        {/* ITEMS / ARTÍCULOS */}
                <div className="space-y-4 mb-4">
          {items.length === 0 ? (
            <p className="text-center text-gray-500 italic">No hay artículos</p>
          ) : (
            items.map((item: any, idx: number) => {
              const productName =
                item.product?.name ||
                item.productName ||
                item.name ||
                item.description ||
                "Artículo";

              const quantity = Number(item.quantity ?? item.qty ?? 1);
              const unitPrice = Number(
                item.salePrice ?? item.price ?? item.unitPrice ?? 0,
              );
              const lineTotal = Number(
                item.lineTotal ?? item.total ?? quantity * unitPrice,
              );

              const rawSerials =
                item.serialNumber ||
                item.selectedSerials ||
                item.imei ||
                item.serial ||
                item.product?.serialNumber ||
                item.product?.imei;

              const serialsList: string[] = Array.isArray(rawSerials)
                ? rawSerials
                : typeof rawSerials === "string" && rawSerials.trim() !== ""
                  ? [rawSerials]
                  : [];

              const laborCost = Number(
                item.laborCost ??
                  item.serviceFee ??
                  item.serviceCost ??
                  item.repairFee ??
                  item.labor ??
                  0,
              );

              const calculatedLabor =
                laborCost > 0
                  ? laborCost
                  : lineTotal > quantity * unitPrice
                    ? lineTotal - quantity * unitPrice
                    : 0;

              const pureItemTotal = quantity * unitPrice;

              return (
                <div
                  key={idx}
                  className="flex flex-col space-y-1 pb-2 border-b border-dashed border-gray-300 last:border-none"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold uppercase text-[11px] leading-tight">
                      {productName}
                    </span>
                    <span className="font-bold shrink-0">
                      {formatMoney(
                        calculatedLabor > 0 ? pureItemTotal : lineTotal,
                      )}
                    </span>
                  </div>

                  <div className="text-gray-600 text-[10px] flex justify-between">
                    <span>
                      {quantity} x {formatMoney(unitPrice)}
                    </span>
                  </div>

                  {calculatedLabor > 0 && (
                    <div className="flex justify-between text-[10px] text-black pl-2 border-l-2 border-black my-0.5">
                      <span>Mano de Obra / Servicio</span>
                      <span className="font-medium">
                        {formatMoney(calculatedLabor)}
                      </span>
                    </div>
                  )}

                  {serialsList.length > 0 && (
                    <div className="text-[10px] text-black font-mono mt-1 border border-black px-1.5 py-1 rounded space-y-0.5">
                      <span className="text-black font-semibold block">
                        IMEI / Seriales:
                      </span>
                      {serialsList.map((s, sIdx) => (
                        <div key={sIdx} className="font-bold">
                          • {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-dashed border-black my-2" />

        {/* TOTALES */}
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>

          {tax > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">ITBIS</span>
              <span>{formatMoney(tax)}</span>
            </div>
          )}

          {discount > 0 && (
            <div className="flex justify-between font-medium">
              <span>Descuento</span>
              <span>-{formatMoney(discount)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-bold border-t border-dashed border-black pt-2 mt-1 text-black">
            <span>TOTAL A PAGAR</span>
            <span>{formatMoney(total)}</span>
          </div>

          <div className="flex justify-between text-gray-600 pt-1 text-[10px]">
            <span>Total de Artículos:</span>
            <span className="font-bold">{totalItemsCount || items.length}</span>
          </div>
        </div>

        {/* QR e-CF DGII */}
        {qrDataUrl && sale.ecfStatus && sale.ecfStatus !== "failure" && (
          <div className="text-center mt-4 pt-2 border-t border-dashed border-black">
            <img
              src={qrDataUrl}
              alt="QR e-CF"
              className="w-20 h-20 mx-auto filter contrast-200"
            />
            <p className="mt-1 text-[9px] font-semibold text-black">
              Compr. Fiscal Electrónico ({sale.ncfType})
            </p>
          </div>
        )}

        {/* PIE DE TICKET */}
        <div className="text-center mt-6 text-[10px] space-y-1 border-t border-dashed border-black pt-3">
          <p className="font-medium">
            {settings?.invoiceFooter || "¡Gracias por preferirnos!"}
          </p>
          <p className="text-gray-600 text-[9px]">
            Conserve este ticket para cualquier reclamación o garantía.
          </p>
        </div>
      </div>
    </>
  );
}
