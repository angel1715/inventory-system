"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import toast from "react-hot-toast";
import { trackImei } from "@/lib/api"; // Tu función de axios/fetch

// Helper rápido para formatear a Pesos Dominicanos
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(value);
};

export default function ImeiTrackerPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setData(null);

    try {
      // Llamada limpia usando tu estructura consistente
      const res = await trackImei(query.trim());
      setData(res);
      toast.success("Dispositivo localizado con éxito");
    } catch (err: any) {
      // Manejo de errores amigable si NestJS devuelve un 404
      const errorMessage =
        err.response?.data?.message ||
        "El IMEI no está registrado en el sistema.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 p-6">
        {/* HEADER */}
        <div className="max-w-4xl mx-auto mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Rastreador de Historial de Dispositivos
          </h1>
          <p className="text-gray-500">
            Escanea el código de barras o escribe el IMEI para auditar su ciclo
            de vida
          </p>
        </div>

        {/* SEARCH INPUT */}
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-3xl border shadow-sm mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Pasa el escáner o digita el IMEI (Ej: 35928210...)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full border bg-gray-50/50 rounded-2xl p-4 pl-12 outline-none text-gray-700 text-lg focus:border-black focus:bg-white transition"
                autoFocus
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">
                🔍
              </span>
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-black text-white px-8 rounded-2xl font-semibold hover:opacity-90 disabled:opacity-50 transition"
            >
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </form>
        </div>

        {/* RESULTS CARD */}
        {data && (
          <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6 animate-fadeIn">
            {/* IZQUIERDA: RESUMEN GENERAL */}
            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6 h-fit">
              {" "}
              {/* 👈 shadow-sm corregido */}
              <div>
                <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                  Artículo / Modelo
                </span>
                <h2 className="text-xl font-bold text-gray-900 mt-1">
                  {" "}
                  {/* 👈 text-gray-900 corregido */}
                  {data.product.name}
                </h2>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  SKU: {data.product.sku || "N/A"}
                </p>
              </div>
              <div className="border-t pt-4">
                <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                  IMEI Escaneado
                </span>
                <p className="text-lg font-mono font-bold text-gray-800 bg-gray-100 px-3 py-1.5 rounded-xl mt-1 inline-block">
                  {data.serial}
                </p>
              </div>
              <div className="border-t pt-4">
                <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                  Estado en Sistema
                </span>
                <div className="mt-1">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                      data.status === "SOLD"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-green-50 text-green-700 border-green-200"
                    }`}
                  >
                    {data.status === "SOLD"
                      ? "Vendido 📦"
                      : "Disponible en Stock ✅"}
                  </span>
                </div>
              </div>
            </div>

            {/* DERECHA: TIMELINE Y GARANTÍA */}
            <div className="md:col-span-2 space-y-6">
              {/* ALERTA DE GARANTÍA */}
              {data.warranty.active ? (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🛡️</span>
                    <div>
                      <h4 className="font-bold text-emerald-900 text-sm">
                        Garantía de Tienda Activa
                      </h4>
                      <p className="text-xs text-emerald-700">
                        Vence el{" "}
                        {new Date(data.warranty.expiresAt).toLocaleDateString(
                          "es-DO",
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="bg-emerald-600 text-white font-bold text-xs px-3 py-1 rounded-xl">
                    {data.warranty.daysLeft} Días Restantes
                  </span>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h4 className="font-bold text-red-900 text-sm">
                      Sin Cobertura de Garantía
                    </h4>
                    <p className="text-xs text-red-700">
                      {data.status === "SOLD"
                        ? "La garantía ya caducó para este dispositivo."
                        : "El dispositivo no ha sido vendido, por ende no tiene garantía activa."}
                    </p>
                  </div>
                </div>
              )}

              {/* CRONOLOGÍA DE MOVIMIENTOS */}
              <div className="bg-white p-6 rounded-3xl border shadow-sm">
                <h3 className="text-gray-900 font-bold text-lg mb-6">
                  Línea de Tiempo del Dispositivo
                </h3>

                <div className="relative border-l-2 border-gray-200 ml-4 space-y-8 pb-2">
                  {/* ENTRADA: COMPRA */}
                  {data.lifecycle.purchase ? (
                    <div className="relative pl-6">
                      <span className="absolute -left-[31px] top-1 bg-black text-white w-4 h-4 rounded-full border-4 border-white ring-4 ring-black/10" />
                      <div>
                        <span className="text-xs text-gray-400 font-medium">
                          {new Date(
                            data.lifecycle.purchase.date,
                          ).toLocaleString("es-DO")}
                        </span>
                        <h4 className="font-bold text-gray-900 text-base mt-0.5">
                          Entrada a Inventario (Compra)
                        </h4>
                        <div className="mt-2 bg-gray-50 border rounded-xl p-3 text-sm grid grid-cols-2 gap-2 text-gray-600">
                          <p>
                            🧾 Factura:{" "}
                            <span className="font-medium text-gray-900">
                              {data.lifecycle.purchase.invoiceNumber}
                            </span>
                          </p>
                          <p>
                            🏢 Proveedor:{" "}
                            <span className="font-medium text-gray-900">
                              {data.lifecycle.purchase.supplier}
                            </span>
                          </p>
                          <p className="col-span-2 border-t pt-1.5 mt-1">
                            💰 Costo Unitario:{" "}
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(
                                data.lifecycle.purchase.costPrice,
                              )}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative pl-6">
                      <span className="absolute -left-[31px] top-1 bg-amber-500 w-4 h-4 rounded-full border-4 border-white ring-4 ring-amber-100" />
                      <div>
                        <h4 className="font-bold text-amber-700 text-base">
                          Sin Registro de Compra
                        </h4>
                        <p className="text-xs text-amber-600">
                          Este IMEI probablemente fue cargado mediante un ajuste
                          manual inicial.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* SALIDA: VENTA */}
                  <div className="relative pl-6">
                    <span
                      className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 border-white ring-4 ${
                        data.lifecycle.sale
                          ? "bg-blue-600 ring-blue-100"
                          : "bg-gray-300 ring-gray-100"
                      }`}
                    />
                    <div>
                      {data.lifecycle.sale ? (
                        <>
                          <span className="text-xs text-blue-500 font-medium">
                            {new Date(data.lifecycle.sale.date).toLocaleString(
                              "es-DO",
                            )}
                          </span>
                          <h4 className="font-bold text-gray-900 text-base mt-0.5">
                            Despachado al Cliente (Venta)
                          </h4>
                          <div className="mt-2 bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-sm grid grid-cols-2 gap-2 text-gray-600">
                            <p>
                              📄 Factura Venta:{" "}
                              <span className="font-medium text-blue-950">
                                {data.lifecycle.sale.invoiceNumber}
                              </span>
                            </p>
                            <p>
                              👤 Cliente:{" "}
                              <span className="font-medium text-blue-950">
                                {data.lifecycle.sale.customer}
                              </span>
                            </p>
                            <p>
                              🧑‍💼 Vendedor:{" "}
                              <span className="font-medium text-blue-950">
                                {data.lifecycle.sale.seller}
                              </span>
                            </p>
                            <p className="col-span-2 border-t border-blue-100 pt-1.5 mt-1">
                              💵 Vendido por:{" "}
                              <span className="font-bold text-blue-950">
                                {formatCurrency(data.lifecycle.sale.price)}
                              </span>
                            </p>
                          </div>
                        </>
                      ) : (
                        <div>
                          <h4 className="font-bold text-gray-400 text-base">
                            Disponible para Venta
                          </h4>
                          <p className="text-xs text-gray-400">
                            Este dispositivo aún se encuentra físicamente en el
                            almacén esperando ser facturado.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
