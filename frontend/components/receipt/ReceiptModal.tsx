"use client";

import { X, Printer } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import toast from "react-hot-toast";
import Receipt from "../Receipt";
import EcfStatusCard from "../EcfStatusCard";

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
  const [currentSale, setCurrentSale] = useState(sale);

  useEffect(() => {
    setCurrentSale(sale);
  }, [sale]);

  function handlePrint() {
    const ticket = receiptRef.current;
    if (!ticket) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      toast.error("Popup bloqueado");
      return;
    }

    const ticketHTML = ticket.innerHTML;

    printWindow.document.write(`
      <html>
        <head>
          <title>Factura</title>
          <!-- Cargamos Tailwind por CDN para que respete todas las clases del recibo -->
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            * { box-sizing: border-box; }
            body { 
              margin: 0; 
              padding: 0; 
              font-family: monospace; 
              background: white; 
              display: flex; 
              justify-content: center; 
            }
            #receipt { 
              width: 78mm !important; 
              max-width: 78mm !important; 
              padding: 6px !important; 
              background: white !important;
              color: black !important;
            }
            @media print {
              body { padding: 0; }
              #receipt { border: none !important; box-shadow: none !important; }
            }
          </style>
        </head>
        <body>
          <div id="receipt">${ticketHTML}</div>
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
            <X className="text-red-500 w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col items-center">
          <EcfStatusCard sale={currentSale} onUpdated={setCurrentSale} />
          <div ref={receiptRef}>
            <Receipt sale={currentSale} />
          </div>
        </div>

        <div className="p-4 border-t grid grid-cols-2 gap-2">
          <button
            onClick={handlePrint}
            className="bg-black text-white py-2 rounded-xl flex justify-center items-center gap-2 hover:bg-gray-800 transition col-span-2"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}