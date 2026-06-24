"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getInventoryMovements } from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";

const TYPE_STYLES: Record<string, string> = {
  SALE: "bg-red-100 text-red-600",
  RESTOCK: "bg-green-100 text-green-600",
  ADJUSTMENT: "bg-yellow-100 text-yellow-700",
  PURCHASE: "bg-blue-100 text-blue-700",
  DEFAULT: "bg-gray-100 text-gray-600",
};

export default function InventoryPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadMovements() {
    try {
      setLoading(true);
      const response = await getInventoryMovements(page, 10, search);
      setMovements(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
    } catch (err: any) {
      toast.error(err.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }

  // Debounce para la búsqueda
  useEffect(() => {
    const handler = setTimeout(() => {
      loadMovements();
    }, 500);

    return () => clearTimeout(handler);
  }, [page, search]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Inventory Movements
            </h1>
            <p className="text-gray-500">Track stock changes and audits</p>
          </div>
          <Link
            href="/dashboard"
            className="bg-gray-800 text-white px-5 py-3 rounded-2xl hover:opacity-90 transition"
          >
            Dashboard
          </Link>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search product or note..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="w-full md:w-96 border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-black bg-white text-gray-700"
          />
        </div>

        <div className="bg-white rounded-3xl border overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Loading inventory...
            </div>
          ) : movements.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No inventory movements yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 text-sm text-gray-500">
                      Product
                    </th>
                    <th className="text-left p-4 text-sm text-gray-500">
                      Type
                    </th>
                    <th className="text-left p-4 text-sm text-gray-500">
                      Quantity
                    </th>
                    <th className="text-left p-4 text-sm text-gray-500">
                      Previous
                    </th>
                    <th className="text-left p-4 text-sm text-gray-500">New</th>
                    <th className="text-left p-4 text-sm text-gray-500">
                      Date
                    </th>
                    <th className="text-left p-4 text-sm text-gray-500">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-semibold text-gray-900">
                        {movement.product.name}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${TYPE_STYLES[movement.type] || TYPE_STYLES.DEFAULT}`}
                        >
                          {movement.type}
                        </span>
                      </td>
                      <td className="p-4 text-gray-700">{movement.quantity}</td>
                      <td className="p-4 text-gray-700">
                        {movement.previousStock ?? "-"}
                      </td>
                      <td className="p-4 text-gray-700">
                        {movement.newStock ?? "-"}
                      </td>
                      <td className="p-4 text-gray-500">
                        {new Date(movement.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 text-gray-500">
                        {movement.note || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <button
              disabled={page === 1}
              onClick={() => setPage((prev) => prev - 1)}
              className="px-4 py-2 rounded-xl border disabled:opacity-50"
            >
              Previous
            </button>
            <p className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </p>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className="px-4 py-2 rounded-xl border disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
