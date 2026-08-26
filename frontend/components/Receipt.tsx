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

  const items = Array.isArray(sale?.items) ? sale.items : [];

  const formattedDate = new Date(sale.createdAt).toLocaleString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Calcular el total de piezas / unidades sumando los items
  const totalItemsCount = items.reduce(
    (acc: number, item: any) => acc + Number(item.quantity || 1),
    0,
  );

  return (
    <>
      {/* ESTILOS DE IMPRESIÓN TÉRMICA */}
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

      <div
        id="receipt"
        className="w-[300px] bg-white text-black p-4 font-mono text-[11px] shadow-sm select-none"
      >
        {/* LOGO */}
        {settings?.logoUrl && (
          <div className="flex justify-center mb-3">
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="w-16 h-16 object-contain"
            />
          </div>
        )}

        {/* CABECERA */}
        <div className="text-center mb-4">
          <h1 className="font-bold uppercase text-sm">
            {settings?.businessName || "CHALTECH"}
          </h1>
          {settings?.rnc && <p>RNC: {settings.rnc}</p>}
          <p>{settings?.address || "Republica Dominicana"}</p>
          <p>{settings?.phone || "809-917-0343"}</p>
        </div>

        <div className="border-t border-dashed border-gray-400 my-2" />

        {/* DETALLES (ESTILO DOS COLUMNAS) */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-700">Invoice:</span>
            <span className="font-bold">{sale.invoiceNumber}</span>
          </div>
          {sale.ncf && (
            <div className="flex justify-between">
              <span className="text-gray-700">NCF:</span>
              <span className="font-bold">{sale.ncf}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-700">Fecha:</span>
            <span>{formattedDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Metodo de Pago:</span>
            <span>
              {sale.paymentMethod === "CASH"
                ? "Efectivo"
                : sale.paymentMethod === "CREDIT"
                  ? "A Crédito"
                  : sale.paymentMethod}
            </span>
          </div>
          {sale.customer && (
            <div className="flex justify-between">
              <span className="text-gray-700">Cliente:</span>
              <span className="truncate max-w-[160px]">
                {sale.customer.name}
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-gray-400 my-2" />

        {/* ITEMS */}
        <div className="space-y-3 mb-3">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="flex flex-col">
              <div className="flex justify-between items-start">
                <span className="font-bold">
                  {item.product?.name || item.productName}
                </span>
                <span>{formatMoney(item.lineTotal)}</span>
              </div>
              <div className="text-gray-600 text-[10px]">
                {item.quantity} x {Number(item.salePrice).toFixed(2)}
              </div>
              {item.serialNumber && (
                <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                  IMEI/S: {item.serialNumber}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-gray-400 my-2" />

        {/* TOTALES (ESTILO DOS COLUMNAS ORDENADO) */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-700">Subtotal</span>
            <span>{formatMoney(sale.subtotal)}</span>
          </div>
          {Number(sale.tax) > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-700">ITBIS</span>
              <span>{formatMoney(sale.tax)}</span>
            </div>
          )}
          {Number(sale.discount) > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-700">Desc</span>
              <span>-{formatMoney(sale.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold border-t border-dashed border-gray-400 pt-1 mt-1 text-black">
            <span>TOTAL</span>
            <span>{formatMoney(sale.total)}</span>
          </div>
          <div className="flex justify-between text-gray-700 pt-0.5">
            <span>Items</span>
            <span>{totalItemsCount}</span>
          </div>
        </div>

        {/* QR e-CF DGII */}
        {qrDataUrl && sale.ecfStatus && sale.ecfStatus !== "failure" && (
          <div className="text-center mt-4">
            <img src={qrDataUrl} alt="QR e-CF" className="w-20 h-20 mx-auto" />
            <p className="mt-1 text-[9px]">
              Comprobante Fiscal Electrónico ({sale.ncfType})
            </p>
          </div>
        )}

        {/* PIE */}
        <div className="text-center mt-6 text-[10px] space-y-0.5">
          <p>{settings?.invoiceFooter || "Gracias por su compra!"}</p>
          <p className="text-gray-500">Sistema de Facturación CHALTECH</p>
        </div>
      </div>
    </>
  );
}
