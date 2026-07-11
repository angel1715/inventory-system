"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Package } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getProducts, toggleProduct } from "@/lib/api";
import toast from "react-hot-toast";
import RestockModal from "@/components/inventory/RestockModal";
import WriteOffModal from "@/components/inventory/WriteOffModal"; // Importación añadida
import OwnerRoute from "@/components/OwnerRoute";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Estados para los modales
  const [openRestock, setOpenRestock] = useState(false);
  const [openWriteOff, setOpenWriteOff] = useState(false);

  async function loadProducts() {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
      setFiltered(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    const filteredProducts = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q),
    );
    setFiltered(filteredProducts);
  }, [search, products]);

  async function handleToggle(id: string) {
    try {
      if (!confirm("Change product status?")) return;
      await toggleProduct(id);
      toast.success("Product updated");
      loadProducts();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <OwnerRoute>
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
            <p className="text-gray-500">Administra tu inventario</p>
          </div>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <Link
              href="/dashboard"
              className="bg-gray-800 text-white px-5 py-3 rounded-2xl hover:opacity-90 transition text-center w-full md:w-auto"
            >
              Dashboard
            </Link>
            <Link
              href="/products/new"
              className="bg-black text-white px-5 py-3 rounded-2xl hover:opacity-90 transition text-center w-full md:w-auto"
            >
              + Agregar Producto
            </Link>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-black text-gray-800"
          />
        </div>

        <div className="bg-white rounded-3xl border overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Carcando productos...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <Package className="w-14 h-14 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700">
                Productos no encontrado
              </h2>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 text-sm text-gray-500">
                      Producto
                    </th>
                    <th className="text-left p-4 text-sm text-gray-500">
                      Barcode
                    </th>
                    <th className="text-left p-4 text-sm text-gray-500">
                      Stock
                    </th>
                    <th className="text-left p-4 text-sm text-gray-500">
                      Costo
                    </th>
                    <th className="text-left p-4 text-sm text-gray-500">
                      Precio
                    </th>
                    <th className="text-right p-4 text-sm text-gray-500">
                      Actiones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => (
                    <tr
                      key={product.id}
                      className={`border-b hover:bg-gray-50 transition ${!product.active ? "opacity-50" : ""}`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={product.imageUrl || "/placeholder.png"}
                            alt={product.name}
                            className="w-14 h-14 rounded-xl object-cover border"
                          />
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {product.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {product.sku || "No SKU"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">
                        {product.barcode || "-"}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${product.stock === 0 ? "bg-red-600 text-white" : product.stock <= product.minStock ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}
                        >
                          {product.stock} units
                        </span>
                      </td>
                      <td className="p-4 text-gray-700">
                        RD$ {Number(product.costPrice).toFixed(2)}
                      </td>
                      <td className="p-4 font-semibold text-gray-900">
                        RD$ {Number(product.salePrice).toFixed(2)}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/products/edit/${product.id}`}
                            className="px-4 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm"
                          >
                            Editar
                          </Link>
                          <button
                            onClick={() => handleToggle(product.id)}
                            className={`px-4 py-2 rounded-xl text-sm ${product.active ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
                          >
                            {product.active ? "Disable" : "Enable"}
                          </button>

                          {/* BOTÓN WRITE-OFF */}
                          <button
                            disabled={!product.active || product.stock <= 0}
                            onClick={() => {
                              setSelectedProduct(product);
                              setOpenWriteOff(true);
                            }}
                            className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm hover:bg-red-100 disabled:opacity-50"
                          >
                            Write-off
                          </button>

                          {/* BOTÓN RESTOCK */}
                          <button
                            disabled={!product.active}
                            onClick={() => {
                              setSelectedProduct(product);
                              setOpenRestock(true);
                            }}
                            className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm disabled:opacity-50"
                          >
                            Restock
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* MODALES */}
              <RestockModal
                open={openRestock}
                product={selectedProduct}
                onClose={() => setOpenRestock(false)}
                refresh={loadProducts}
              />
              <WriteOffModal
                open={openWriteOff}
                product={selectedProduct}
                onClose={() => setOpenWriteOff(false)}
                refresh={loadProducts}
              />
            </div>
          )}
        </div>
      </div>
    </OwnerRoute>
  );
}
