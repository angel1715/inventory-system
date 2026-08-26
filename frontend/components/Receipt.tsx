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
    `RD$ ${Number(value ?? 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })}`;

  const items = Array.isArray(sale?.items) ? sale.items : [];

  const formattedDate = new Date(sale.createdAt).toLocaleString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      {/* ESTILOS CSS GLOBALES PARA IMPRESIÓN TÉRMICA */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt,
          #receipt * {
            visibility: visible;
          }
          #receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0;
            padding: 4px;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* CONTENEDOR PRINCIPAL DEL TICKET */}
      <div
        id="receipt"
        className="w-[280px] sm:w-[300px] bg-white text-black p-3 font-mono text-[11px] leading-tight mx-auto shadow-sm select-none"
      >
        {/* LOGO */}
        {settings?.logoUrl && (
          <div className="flex justify-center mb-2">
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="w-14 h-14 object-contain filter grayscale contrast-125"
            />
          </div>
        )}

        {/* CABECERA */}
        <div className="text-center mb-3">
          <h1 className="font-bold uppercase text-xs tracking-wide">
            {settings?.businessName || "Mi Negocio"}
          </h1>
          {settings?.rnc && <p>RNC: {settings.rnc}</p>}
          <p>{settings?.address || "República Dominicana"}</p>
          <p>Tel: {settings?.phone || "N/A"}</p>
        </div>

        <div className="border-t border-dashed border-black my-2" />

        {/* DETALLES DE LA VENTA */}
        <div className="space-y-0.5 text-[10px]">
          <p>
            Factura: <b className="font-bold">{sale.invoiceNumber}</b>
          </p>
          {sale.ncf && (
            <p>
              NCF: <b className="font-bold">{sale.ncf}</b>
            </p>
          )}
          <p>Fecha: {formattedDate}</p>
          <p>Cajero: {sale.createdBy?.name || "Admin"}</p>
          <p>
            Pago:{" "}
            {sale.paymentMethod === "CASH"
              ? "Efectivo"
              : sale.paymentMethod === "CREDIT"
                ? "A Crédito"
                : sale.paymentMethod}
          </p>
          {sale.customer && (
            <p className="truncate">
              Cliente: {sale.customer.name} ({sale.customer.phone || "Sin tel"})
            </p>
          )}
        </div>

        <div className="border-t border-dashed border-black my-2" />

        {/* ITEMS (CON SOPORTE PARA IMEI / SERIALES) */}
        <div className="space-y-2 mb-2">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="flex flex-col">
              <div className="flex justify-between items-start">
                <span className="font-bold pr-1">
                  {item.product?.name || item.productName}
                </span>
                <span className="shrink-0">{formatMoney(item.lineTotal)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-700">
                <span>
                  {item.quantity} x {Number(item.salePrice).toFixed(2)}
                </span>
              </div>
              {/* Si el producto tiene IMEI o serial registrado, se imprime limpio */}
              {item.serialNumber && (
                <p className="text-[10px] font-mono text-gray-600 mt-0.5 bg-gray-50 px-1 py-0.5 rounded">
                  IMEI/S: {item.serialNumber}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-black my-2" />

        {/* TOTALES */}
        <div className="space-y-0.5 text-right text-[11px]">
          <p>Subtotal: {formatMoney(sale.subtotal)}</p>
          {Number(sale.tax) > 0 && <p>ITBIS: {formatMoney(sale.tax)}</p>}
          {Number(sale.discount) > 0 && (
            <p>Desc: -{formatMoney(sale.discount)}</p>
          )}
          <p className="text-sm font-bold border-t border-dashed border-black pt-1 mt-1">
            TOTAL: {formatMoney(sale.total)}
          </p>
        </div>

        {/* QR e-CF DGII */}
        {qrDataUrl && sale.ecfStatus && sale.ecfStatus !== "failure" && (
          <div className="text-center mt-3">
            <img src={qrDataUrl} alt="QR e-CF" className="w-20 h-20 mx-auto" />
            <p className="mt-0.5 text-[9px] uppercase font-semibold">
              Comprobante Electrónico ({sale.ncfType})
            </p>
          </div>
        )}

        {/* PIE DE TICKET */}
        <div className="text-center mt-4 text-[10px] space-y-1">
          <p>{settings?.invoiceFooter || "¡Gracias por su compra!"}</p>
          <p className="text-[9px] text-gray-500">
            Desarrollado por Chaltech ERP
          </p>
        </div>
      </div>
    </>
  );
}
