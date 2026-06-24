"use client";

import { useState } from "react";
import { openCash, closeCash, getCashSummary } from "@/lib/api";
import toast from "react-hot-toast";

export default function CashControl({ session, refresh }: any) {
  const [openingAmount, setOpeningAmount] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Función para cerrar
  async function handleClose() {
    const numericActual = Number(actualCash);
    const expected = summary?.expectedCash || 0;
    const difference = numericActual - expected;

    // 1. Validar descuadre en el frontend antes de enviar nada
    const isSquare = Math.abs(difference) <= 0.01;

    if (!isSquare && (!note || note.trim().length < 5)) {
      toast.error(
        "El monto no coincide. Debes justificar la diferencia (mínimo 5 caracteres).",
      );
      return;
    }

    if (!confirm(`¿Cerrar caja con RD$${actualCash}?`)) return;

    try {
      setLoading(true);

      // 2. Construir el payload dinámicamente
      // Si la caja está cuadrada, NO enviamos la nota.
      // Si hay descuadre, enviamos el objeto con la nota.
      const payload = isSquare
        ? { actualCash: numericActual }
        : { actualCash: numericActual, note: note.trim() };

      // Ajusta esta llamada según cómo reciba los argumentos tu función closeCash.
      // Si closeCash(monto, nota) acepta dos argumentos, hazlo así:
      await closeCash(numericActual, isSquare ? undefined : note.trim());

      toast.success("Caja cerrada exitosamente.");

      setSummary(null);
      setActualCash("");
      setNote("");
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Error al cerrar caja");
    } finally {
      setLoading(false);
    }
  }

  // Detectar cambio en el monto físico para limpiar la nota si se cuadra
  const handleActualCashChange = (val: string) => {
    setActualCash(val);
    const diff = Math.abs(Number(val) - (summary?.expectedCash || 0));
    if (diff <= 0.01) {
      setNote(""); // Limpiamos la nota si el usuario corrige el monto al esperado
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Control de Caja</h2>

      {session ? (
        <div className="space-y-4">
          <p className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded-lg inline-block">
            ● SESIÓN ABIERTA
          </p>

          {!summary ? (
            <button
              onClick={async () => {
                setLoading(true);
                setSummary(await getCashSummary());
                setLoading(false);
              }}
              className="w-full bg-gray-900 text-white p-3 rounded-xl hover:bg-black transition"
            >
              Iniciar Arqueo de Cierre
            </button>
          ) : (
            <div className="space-y-3 border-t pt-4">
              <p className="text-gray-600">
                Esperado:{" "}
                <span className="font-bold text-gray-900">
                  RD${summary.expectedCash.toFixed(2)}
                </span>
              </p>

              <input
                type="number"
                placeholder="Monto físico contado"
                value={actualCash}
                onChange={(e) => handleActualCashChange(e.target.value)}
                className="text-gray-700 w-full p-3 border rounded-xl"
              />

              {actualCash && (
                <div
                  className={`p-3 rounded-xl font-bold ${Math.abs(Number(actualCash) - summary.expectedCash) > 0.01 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
                >
                  Diferencia: RD${" "}
                  {(Number(actualCash) - summary.expectedCash).toFixed(2)}
                </div>
              )}

              {Math.abs(Number(actualCash) - summary.expectedCash) > 0.01 && (
                <textarea
                  placeholder="Justificación del descuadre..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="text-gray-700 w-full p-3 border rounded-xl"
                  rows={2}
                />
              )}

              <button
                disabled={loading}
                onClick={handleClose}
                className="w-full bg-red-600 text-white p-3 rounded-xl hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Procesando..." : "Confirmar Cierre de Caja"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <input
            type="number"
            placeholder="Monto inicial"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
            className="text-gray-700 w-full p-3 border rounded-xl"
          />
          <button
            onClick={async () => {
              await openCash(Number(openingAmount));
              refresh();
            }}
            className="w-full bg-black text-white p-3 rounded-xl"
          >
            Abrir Caja
          </button>
        </div>
      )}
    </div>
  );
}
