"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import CustomerSelector from "@/components/CustomerSelector";

type Props = {
  open: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (data: {
    paymentMethod: string;
    received: number;
    change: number;
    customTotal: number;
    customerId?: string;
    initialPayment?: number; // 🚀 RECONFIGURADO: Añadido al tipado de confirmación
  }) => Promise<void>;
  loading?: boolean;
};

export default function PaymentModal({
  open,
  onClose,
  total,
  onConfirm,
}: Props) {
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [received, setReceived] = useState("");
  const [customTotal, setCustomTotal] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [initialPayment, setInitialPayment] = useState(""); // 🚀 NUEVO: Controla el input del inicial en string

  const inputRef = useRef<HTMLInputElement>(null);

  // =========================
  // RESET MODAL STATE
  // =========================
  useEffect(() => {
    if (!open) return;

    setPaymentMethod("CASH");
    setReceived("");
    setCustomTotal(total.toFixed(2));
    setSelectedCustomerId("");
    setInitialPayment(""); // 🚀 Reseteamos el inicial al abrir
    setLoading(false);
  }, [open, total]);

  // =========================
  // AUTOFOCUS
  // =========================
  useEffect(() => {
    if (open && paymentMethod === "CASH") {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [open, paymentMethod]);

  // =========================
  // ESC CLOSE & ENTER CONFIRM
  // =========================
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!open) return;

      if (e.key === "Escape") {
        if (!loading) {
          onClose();
        }
      }

      if (e.key === "Enter") {
        handleConfirm();
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [
    open,
    loading,
    paymentMethod,
    received,
    customTotal,
    selectedCustomerId,
    initialPayment,
  ]); // 🚀 Track dinámico del inicial

  // =========================
  // VALUES
  // =========================
  const receivedNumber = Number(received || 0);
  const finalTotal = Number(customTotal || total);
  const initialPaymentNumber = Number(initialPayment || 0); // 🚀 Conversión segura a número

  // =========================
  // CHANGE
  // =========================
  const change = useMemo(() => {
    if (paymentMethod !== "CASH") {
      return 0;
    }

    const diff = receivedNumber - finalTotal;
    return diff > 0 ? diff : 0;
  }, [receivedNumber, finalTotal, paymentMethod]);

  // =========================
  // CONFIRM
  // =========================
  async function handleConfirm() {
    if (loading) return;
    

    try {
      // =========================
      // TOTAL VALIDATION
      // =========================
      if (finalTotal <= 0) {
        toast.error("Invalid sale total");
        return;
      }

      if (finalTotal > total) {
        toast.error("Custom total cannot exceed original total");
        return;
      }

      // =========================
      // CASH VALIDATION
      // =========================
      if (paymentMethod === "CASH") {
        if (Number.isNaN(receivedNumber)) {
          toast.error("Invalid cash amount");
          return;
        }

        if (receivedNumber <= 0) {
          toast.error("Invalid amount");
          return;
        }
      }

      // ==========================================
      // VALIDACIÓN CRÍTICA: CRÉDITO Y ABONOS ("FIAO")
      // ==========================================
      if (paymentMethod === "CREDIT") {
        if (!selectedCustomerId) {
          toast.error(
            "Para ventas a crédito es obligatorio asignar un Cliente.",
          );
          return;
        }

        if (Number.isNaN(initialPaymentNumber) || initialPaymentNumber < 0) {
          toast.error("Monto inicial no válido.");
          return;
        }

        if (initialPaymentNumber > finalTotal) {
          toast.error(
            "El pago inicial no puede ser mayor que el total de la venta.",
          );
          return;
        }
      }

      setLoading(true);

      await onConfirm({
        paymentMethod,
        // Si hay un inicial a crédito, ese efectivo físico entra, de lo contrario es 0
        received:
          paymentMethod === "CREDIT" ? initialPaymentNumber : receivedNumber,
        change: paymentMethod === "CREDIT" ? 0 : change,
        customTotal: finalTotal,
        customerId: paymentMethod === "CREDIT" ? selectedCustomerId : undefined,
        initialPayment: paymentMethod === "CREDIT" ? initialPaymentNumber : 0, // 🚀 SE ENVÍA EL MONTO AL POS INTERNO
      });

      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 overflow-y-auto flex justify-center px-4 py-10"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="bg-white w-[500px] mt-6 rounded-3xl p-8 shadow-2xl h-fit mb-10 border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TITLE */}
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          Complete Payment
        </h2>

        {/* ORIGINAL TOTAL */}
        <div className="bg-gray-100 rounded-2xl p-6 mb-4">
          <p className="text-gray-500 text-sm font-semibold">ORIGINAL TOTAL</p>
          <h1 className="text-5xl font-black text-black mt-2">
            RD${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </h1>
        </div>

        {/* CUSTOM TOTAL */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-500">
            Final Charged Total
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={customTotal}
            disabled={loading}
            onChange={(e) => setCustomTotal(e.target.value)}
            className="text-gray-800 font-bold w-full p-4 border border-gray-200 rounded-2xl mt-2 text-2xl disabled:bg-gray-100 focus:ring-2 focus:ring-black outline-none transition"
          />
        </div>

        {/* METHODS GRID */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {["CASH", "CARD", "TRANSFER", "CREDIT"].map((method) => (
            <button
              key={method}
              disabled={loading}
              onClick={() => {
                setPaymentMethod(method);
                if (method !== "CREDIT") {
                  setSelectedCustomerId("");
                  setInitialPayment(""); // Reseteamos inicial si sale de Crédito
                }
              }}
              className={`p-4 rounded-2xl border font-bold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${
                paymentMethod === method
                  ? method === "CREDIT"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100"
                    : "bg-black text-white border-black shadow-md shadow-gray-200"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {method === "CREDIT" ? "💳 CREDIT (FIAO)" : method}
            </button>
          ))}
        </div>

        {/* 🔥 SECCIÓN DE CRÉDITO ENRIQUECIDA (SELECTOR + INPUT INICIAL) */}
        {paymentMethod === "CREDIT" && (
          <div className="mb-6 p-4 bg-blue-50/60 border border-blue-100 rounded-2xl animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div>
              <label className="text-xs font-bold text-blue-900 uppercase tracking-wider block mb-2">
                Asignar Deudor
              </label>
              <CustomerSelector
                selectedCustomerId={selectedCustomerId}
                onSelectCustomer={setSelectedCustomerId}
              />
            </div>

            {/* 🚀 NUEVO INPUT: MONTO INICIAL COBRADO EN EL POS */}
            <div className="border-t border-blue-100 pt-3">
              <label className="text-xs font-bold text-blue-900 uppercase tracking-wider block mb-1.5">
                Monto Inicial / Avance (Opcional)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-400 font-bold text-base">RD$</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={finalTotal}
                  step="any"
                  value={initialPayment}
                  disabled={loading}
                  onChange={(e) => setInitialPayment(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-14 pr-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-bold text-lg outline-none transition"
                />
              </div>
            </div>

            {/* Resumen dinámico financiero en caliente */}
            <div className="flex justify-between items-center pt-2 text-xs border-t border-blue-100/70">
              <span className="text-blue-800/80 font-medium">
                Balance neto a financiar en CxC:
              </span>
              <span className="font-extrabold text-red-600 text-sm">
                RD${" "}
                {(finalTotal - initialPaymentNumber).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        )}

        {/* CASH INPUT */}
        {paymentMethod === "CASH" && (
          <div className="mb-6 animate-in fade-in zoom-in-95 duration-150">
            <label className="text-sm font-medium text-gray-500">
              Cash Received
            </label>
            <input
              ref={inputRef}
              type="number"
              min="0"
              step="0.01"
              value={received}
              disabled={loading}
              onChange={(e) => setReceived(e.target.value)}
              className="text-gray-800 font-bold w-full p-4 border border-gray-200 rounded-2xl mt-2 text-2xl focus:ring-2 focus:ring-black outline-none transition placeholder-gray-300"
              placeholder="0.00"
            />

            {/* CHANGE */}
            <div className="mt-4 bg-green-50 rounded-2xl p-4 border border-green-100">
              <p className="text-green-700 text-xs font-bold uppercase tracking-wider">
                Change
              </p>
              <h2 className="text-3xl font-black text-green-700 mt-0.5">
                RD${change.toFixed(2)}
              </h2>
            </div>
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex gap-3 mt-8">
          <button
            disabled={loading}
            onClick={onClose}
            className="flex-1 p-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            Cancel
          </button>

          <button
            disabled={loading}
            onClick={handleConfirm}
            className="flex-1 p-4 rounded-2xl bg-black hover:opacity-90 text-white font-extrabold text-sm shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? "Processing..." : "Confirm Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
