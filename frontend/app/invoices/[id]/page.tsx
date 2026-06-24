"use client";

import { useEffect, useState, use } from "react"; // 1. Importa 'use'
import { useParams } from "next/navigation";

export default function InvoicePage() {
  // 2. Si es una página dinámica con [id], asegúrate de obtener el id así:
  const params = useParams(); 
  const id = params.id as string; // Aseguramos que id sea string

  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    if (!id) return; // 3. Protegemos el fetch si el id aún no está
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/sales/${id}/invoice`)
      .then((r) => r.json())
      .then(setInvoice);
  }, [id]); // 4. Agregamos [id] como dependencia

  if (!invoice) return <p>Loading...</p>;

  return (
    <div className="max-w-4xl mx-auto bg-white p-12 shadow mt-10">
      <h1 className="text-4xl font-bold mb-3">
        Invoice {invoice.invoiceNumber}
      </h1>

      <p className="mb-8">
        Payment:
        {invoice.paymentMethod}
      </p>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th>Name</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Subtotal</th>
          </tr>
        </thead>

        <tbody>
          {invoice.items.map((item: any) => (
            <tr key={item.id} className="border-b">
              <td>{item.product.name}</td>
              <td>{item.quantity}</td>
              <td>${item.salePrice}</td>
              <td>${item.quantity * item.salePrice}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 text-right">
        <h2 className="text-3xl font-bold">Total ${invoice.total}</h2>
      </div>

      <button
        onClick={() => window.print()}
        className="mt-8 bg-black text-white px-6 py-3 rounded-xl"
      >
        Print Invoice
      </button>
    </div>
  );
}
