"use client";

import { useEffect, useState } from "react";
import Receipt from "@/components/Receipt";
import EcfStatusCard from "@/components/EcfStatusCard";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";

export default function SaleDetailModal({ open, sale, onClose }: any) {
  const [currentSale, setCurrentSale] = useState(sale);

  useEffect(() => {
    setCurrentSale(sale);
  }, [sale]);

  if (!open || !currentSale) return null;

  // =========================
  // PRINT (CLEAN + RELIABLE)
  // =========================
  function printReceipt() {
    const ticket = document.getElementById("receipt");

    if (!ticket) {
      toast.error("Invoice not found");
      return;
    }

    const printWindow = window.open("", "", "width=400,height=700");

    if (!printWindow) {
      toast.error("Popup blocked");
      return;
    }

    printWindow.document.write(`
    <html>
      <head>
        <title>Invoice</title>

        <style>
          body {
            margin: 0;
            padding: 0;
            background: white;
            font-family: monospace;
            display: flex;
            justify-content: center;
          }

          /* 🔥 ESTE ES EL TRUCO CLAVE */
          #receipt {
            width: 300px !important;
            padding: 10px !important;
          }

          img {
            max-width: 80px !important;
            max-height: 80px !important;
            object-fit: contain !important;
            display: block;
            margin: 0 auto;
          }

          .border-t {
            border-top: 1px dashed #999 !important;
          }

          .border-b {
            border-bottom: 1px dashed #999 !important;
          }

          .text-center {
            text-align: center;
          }

          * {
            box-sizing: border-box;
          }

          h1, h2, h3, p, span {
            margin: 0;
            padding: 0;
          }

          .space-y-4 > * + * {
            margin-top: 10px;
          }

          .flex {
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>

      <body>
        ${ticket.outerHTML}
      </body>
    </html>
  `);

    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  // =========================
  // PDF EXPORT (UNCHANGED BUT SAFE)
  // =========================
  async function downloadPDF() {
    const input = document.getElementById("invoice-content");

    if (!input) return;

    const canvas = await html2canvas(input, {
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

    pdf.save(`${currentSale.invoiceNumber}.pdf`);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-3xl max-h-[95vh] rounded-3xl shadow-2xl overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b p-6 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Invoice</h2>
            <p className="text-sm text-gray-500 mt-2">Inventory System POS</p>
            <p className="text-gray-500 mt-1">{currentSale.invoiceNumber}</p>
            <p className="text-xs text-gray-400 mt-1">ID Venta: {currentSale.id}</p>
          </div>

          <button
            onClick={onClose}
            className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-xl"
          >
            Close
          </button>
        </div>

        {/* CONTENT */}
        <div id="invoice-content" className="p-6">
          {currentSale.ncfType?.startsWith("E") && (
            <div className="mb-6 flex justify-center">
              <EcfStatusCard sale={currentSale} onUpdated={setCurrentSale} />
            </div>
          )}

          {/* INFO CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-100 rounded-2xl p-4">
              <p className="text-sm text-gray-500">Metodo de pago</p>
              <h3 className="text-gray-600 font-bold text-lg mt-1">
                {currentSale.paymentMethod}
              </h3>
            </div>

            <div className="bg-gray-100 rounded-2xl p-4">
              <p className="text-sm text-gray-500">Fecha</p>
              <h3 className="text-gray-600 font-bold mt-1">
                {new Date(currentSale.createdAt).toLocaleString()}
              </h3>
            </div>

            <div className="bg-gray-100 rounded-2xl p-4">
              <p className="text-sm text-gray-500">Cajero</p>
              <h3 className="text-gray-600 font-bold mt-1">
                {currentSale.createdBy?.name || "Unknown"}
              </h3>
            </div>
          </div>

          {/* ITEMS */}
          <div className="space-y-4 mb-8">
            {currentSale.items.map((item: any) => (
              <div
                key={item.id}
                className="border rounded-2xl p-4 flex justify-between"
              >
                <div>
                  {/* Usamos ?. para evitar el error si product es undefined */}
                  <h3 className="text-gray-600 font-bold">
                    {item.product?.name || "Producto sin nombre"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Cantidad: {item.quantity}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-gray-600 font-bold">
                    RD${Number(item.salePrice || 0).toFixed(2)}
                  </p>

                  <p className="text-sm text-gray-500">
                    Total: RD$
                    {(item.quantity * Number(item.salePrice || 0)).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* TOTALS */}
          <div className="bg-black text-white rounded-3xl p-6 mb-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <p className="opacity-70">Subtotal</p>
                <p>RD${Number(currentSale.subtotal).toFixed(2)}</p>
              </div>

              <div className="flex justify-between">
                <p className="opacity-70">Impuesto</p>
                <p>RD${Number(currentSale.tax).toFixed(2)}</p>
              </div>

              <div className="flex justify-between">
                <p className="opacity-70">Descuento</p>
                <p>RD${Number(currentSale.discount).toFixed(2)}</p>
              </div>

              <div className="border-t border-white/20 pt-4 flex justify-between">
                <h2 className="text-3xl font-bold">
                  RD${Number(currentSale.total).toFixed(2)}
                </h2>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col md:flex-row gap-4">
            <button
              onClick={printReceipt}
              className="bg-black text-white px-5 py-4 rounded-2xl"
            >
              Imprimir Invoice
            </button>

            <button
              onClick={printReceipt}
              className="border px-5 py-4 rounded-2xl bg-blue-600"
            >
              ReImprimir
            </button>
          </div>
        </div>

        {/* HIDDEN RECEIPT (IMPORTANT FIX) */}
        <div className="hidden">
          <div id="receipt">
            <Receipt sale={currentSale} />
          </div>
        </div>
      </div>
    </div>
  );
}
