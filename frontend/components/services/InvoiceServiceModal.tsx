"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import toast from "react-hot-toast";

type Props = {
  open: boolean;
  onClose: () => void;
  total: number;

  loading: boolean;

  onConfirm: (data: {
    paymentMethod: string;
    received: number;
    change: number;
    ncfType?: string;
  }) => Promise<void>;
};

export default function InvoiceServiceModal({
  open,
  onClose,
  total,
  loading,
  onConfirm,
}: Props) {
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [received, setReceived] = useState("");
  const [ncfType, setNcfType] = useState("B02");

  const inputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------
  // RESET
  // -------------------------------------
  useEffect(() => {
    if (!open) return;

    setPaymentMethod("CASH");
    setReceived("");
    setNcfType("B02");
  }, [open]);

  // -------------------------------------
  // AUTOFOCUS
  // -------------------------------------
  useEffect(() => {
    if (open && paymentMethod === "CASH") {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open, paymentMethod]);

  // -------------------------------------
  // SHORTCUTS (Escape)
  // -------------------------------------
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!open) return;

      if (e.key === "Escape" && !loading) {
        onClose();
      }

      if (e.key === "Enter") {
        handleConfirm();
      }
    }

    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, loading, paymentMethod, received, ncfType]);

  // -------------------------------------
  // VALUES
  // -------------------------------------
  const receivedNumber = Number(received || 0);

  const change = useMemo(() => {
    if (paymentMethod !== "CASH") {
      return 0;
    }

    const diff = receivedNumber - total;
    return diff > 0 ? diff : 0;
  }, [receivedNumber, paymentMethod, total]);

  // -------------------------------------
  // CONFIRM
  // -------------------------------------
  async function handleConfirm() {
    if (loading) return;

    try {
      if (paymentMethod === "CASH") {
        if (receivedNumber <= 0) {
          toast.error("Monto recibido inválido.");
          return;
        }

        if (receivedNumber < total) {
          toast.error("El monto recibido es insuficiente.");
          return;
        }
      }

      await onConfirm({
        paymentMethod,
        received: paymentMethod === "CASH" ? receivedNumber : total,
        change: paymentMethod === "CASH" ? change : 0,
        ncfType,
      });

      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "No se pudo generar la factura.",
      );
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-xl p-8 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          Facturar Reparación
        </h2>

        {/* TOTAL */}
        <div className="bg-gray-100 rounded-2xl p-6 mb-6">
          <p className="text-gray-500 text-sm font-semibold">
            TOTAL DE LA REPARACIÓN
          </p>
          <h1 className="text-5xl font-black text-black mt-2">
            RD$
            {total.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </h1>
        </div>

        {/* MÉTODOS DE PAGO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {["CASH", "CARD", "TRANSFER"].map((method) => (
            <button
              key={method}
              type="button"
              disabled={loading}
              onClick={() => setPaymentMethod(method)}
              className={`p-4 rounded-2xl border font-bold transition ${
                paymentMethod === method
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {method === "CASH"
                ? "Efectivo"
                : method === "CARD"
                  ? "Tarjeta"
                  : "Transferencia"}
            </button>
          ))}
        </div>

        {/* TIPO DE NCF */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-500 mb-2">
            Tipo de NCF
          </label>
          <select
            value={ncfType}
            disabled={loading}
            onChange={(e) => setNcfType(e.target.value)}
            className="w-full border border-gray-200 rounded-2xl p-4 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="B02">B02 - Consumidor Final</option>

            <option value="B01">B01 - Crédito Fiscal</option>
          </select>
        </div>

        {/* MONTO RECIBIDO Y CAMBIO (SOLO EFECTIVO) */}
        {paymentMethod === "CASH" && (
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-500 block mb-2">
              Monto recibido
            </label>
            <input
              ref={inputRef}
              type="number"
              disabled={loading}
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-200 rounded-2xl p-4 text-2xl text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-black"
            />

            <div className="mt-4 bg-green-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-green-700">CAMBIO</p>
              <h2 className="text-3xl font-black text-green-700">
                RD$ {change.toFixed(2)}
              </h2>
            </div>
          </div>
        )}

        {/* BOTONES DE ACCIÓN */}
        <div className="flex items-center justify-end gap-3 mt-8">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-6 py-4 rounded-2xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className="px-6 py-4 rounded-2xl bg-black text-white font-bold hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center min-w-[140px]"
          >
            {loading ? "Procesando..." : "Confirmar Pago"}
          </button>
        </div>
      </div>
    </div>
  );
}
