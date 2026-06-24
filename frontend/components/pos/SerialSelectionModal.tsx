"use client";

import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { getAvailableSerialsByProductId } from "@/lib/api";
import toast from "react-hot-toast";

interface SerialSelectionModalProps {
  open: boolean;
  product: any;
  onClose: () => void;
  onConfirm: (serials: string[]) => void;
}

export default function SerialSelectionModal({
  open,
  product,
  onClose,
  onConfirm,
}: SerialSelectionModalProps) {
  const [serials, setSerials] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargamos los seriales cada vez que el modal se abre
  useEffect(() => {
    async function loadSerials() {
      if (!open || !product?.id) return;

      try {
        setLoading(true);
        // Limpiamos selección previa al abrir
        setSelected([]);
        const data = await getAvailableSerialsByProductId(product.id);
        setSerials(data || []);
      } catch (error) {
        console.error(error);
        toast.error("Error al cargar los IMEIs disponibles");
      } finally {
        setLoading(false);
      }
    }

    loadSerials();
  }, [open, product?.id]);

  const toggleSerial = (serial: string) => {
    setSelected((prev) =>
      prev.includes(serial)
        ? prev.filter((s) => s !== serial)
        : [...prev, serial],
    );
  };

  const handleConfirm = () => {
    // Validación de seguridad: verificamos que los seriales seleccionados
    // sigan estando en la lista actual del servidor antes de cerrar el modal
    const stillValid = selected.every((s) => serials.includes(s));

    if (!stillValid) {
      toast.error(
        "Algunos seriales ya no están disponibles. Actualizando lista...",
      );
      setSelected([]);
      // Recargamos forzadamente
      async function refresh() {
        setLoading(true);
        const data = await getAvailableSerialsByProductId(product.id);
        setSerials(data || []);
        setLoading(false);
      }
      refresh();
      return;
    }

    onConfirm(selected);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Seleccionar IMEI / Serial
            </h3>
            <p className="text-xs text-gray-500 truncate max-w-[280px]">
              {product.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 bg-gray-200 p-1.5 rounded-xl transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="text-center text-sm text-gray-500 p-4">
              Cargando seriales...
            </div>
          ) : serials.length === 0 ? (
            <div className="text-center text-sm text-red-500 p-4 font-medium">
              No hay seriales disponibles para este producto.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {serials.map((serial) => {
                const isChecked = selected.includes(serial);
                return (
                  <button
                    key={serial}
                    onClick={() => toggleSerial(serial)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left font-mono text-xs font-bold transition ${
                      isChecked
                        ? "bg-black text-white border-black"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200"
                    }`}
                  >
                    <span>{serial}</span>
                    {isChecked && <Check size={14} className="text-white" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white border text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-100 transition"
          >
            Cancelar
          </button>
          <button
            disabled={selected.length === 0 || loading}
            onClick={handleConfirm}
            className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 transition"
          >
            Confirmar ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
}
