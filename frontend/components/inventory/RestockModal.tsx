"use client";

import { useState } from "react";

import toast from "react-hot-toast";

import { restockProduct } from "@/lib/api";

export default function RestockModal({ open, onClose, product, refresh }: any) {
  const [quantity, setQuantity] = useState("");

  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);

  if (!open || !product) return null;

  async function handleRestock() {
    if (!quantity) {
      return toast.error("Enter quantity");
    }

    try {
      setLoading(true);

      await restockProduct(product.id, Number(quantity), note);

      toast.success("Stock updated");

      refresh();

      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to restock");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="
        fixed
        inset-0
        bg-black/40
        flex
        items-center
        justify-center
        z-50
        p-4
      "
    >
      <div
        className="
          bg-white
          w-full
          max-w-md
          rounded-3xl
          shadow-2xl
          p-6
        "
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Restock Product</h2>

          <p className="text-gray-500 mt-1">{product.name}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">Quantity</label>

            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="
                w-full
                border
                rounded-2xl
                px-4
                py-3
                mt-1
                text-gray-700
              "
            />
          </div>

          <div>
            <label className="text-sm text-gray-500">Note</label>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="
                w-full
                border
                rounded-2xl
                px-4
                py-3
                mt-1
                resize-none
                text-gray-700
              "
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="
              flex-1
              border
              rounded-2xl
              py-3
              bg-red-500
            "
          >
            Cancel
          </button>

          <button
            disabled={loading}
            onClick={handleRestock}
            className="
              flex-1
              bg-black
              text-white
              rounded-2xl
              py-3
              disabled:opacity-50
            "
          >
            {loading ? "Updating..." : "Update Stock"}
          </button>
        </div>
      </div>
    </div>
  );
}
