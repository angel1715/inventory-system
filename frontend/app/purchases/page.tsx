"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getPurchases } from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";
import PurchaseDetailModal from "@/components/PurchaseDetailsModal";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(
    null,
  );

  async function loadPurchases() {
    try {
      setLoading(true);
      const data = await getPurchases();
      setPurchases(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load purchases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPurchases();
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 p-6">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Purchases</h1>
            <p className="text-gray-500">Inventory purchase history</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="bg-gray-800 text-white px-5 py-3 rounded-2xl hover:opacity-90 transition"
            >
              Dashboard
            </Link>

            <Link
              href="/purchases/new"
              className="bg-black text-white px-5 py-3 rounded-2xl font-semibold hover:opacity-90 transition"
            >
              New Purchase
            </Link>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-3xl border overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Loading purchases...
            </div>
          ) : purchases.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No purchases found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 text-sm text-gray-500">
                      Invoice
                    </th>
                    <th className="text-left p-4 text-sm text-gray-500">
                      Supplier
                    </th>
                    <th className="text-left p-4 text-sm text-gray-500">
                      Date
                    </th>
                    <th className="text-left p-4 text-sm text-gray-500">
                      Items
                    </th>
                    <th className="text-right p-4 text-sm text-gray-500">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {purchases.map((purchase) => (
                    <tr
                      key={purchase.id}
                      onClick={() => setSelectedPurchaseId(purchase.id)}
                      className="border-b hover:bg-gray-50/80 cursor-pointer transition"
                    >
                      {/* Código de factura con font-mono es correcto */}
                      <td className="p-4 font-semibold text-gray-900 font-mono">
                        {purchase.invoiceNumber}
                      </td>

                      {/* 2. CORREGIDO: Se removió font-mono para que el nombre del proveedor luzca natural */}
                      <td className="p-4 font-medium text-gray-700">
                        {purchase.supplier?.name || "N/A"}
                      </td>

                      <td className="p-4 text-gray-600">
                        {new Date(purchase.createdAt).toLocaleString("es-DO")}
                      </td>

                      <td className="p-4 text-gray-600">
                        <span className="bg-gray-100 text-gray-800 px-2.5 py-1 rounded-xl text-xs font-bold">
                          {purchase.items?.length || 0} uds
                        </span>
                      </td>

                      <td className="p-4 text-right font-bold text-gray-900">
                        {new Intl.NumberFormat("es-DO", {
                          style: "currency",
                          currency: "DOP",
                        }).format(Number(purchase.total))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* RENDEREADO CONDICIONAL DEL MODAL DETALLE */}
      {selectedPurchaseId && (
        <PurchaseDetailModal
          purchaseId={selectedPurchaseId}
          onClose={() => setSelectedPurchaseId(null)}
        />
      )}
    </ProtectedRoute>
  );
}
