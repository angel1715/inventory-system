"use client";

import { useEffect, useState } from "react";
import { getPurchaseById } from "@/lib/api";
import { X, Eye, ShieldCheck, HelpCircle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface PurchaseDetailModalProps {
  purchaseId: string;
  onClose: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(value);
};

export default function PurchaseDetailModal({
  purchaseId,
  onClose,
}: PurchaseDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState<any>(null);

  useEffect(() => {
    async function loadDetails() {
      try {
        setLoading(true);
        const data = await getPurchaseById(purchaseId);
        setPurchase(data);
      } catch (err) {
        toast.error("No se pudieron cargar los detalles de la compra.");
        onClose();
      } finally {
        setLoading(false);
      }
    }
    if (purchaseId) loadDetails();
  }, [purchaseId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gray-800 p-6 rounded-2xl text-white font-medium shadow-xl animate-pulse">
          Cargando artículos de la factura...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* HEADER DEL MODAL */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-850">
          <div>
            <h3 className="text-xl font-bold text-white">
              Detalle de Factura de Compra
            </h3>
            <p className="text-sm text-gray-400 font-mono mt-0.5">
              ID: {purchaseId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white bg-gray-800 p-2 rounded-xl transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* RESUMEN DE CABECERA */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-800/50 p-4 rounded-2xl border border-gray-800 text-sm">
            <div>
              <span className="text-gray-400 block text-xs uppercase font-bold mb-0.5">
                Proveedor
              </span>
              <span className="text-white font-medium text-base">
                {purchase?.supplier?.name || "No especificado"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs uppercase font-bold mb-0.5">
                Fecha de Registro
              </span>
              <span className="text-white font-medium text-base">
                {purchase?.createdAt
                  ? new Date(purchase.createdAt).toLocaleString("es-DO")
                  : "---"}
              </span>
            </div>
            <div className="col-span-2 md:col-span-1">
              <span className="text-gray-400 block text-xs uppercase font-bold mb-0.5">
                Total Invertido
              </span>
              <span className="text-emerald-400 font-bold text-base">
                {formatCurrency(purchase?.total || 0)}
              </span>
            </div>
          </div>

          {/* TABLA DE ARTÍCULOS */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider text-gray-400 mb-3">
              Artículos Incluidos ({purchase?.items?.length || 0})
            </h4>
            <div className="border border-gray-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-850 text-gray-400 uppercase text-xs font-bold border-b border-gray-800">
                  <tr>
                    <th className="p-3">Artículo / Modelo</th>
                    <th className="p-3 text-center">Cant.</th>
                    <th className="p-3">Costo U.</th>
                    <th className="p-3">Identificadores (IMEI / Lote)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {purchase?.items?.map((item: any) => {
                    // Soportamos tanto 'isSerialized' como 'hasImei' por seguridad, y verificamos si viene un array o string de seriales
                    const isSerialized =
                      item.product?.isSerialized ||
                      item.product?.hasImei ||
                      !!item.serials ||
                      !!item.imei;
                    const hasExpiry = item.product?.hasExpiry || !!item.batch;

                    // Normalizamos los seriales a un array para poder renderizarlos limpiamente
                    let itemSerials: string[] = [];
                    if (Array.isArray(item.serials)) {
                      // Si viene como array de objetos { id, serial, ... }, extraemos solo el texto del serial
                      itemSerials = item.serials.map((s: any) =>
                        typeof s === "object" ? s.serial : s,
                      );
                    } else if (
                      typeof item.imei === "string" &&
                      item.imei.trim() !== ""
                    ) {
                      itemSerials = [item.imei];
                    } else if (item.imei && typeof item.imei === "object") {
                      // Por si el objeto relacional vino directamente en la propiedad imei
                      itemSerials = [item.imei.serial];
                    }

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-800/30 transition align-top"
                      >
                        <td className="p-3 font-medium text-white">
                          {item.product?.name || "Producto Removido"}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {item.quantity}
                        </td>
                        <td className="p-3 font-mono">
                          {formatCurrency(item.costPrice)}
                        </td>
                        <td className="p-3 space-y-1.5">
                          {/* CASO 1: PRODUCTO SERIALIZADO (IMEI) */}
                          {isSerialized && itemSerials.length > 0 ? (
                            <div className="flex flex-col gap-1.5">
                              {itemSerials.map((serial, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between gap-2 bg-blue-950/40 border border-blue-900/40 px-2 py-1 rounded-xl w-full max-w-[240px]"
                                >
                                  <span className="font-mono text-blue-400 text-xs font-bold flex items-center gap-1">
                                    <ShieldCheck
                                      size={12}
                                      className="flex-shrink-0"
                                    />
                                    {serial}
                                  </span>
                                  <Link
                                    href={`/dashboard/tracker?imei=${serial}`}
                                    className="text-[10px] bg-gray-800 hover:bg-white hover:text-black text-white px-2 py-0.5 rounded-lg transition font-medium flex items-center gap-1"
                                  >
                                    <Eye size={10} />
                                    Rastrear
                                  </Link>
                                </div>
                              ))}
                            </div>
                          ) : isSerialized && itemSerials.length === 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-amber-500 text-xs font-medium">
                              <HelpCircle size={12} />
                              Falta cargar IMEI
                            </span>
                          ) : null}

                          {/* CASO 2: PRODUCTO CON LOTE Y VENCIMIENTO */}
                          {hasExpiry && item.batch ? (
                            <div className="text-xs text-gray-400 space-y-0.5 font-mono bg-amber-950/20 border border-amber-900/30 p-2 rounded-xl max-w-[240px]">
                              <div>
                                <span className="text-amber-500 font-bold">
                                  Lote:
                                </span>{" "}
                                {item.batch.batchNumber || "N/A"}
                              </div>
                              <div>
                                <span className="text-amber-500 font-bold">
                                  Vence:
                                </span>{" "}
                                {item.batch.expiryDate
                                  ? new Date(
                                      item.batch.expiryDate,
                                    ).toLocaleDateString("es-DO")
                                  : "N/A"}
                              </div>
                            </div>
                          ) : null}

                          {/* CASO 3: ACCESORIO COMÚN */}
                          {!isSerialized && !hasExpiry && (
                            <span className="inline-flex items-center gap-1.5 text-gray-500 text-xs">
                              <HelpCircle size={12} />
                              Sin IMEI (Accesorio)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
