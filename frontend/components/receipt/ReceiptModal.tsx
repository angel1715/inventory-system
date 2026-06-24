"use client";

import { X, Printer, Download } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import toast from "react-hot-toast";
import Receipt from "../Receipt";

type Props = {
  open: boolean;
  onClose: () => void;
  sale: any;
  autoPrint?: boolean;
};

export default function ReceiptModal({
  open,
  onClose,
  sale,
  autoPrint = false,
}: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [processing, setProcessing] = useState(false);

  function handlePrint() {
    const ticket = receiptRef.current;
    if (!ticket) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      toast.error("Popup bloqueado");
      return;
    }

    // Extraemos solo el HTML del ticket
    const ticketHTML = ticket.innerHTML;

    printWindow.document.write(`
      <html>
        <head>
          <title>Factura</title>
          <style>
            /* Reset básico para que no herede nada extraño */
            * { box-sizing: border-box; }
            body { margin: 0; padding: 20px; font-family: monospace; display: flex; justify-content: center; }
            
            /* Estilos directos para el ticket */
            #receipt { width: 300px; padding: 10px; border: 1px solid #ccc; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .flex { display: flex; justify-content: space-between; }
            .border-t { border-top: 1px dashed #000; margin: 10px 0; }
            img { max-width: 80px; display: block; margin: 0 auto; }
            .uppercase { text-transform: uppercase; }
            
            @media print {
              body { padding: 0; }
              #receipt { border: none; }
            }
          </style>
        </head>
        <body>
          <div id="receipt">${ticketHTML}</div>
          <script>
            window.onload = () => {
              // Damos un tiempo extra para asegurar que el navegador procese el DOM
              setTimeout(() => {
                window.print();
                window.close();
              }, 600);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  /*
  async function handleDownloadPDF() {
    if (!receiptRef.current || processing) return;

    try {
      setProcessing(true);
      const html2pdf = (await import("html2pdf.js")).default;

      // Clonamos para asegurar que el contenido sea capturable
      const element = receiptRef.current.cloneNode(true) as HTMLElement;
      element.style.display = "block";
      element.style.color = "black";
      element.style.padding = "20px";
      element.style.backgroundColor = "white";

      const opt = {
        margin: 0.2,
        filename: `factura-${sale.invoiceNumber}.pdf`,
        image: { type: "jpeg", quality: 1 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      };

      await html2pdf().set(opt).from(element).save();
      toast.success("PDF generado exitosamente");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar PDF");
    } finally {
      setProcessing(false);
    }
  }
    */

  useEffect(() => {
    if (open && autoPrint) {
      const timer = setTimeout(handlePrint, 800);
      return () => clearTimeout(timer);
    }
  }, [open, autoPrint]);

  if (!open || !sale) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex justify-between p-4 border-b">
          <h2 className="font-bold text-gray-700">Visualizar Factura</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex justify-center">
          <div ref={receiptRef}>
            <Receipt sale={sale} />
          </div>
        </div>

        <div className="p-4 border-t grid grid-cols-2 gap-2">
          <button
            onClick={handlePrint}
            className="bg-black text-white py-2 rounded-xl flex justify-center items-center gap-2 hover:bg-gray-800 transition"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
