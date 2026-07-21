"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { sendSaleEcf, refreshSaleEcf } from "@/lib/api";

const ECF_STATUS_LABEL: Record<string, string> = {
  init: "Pendiente de envío",
  sent: "Enviado a la DGII",
  success: "Aprobado por la DGII",
  conditional: "Aprobación condicional",
  failure: "Rechazado / error",
};

type Props = {
  sale: any;
  onUpdated?: (sale: any) => void;
};

export default function EcfStatusCard({ sale, onUpdated }: Props) {
  const [loading, setLoading] = useState(false);

  if (!sale?.ecfStatus) return null;

  async function handleResend() {
    try {
      setLoading(true);
      const updated = await sendSaleEcf(sale.id);
      toast.success("Reenviado al conector e-CF");
      onUpdated?.(updated);
    } catch (err: any) {
      toast.error(err.message || "No se pudo reenviar a la DGII");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    try {
      setLoading(true);
      const updated = await refreshSaleEcf(sale.id, true);
      toast.success("Estado actualizado");
      onUpdated?.(updated);
    } catch (err: any) {
      toast.error(err.message || "No se pudo consultar el estado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="print:hidden w-[300px] mb-3 rounded-xl border bg-white p-3 text-sm">
      <div className="flex items-center justify-between">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            sale.ecfStatus === "success"
              ? "bg-green-100 text-green-700"
              : sale.ecfStatus === "failure"
              ? "bg-red-100 text-red-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          e-CF: {ECF_STATUS_LABEL[sale.ecfStatus] || sale.ecfStatus}
        </span>
      </div>
      {sale.ecfMessage && (
        <p className="text-xs text-gray-500 mt-2">{sale.ecfMessage}</p>
      )}
      <div className="flex gap-2 mt-3">
        {sale.ecfStatus === "failure" && (
          <button
            onClick={handleResend}
            disabled={loading}
            className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-black text-white disabled:opacity-50"
          >
            Reenviar a DGII
          </button>
        )}
        {sale.ecfStatus !== "success" && (
          <button
            onClick={handleRefresh}
            disabled={loading || !sale.ecfInvoiceId}
            title={
              !sale.ecfInvoiceId
                ? "Aún no tenemos el invoice_id del conector para esta venta"
                : undefined
            }
            className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg border disabled:opacity-50"
          >
            Consultar estado
          </button>
        )}
      </div>
    </div>
  );
}
