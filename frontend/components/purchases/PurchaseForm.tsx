"use client";

import { useEffect, useMemo, useState } from "react";

import { getProducts, getSuppliers } from "@/lib/api";

import { Plus, Trash2 } from "lucide-react";

type Props = {
  onSubmit: (data: any) => void;
  loading?: boolean;
};

export default function PurchaseForm({ onSubmit, loading }: Props) {
  const [products, setProducts] = useState<any[]>([]);

  const [suppliers, setSuppliers] = useState<any[]>([]);

  const [supplierId, setSupplierId] = useState("");

  const [items, setItems] = useState<any[]>([]);

  async function load() {
    try {
      const [p, s] = await Promise.all([getProducts(), getSuppliers()]);

      setProducts(p);
      setSuppliers(s);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        productId: "",
        quantity: 1,
        costPrice: 0,
      },
    ]);
  }

  function updateItem(index: number, key: string, value: any) {
    const updated = [...items];

    updated[index][key] = value;

    setItems(updated);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const total = useMemo(() => {
    return items.reduce((acc, item) => acc + item.quantity * item.costPrice, 0);
  }, [items]);

  return (
    <div className="bg-white border rounded-3xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">New Purchase</h2>

        <button
          onClick={addItem}
          className="bg-black text-white px-4 py-2 rounded-xl flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* SUPPLIER */}
      <div className="mb-6">
        <label className="block mb-2 font-medium text-gray-700">Supplier</label>

        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="w-full border rounded-2xl p-4 text-gray-800"
        >
          <option value="">Select supplier</option>

          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </div>

      {/* ITEMS */}
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="border rounded-2xl p-4">
            <div className="grid md:grid-cols-4 gap-4">
              {/* PRODUCT */}
              <select
                value={item.productId}
                onChange={(e) => updateItem(index, "productId", e.target.value)}
                className="border rounded-xl p-3 text-gray-800"
              >
                <option value="">Product</option>

                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>

              {/* QTY */}
              <input
                type="number"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) =>
                  updateItem(index, "quantity", Number(e.target.value))
                }
                className="border rounded-xl p-3 text-gray-800"
              />

              {/* COST */}
              <input
                type="number"
                placeholder="Cost"
                value={item.costPrice}
                onChange={(e) =>
                  updateItem(index, "costPrice", Number(e.target.value))
                }
                className="border rounded-xl p-3 text-gray-800"
              />

              {/* REMOVE */}
              <button
                onClick={() => removeItem(index)}
                className="bg-red-50 text-red-500 rounded-xl flex items-center justify-center"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* TOTAL */}
      <div className="mt-8 border-t pt-6">
        <div className="flex justify-between text-2xl font-bold text-gray-900 mb-6">
          <span>Total</span>

          <span>
            RD$
            {total.toFixed(2)}
          </span>
        </div>

        <button
          disabled={!supplierId || items.length === 0 || loading}
          onClick={() =>
            onSubmit({
              supplierId,
              items,
            })
          }
          className="w-full bg-black text-white rounded-2xl py-4 font-semibold disabled:opacity-50"
        >
          {loading ? "Saving..." : "Create Purchase"}
        </button>
      </div>
    </div>
  );
}
