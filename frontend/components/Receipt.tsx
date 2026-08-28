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

  // 🔍 Depuración en consola para ver la estructura exacta que llega del backend
  console.log("Objeto sale recibido en Receipt:", sale);

  const formatMoney = (value: any) =>
    `RD$${Number(value ?? 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })}`;

  // Búsqueda exhaustiva del arreglo de productos en cualquier propiedad posible
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
        className="w-[300px] bg-white text-black p-4 font-mono text-[11px] shadow-sm select-none mx-auto"
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
            <span className="font-bold">
              {sale.invoiceNumber || sale.id?.slice(0, 10)}
            </span>
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
                  : sale.paymentMethod || "Efectivo"}
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

        {/* ITEMS / ARTÍCULOS (DOS COLUMNAS: NOMBRE A LA IZQUIERDA, PRECIO A LA DERECHA) */}
        <div className="space-y-2 mb-3">
          {items.length === 0 ? (
            <p className="text-center text-gray-500 italic">No hay artículos</p>
          ) : (
            items.map((item: any, idx: number) => {
              // Obtener el nombre del producto de forma robusta sin importar cómo venga estructurado
              const productName =
                item.product?.name ||
                item.productName ||
                item.name ||
                item.description ||
                "Artículo";

              const quantity = Number(item.quantity ?? item.qty ?? 1);
              const salePrice = Number(
                item.salePrice ?? item.price ?? item.unitPrice ?? 0,
              );
              const lineTotal = Number(
                item.lineTotal ?? item.total ?? quantity * salePrice,
              );
              const serial = item.serialNumber || item.imei;

              return (
                <div key={idx} className="flex flex-col">
                  <div className="flex justify-between items-start">
                    <span className="font-bold pr-1">{productName}</span>
                    <span className="shrink-0">{formatMoney(lineTotal)}</span>
                  </div>
                  <div className="text-gray-600 text-[10px]">
                    {quantity} x {formatMoney(salePrice)}
                  </div>
                  {serial && (
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                      IMEI/S: {serial}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-dashed border-gray-400 my-2" />

        {/* TOTALES (ESTILO DOS COLUMNAS ORDENADO) */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-700">Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>

          {/* Solo muestra ITBIS si es mayor a 0 */}
          {tax > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-700">ITBIS</span>
              <span>{formatMoney(tax)}</span>
            </div>
          )}

          {discount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-700">Desc</span>
              <span>-{formatMoney(discount)}</span>
            </div>
          )}

          <div className="flex justify-between text-base font-bold border-t border-dashed border-gray-400 pt-1 mt-1 text-black">
            <span>TOTAL</span>
            <span>{formatMoney(total)}</span>
          </div>

          <div className="flex justify-between text-gray-700 pt-0.5">
            <span>Items</span>
            <span>{totalItemsCount || items.length}</span>
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
        </div>
      </div>
    </>
  );
}
