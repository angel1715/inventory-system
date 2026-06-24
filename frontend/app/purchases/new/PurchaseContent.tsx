"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useSearchParams } from "next/navigation";
import { getSuppliers, createPurchase, searchProducts } from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";

export default function NewPurchasePage() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const searchParams = useSearchParams();

  useEffect(() => {
    async function loadSuppliers() {
      try {
        const data = await getSuppliers();
        setSuppliers(data);
      } catch (err: any) {
        toast.error(err.message);
      }
    }
    loadSuppliers();
  }, []);

  useEffect(() => {
    const auto = searchParams.get("auto");
    if (auto !== "1") return;

    const stored = sessionStorage.getItem("autoPurchases");
    if (!stored) return;

    const purchases = JSON.parse(stored);
    const items = purchases.flatMap((purchase: any) =>
      purchase.items.map((item: any) => ({
        id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        costPrice: Number(item.costPrice),
        isSerialized: item.product.isSerialized || false,
        hasExpiry: item.product.hasExpiry || false,
        serials: Array(item.quantity).fill(""),
        batch: item.product.hasExpiry
          ? { batchNumber: "", expiryDate: "" }
          : undefined,
      })),
    );

    setCart(items);
    if (purchases.length > 0) {
      setSupplierId(purchases[0].supplierId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const data = await searchProducts(search);
        setResults(data);
      } catch (err: any) {
        console.error(err);
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  // ADD PRODUCT
  function addProduct(product: any) {
    const exists = cart.find((p) => p.id === product.id);

    if (exists) {
      setCart((prev) =>
        prev.map((p) => {
          if (p.id === product.id) {
            const newQty = p.quantity + 1;
            return {
              ...p,
              quantity: newQty,
              // Si es serializado, expandimos el array de seriales manteniendo los ya escritos
              serials: p.isSerialized ? [...p.serials, ""] : [],
            };
          }
          return p;
        }),
      );
    }
    {
      setCart((prev) => [
        ...prev,
        {
          id: product.id,
          name: product.name,
          quantity: 1,
          costPrice: Number(product.costPrice),
          isSerialized: product.isSerialized || false,
          hasExpiry: product.hasExpiry || false,
          serials: product.isSerialized ? [""] : [],
          batch: product.hasExpiry
            ? { batchNumber: "", expiryDate: "" }
            : undefined,
        },
      ]);
    }

    setSearch("");
    setResults([]);
  }

  // UPDATE ITEM FIELDS (Maneja cambios de Inputs normales y estructuras anidadas)
  function updateItem(id: string, field: string, value: any) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (field === "quantity") {
          const numeric = Number(value);
          if (numeric < 0) return item;

          let newSerials = [...item.serials];
          if (item.isSerialized) {
            if (numeric > newSerials.length) {
              newSerials = [
                ...newSerials,
                ...Array(numeric - newSerials.length).fill(""),
              ];
            } else {
              newSerials = newSerials.slice(0, numeric);
            }
          }
          return { ...item, quantity: numeric, serials: newSerials };
        }

        if (field === "costPrice") {
          const numeric = Number(value);
          if (numeric < 0) return item;
          return { ...item, costPrice: numeric };
        }

        // Caso específico para modificar un IMEI en un índice exacto
        if (field === "serial_change") {
          const { index, text } = value;
          const updatedSerials = [...item.serials];
          updatedSerials[index] = text;
          return { ...item, serials: updatedSerials };
        }

        // Caso específico para modificar propiedades de los lotes
        if (field === "batch_change") {
          return { ...item, batch: { ...item.batch, ...value } };
        }

        return { ...item, [field]: value };
      }),
    );
  }

  // REMOVE
  function removeItem(id: string) {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }

  // TOTAL
  const total = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity * item.costPrice, 0);
  }, [cart]);

  // SUBMIT
  async function handleSubmit() {
    try {
      if (!supplierId) return toast.error("Select supplier");
      if (cart.length === 0) return toast.error("Add products");

      // Validar datos requeridos en el cliente antes de disparar al backend
      for (const item of cart) {
        if (item.isSerialized) {
          if (
            item.serials.length !== item.quantity ||
            item.serials.some((s: string) => !s.trim())
          ) {
            return toast.error(
              `Please provide all serial numbers for: ${item.name}`,
            );
          }
        }
        if (item.hasExpiry) {
          if (!item.batch?.batchNumber?.trim() || !item.batch?.expiryDate) {
            return toast.error(
              `Please complete batch details for: ${item.name}`,
            );
          }
        }
      }

      setLoading(true);

      const payload = {
        supplierId,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          costPrice: item.costPrice,
          // Enviar serials formateados solo si aplica
          ...(item.isSerialized
            ? {
                serials: item.serials.map((s: string) =>
                  s.trim().toUpperCase(),
                ),
              }
            : {}),
          // Enviar lote solo si aplica
          ...(item.hasExpiry ? { batch: item.batch } : {}),
        })),
      };

      await createPurchase(payload);
      toast.success("Purchase created successfully!");
      setCart([]);
      setSupplierId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save purchase");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 p-6">
        {/* HEADER */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Purchase</h1>
            <p className="text-gray-500">Register supplier purchases</p>
          </div>
          <Link
            href="/purchases"
            className="bg-gray-800 text-white px-5 py-3 rounded-2xl hover:opacity-90 transition"
          >
            Purchase history
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* LEFT: BUSCADOR Y TARJETAS */}
          <div className="lg:col-span-2 bg-white rounded-3xl border p-6">
            <h2 className="text-gray-700 text-xl font-bold mb-6">Products</h2>
            <div className="mb-6">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full border rounded-2xl p-4 outline-none text-gray-700 focus:border-black"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {results.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addProduct(product)}
                  className="border rounded-2xl p-4 text-left hover:border-black transition flex gap-4 items-center bg-white"
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {product.name}
                    </h3>
                    {product.sku && (
                      <p className="text-xs text-gray-400 mt-1">
                        SKU: {product.sku}
                      </p>
                    )}
                    <p className="text-sm text-gray-700 mt-1">
                      Cost: RD$ {Number(product.costPrice).toFixed(2)}
                    </p>
                    <div className="flex gap-1 flex-wrap mt-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          product.stock <= 0
                            ? "bg-red-100 text-red-600"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        Stock: {product.stock}
                      </span>
                      {product.isSerialized && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          IMEI
                        </span>
                      )}
                      {product.hasExpiry && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          Lote
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: DETALLES Y CARRITO */}
          <div className="bg-white rounded-3xl border p-6 shadow-sm">
            <h2 className="text-gray-700 text-xl font-bold mb-6">
              Purchase Details
            </h2>

            {/* SUPPLIER */}
            <div className="mb-6">
              <label className="block text-sm mb-2 text-gray-700 font-medium">
                Supplier
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full border rounded-2xl p-3 outline-none text-gray-600 bg-gray-50"
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            {/* LISTA CARRITO */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-2xl p-4 bg-gray-50/50 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {item.name}
                      </h3>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.id, "quantity", e.target.value)
                        }
                        className="w-full border rounded-xl p-2 text-gray-700 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">
                        Cost
                      </label>
                      <input
                        type="number"
                        value={item.costPrice}
                        onChange={(e) =>
                          updateItem(item.id, "costPrice", e.target.value)
                        }
                        className="w-full border rounded-xl p-2 text-gray-700 bg-white"
                      />
                    </div>
                  </div>

                  {/* FORMULARIO DINÁMICO: INPUTS DE SERIALES */}
                  {item.isSerialized && item.quantity > 0 && (
                    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-semibold text-blue-800">
                        Enter Serial / IMEI numbers:
                      </p>
                      <div className="space-y-1z.5 max-h-[150px] overflow-y-auto pr-1">
                        {Array.from({ length: item.quantity }).map((_, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs text-blue-400 font-mono w-5">
                              #{idx + 1}
                            </span>
                            <input
                              type="text"
                              placeholder="e.g. IMEI8392102"
                              value={item.serials[idx] || ""}
                              onChange={(e) =>
                                updateItem(item.id, "serial_change", {
                                  index: idx,
                                  text: e.target.value,
                                })
                              }
                              className="w-full border rounded-lg p-1.5 text-xs uppercase bg-white focus:border-blue-500 outline-none text-gray-700"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FORMULARIO DINÁMICO: INPUTS DE LOTE */}
                  {item.hasExpiry && (
                    <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <p className="text-xs font-semibold text-amber-800 mb-1">
                          Batch Information:
                        </p>
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Batch Number"
                          value={item.batch?.batchNumber || ""}
                          onChange={(e) =>
                            updateItem(item.id, "batch_change", {
                              batchNumber: e.target.value,
                            })
                          }
                          className="w-full border rounded-lg p-1.5 text-xs bg-white outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="date"
                          value={item.batch?.expiryDate || ""}
                          onChange={(e) =>
                            updateItem(item.id, "batch_change", {
                              expiryDate: e.target.value,
                            })
                          }
                          className="w-full border rounded-lg p-1.5 text-xs bg-white outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {cart.length === 0 && (
              <div className="text-center py-10 text-gray-500 border border-dashed rounded-2xl bg-gray-50">
                No products added
              </div>
            )}

            {/* TOTAL */}
            <div className="mt-6 border-t pt-6">
              <div className="flex justify-between text-xl font-bold">
                <span className="text-gray-700">Total</span>
                <span className="text-gray-900">RD$ {total.toFixed(2)}</span>
              </div>

              <button
                disabled={loading || cart.length === 0 || !supplierId}
                onClick={handleSubmit}
                className="w-full mt-6 bg-black text-white py-4 rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
              >
                {loading ? "Saving..." : "Create Purchase"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
