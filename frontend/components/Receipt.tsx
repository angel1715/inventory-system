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
    // qr_link es la URL de verificación del e-CF ante la DGII (no una imagen ya
    // generada) — hay que codificarla en un QR nosotros mismos para imprimirla.
    QRCode.toDataURL(ecfQrLink, { width: 160, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [ecfQrLink]);

  if (!sale) return null;

  const currency = settings?.currency || "DOP";
  const formatMoney = (value: any) => `RD$ ${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  const items = Array.isArray(sale?.items) ? sale.items : [];
  
  const formattedDate = new Date(sale.createdAt).toLocaleString("es-DO", {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  return (
    /* ESTILOS UNIFICADOS:
       El contenedor tiene un ancho fijo (300px) que es el estándar para impresoras térmicas.
       Las clases 'print:' aseguran que no haya sorpresas al enviar a la impresora.
    */
    <div 
      id="receipt" 
      className="w-[300px] bg-white text-black p-4 font-mono text-[11px] shadow-sm"
    >
      {/* LOGO */}
      {settings?.logoUrl && (
        <div className="flex justify-center mb-3">
          <img src={settings.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
        </div>
      )}

      {/* CABECERA */}
      <div className="text-center mb-4">
        <h1 className="font-bold uppercase text-sm">{settings?.businessName || "Mi Negocio"}</h1>
        {settings?.rnc && <p>RNC: {settings.rnc}</p>}
        <p>{settings?.address || "República Dominicana"}</p>
        <p>Tel: {settings?.phone || "N/A"}</p>
      </div>

      <div className="border-t border-dashed border-gray-400 my-2" />

      {/* DETALLES */}
      <div className="space-y-0.5">
        <p>Factura: <b>{sale.invoiceNumber}</b></p>
        {sale.ncf && <p>NCF: <b>{sale.ncf}</b></p>}
        <p>Fecha: {formattedDate}</p>
        <p>Cajero: {sale.createdBy?.name || "Admin"}</p>
        <p>Pago: {sale.paymentMethod === "CASH" ? "Efectivo" : sale.paymentMethod}</p>
      </div>

      <div className="border-t border-dashed border-gray-400 my-2" />

      {/* ITEMS */}
      <div className="space-y-2 mb-2">
        {items.map((item: any, idx: number) => (
          <div key={idx} className="flex flex-col">
            <div className="flex justify-between">
              <span className="font-bold">{item.product?.name}</span>
              <span>{formatMoney(item.lineTotal)}</span>
            </div>
            <p className="text-gray-600">{item.quantity} x {Number(item.salePrice).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-gray-400 my-2" />

      {/* TOTALES */}
      <div className="space-y-0.5 text-right">
        <p>Subtotal: {formatMoney(sale.subtotal)}</p>
        <p>ITBIS: {formatMoney(sale.tax)}</p>
        {Number(sale.discount) > 0 && <p>Desc: -{formatMoney(sale.discount)}</p>}
        <p className="text-lg font-bold border-t border-dashed border-gray-400 pt-1 mt-1">
          TOTAL: {formatMoney(sale.total)}
        </p>
      </div>

      {/* E-CF: QR de verificación DGII, generado a partir del qr_link del conector (elegible para impresión) */}
      {qrDataUrl && sale.ecfStatus && sale.ecfStatus !== "failure" && (
        <div className="text-center mt-4">
          <img
            src={qrDataUrl}
            alt="QR e-CF"
            className="w-24 h-24 mx-auto"
          />
          <p className="mt-1 text-[9px]">
            Comprobante Fiscal Electrónico ({sale.ncfType})
          </p>
        </div>
      )}

      {/* PIE */}
      <div className="text-center mt-6 text-[10px]">

        <p className="mt-1">{settings?.invoiceFooter || "Sistema CHALTECH"}</p>
      </div>
    </div>
  );
}