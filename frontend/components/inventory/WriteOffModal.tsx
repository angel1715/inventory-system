"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { writeOffProduct } from "@/lib/api";

export default function WriteOffModal({
  open,
  product,
  onClose,
  refresh,
}: any) {
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Ya no necesitas preocuparte por Headers ni URLs complejas,
      // solo por los datos de negocio:
      await writeOffProduct(product.id, quantity, reason);
      toast.success("Stock adjusted successfully");
      refresh();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-2xl w-full max-w-sm"
      >
        <h2 className="text-gray-700 text-xl font-bold mb-4">
          Write-off: {product.name}
        </h2>
        <p className="text-sm text-gray-700 mb-4">Available: {product.stock}</p>

        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          max={product.stock}
          className="text-gray-700 w-full border p-3 rounded-xl mb-3"
          required
        />
        <textarea
          placeholder="Reason for write-off..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="text-gray-700 w-full border p-3 rounded-xl mb-4"
          required
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-700 flex-1 p-3 border rounded-xl hover:opacity-90 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 p-3 bg-red-600 text-white rounded-xl hover:opacity-90 transition"
          >
            {loading ? "Processing..." : "Confirm"}
          </button>
        </div>
      </form>
    </div>
  );
}
