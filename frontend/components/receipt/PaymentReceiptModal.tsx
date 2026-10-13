"use client";

import toast from "react-hot-toast";
import { useSettings } from "@/hooks/useSettings";

const money = (value: any) =>
  `RD$${Number(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-600">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

interface PaymentReceiptModalProps {
  open: boolean;
  receipt: any;
  onClose: () => void;
}

export default function PaymentReceiptModal({
  open,
  receipt,
  onClose,
}: PaymentReceiptModalProps) {
  const { settings } = useSettings();

  if (!open || !receipt) return null;

  const date = new Date(receipt.createdAt).toLocaleString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function printReceipt() {
    const ticket = document.getElementById("payment-receipt-content");

    if (!ticket) {
      toast.error("No se encontró el recibo");
      return;
    }

    const printWindow = window.open("", "_blank", "width=400,height=600");

    if (!printWindow) {
      toast.error("El navegador bloqueó la ventana de impresión");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Recibo de pago ${receipt.receiptNumber}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; font-family: monospace; background: white; display: flex; justify-content: center; }
            #receipt { width: 78mm !important; max-width: 78mm !important; padding: 6px !important; background: white !important; color: black !important; }
            @page { size: 80mm auto; margin: 0; }
          </style>
        </head>
        <body>
          <div id="receipt">${ticket.innerHTML}</div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 my-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recibo de pago</h2>

        {/* Vista previa: es lo mismo que se imprime */}
        <div className="border border-dashed border-gray-300 rounded-2xl py-3">
          <div id="payment-receipt-content">
            <div className="w-[300px] bg-white text-black p-3 font-mono text-[11px] leading-relaxed mx-auto">
              {settings?.logoUrl && (
                <div className="flex justify-center mb-3">
                  <img
                    src={settings.logoUrl}
                    alt="Logo"
                    className="w-16 h-16 object-contain filter grayscale contrast-200"
                  />
                </div>
              )}

              <div className="text-center mb-3 space-y-0.5">
                <h1 className="font-bold uppercase text-sm tracking-wider">
                  {settings?.businessName || "Mi negocio"}
                </h1>
                {settings?.rnc && <p>RNC: {settings.rnc}</p>}
                {settings?.address && <p>{settings.address}</p>}
                {settings?.phone && <p>{settings.phone}</p>}
              </div>

              <div className="border-t border-dashed border-black my-2" />
              <p className="text-center font-bold uppercase tracking-wider">
                Recibo de pago
              </p>

              <div className="space-y-1.5 my-2">
                <Row label="Recibo No.:" value={<span className="font-bold">{receipt.receiptNumber}</span>} />
                <Row label="Fecha:" value={date} />
                <Row label="Cliente:" value={receipt.customer?.name} />
                {receipt.customer?.taxId && (
                  <Row label="RNC/Cédula:" value={receipt.customer.taxId} />
                )}
                <Row label="Forma de pago:" value="Efectivo" />
                {receipt.createdBy?.name && (
                  <Row label="Cobrado por:" value={receipt.createdBy.name} />
                )}
              </div>

              <div className="border-t border-dashed border-black my-2" />

              <p className="font-semibold mb-1">Aplicado a:</p>
              {receipt.lines?.map((line: any) => (
                <div
                  key={line.id}
                  className="pb-1.5 mb-1.5 border-b border-dashed border-gray-300 last:border-none"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-bold">{line.invoiceNumber}</span>
                    <span className="font-bold">{money(line.amountApplied)}</span>
                  </div>
                  {line.ncf && (
                    <div className="text-gray-600 text-[10px]">NCF: {line.ncf}</div>
                  )}
                  <div className="flex justify-between gap-2 text-gray-600 text-[10px]">
                    <span>Pendiente de esta factura:</span>
                    <span>{money(line.pendingAfter)}</span>
                  </div>
                </div>
              ))}

              <div className="border-t border-dashed border-black my-2" />

              <div className="space-y-1.5">
                <Row label="Deuda anterior:" value={money(receipt.debtBefore)} />
                <div className="flex justify-between gap-2 text-sm font-bold">
                  <span>MONTO PAGADO</span>
                  <span>{money(receipt.amount)}</span>
                </div>
                <Row label="Saldo pendiente:" value={money(receipt.debtAfter)} />
              </div>

              {receipt.note && (
                <p className="mt-2 text-[10px] text-gray-600">Nota: {receipt.note}</p>
              )}

              <div className="text-center mt-4 text-[10px] space-y-1 border-t border-dashed border-black pt-3">
                <p className="font-medium">¡Gracias por su pago!</p>
                <p className="text-gray-600 text-[9px]">
                  Conserve este recibo como comprobante de su pago.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 transition p-4 rounded-2xl font-semibold text-gray-700"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={printReceipt}
            className="flex-1 bg-black hover:opacity-90 transition p-4 rounded-2xl font-bold text-white"
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}