"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function InvoicePage() {
  const { id } = useParams();

  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/sales/${id}/invoice`)
      .then((r) => r.json())
      .then(setInvoice);
  }, []);

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
