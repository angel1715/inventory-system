import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { createSequence, updateSequence } from "@/lib/api";

const NCF_TYPES = [
  { value: "B01", label: "B01 - Facturas de Crédito Fiscal (papel)" },
  { value: "B02", label: "B02 - Facturas de Consumidor Final (papel)" },
  { value: "B14", label: "B14 - Regímenes Especiales (papel)" },
  { value: "B15", label: "B15 - Gubernamentales (papel)" },
  { value: "E31", label: "E31 - Factura de Crédito Fiscal Electrónica" },
  { value: "E32", label: "E32 - Factura de Consumo Electrónica" },
  { value: "E34", label: "E34 - Nota de Crédito Electrónica" },
  { value: "E45", label: "E45 - Comprobante para Exportaciones" },
];

function defaultExpiryDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}

function toDateInputValue(value: string) {
  return new Date(value).toISOString().split("T")[0];
}

export default function NewSequenceModal({ isOpen, onClose, onCreated, sequence }: any) {
  const isEditing = !!sequence;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: "B01",
    startAt: 1,
    endAt: 100,
    current: 1,
    expiryDate: defaultExpiryDate(),
  });

  useEffect(() => {
    if (isEditing) {
      setForm({
        type: sequence.type,
        startAt: sequence.startAt,
        endAt: sequence.endAt,
        current: sequence.current,
        expiryDate: toDateInputValue(sequence.expiryDate),
      });
    } else {
      setForm({
        type: "B01",
        startAt: 1,
        endAt: 100,
        current: 1,
        expiryDate: defaultExpiryDate(),
      });
    }
  }, [isEditing, sequence, isOpen]);

  if (!isOpen) return null;

  const prefix = form.type.charAt(0);

  async function handleSubmit() {
    try {
      setLoading(true);
      if (isEditing) {
        await updateSequence(sequence.id, {
          current: form.current,
          endAt: form.endAt,
          expiryDate: new Date(form.expiryDate).toISOString(),
        });
        toast.success("Secuencia actualizada");
      } else {
        await createSequence({
          type: form.type,
          prefix,
          startAt: form.startAt,
          endAt: form.endAt,
          expiryDate: new Date(form.expiryDate).toISOString(),
          active: true,
        });
        toast.success("Secuencia creada");
      }
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar la secuencia");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl space-y-4">
        <h3 className="text-gray-900 text-xl font-bold">
          {isEditing ? "Editar Secuencia NCF" : "Nueva Secuencia NCF"}
        </h3>

        {isEditing ? (
          <p className="text-sm text-gray-500">
            Tipo: <span className="font-semibold text-gray-800">{form.type}</span> · Prefijo:{" "}
            <span className="font-semibold text-gray-800">{prefix}</span> · Inicio del rango:{" "}
            <span className="font-semibold text-gray-800">{form.startAt}</span>
          </p>
        ) : (
          <>
            <select
              value={form.type}
              className="text-gray-800 w-full border p-3 rounded-xl"
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {NCF_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500">
              Prefijo: <span className="font-semibold">{prefix}</span>
            </p>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          {isEditing ? (
            <div>
              <label className="block mb-1 text-sm text-gray-600">
                Próximo número a emitir
              </label>
              <input
                type="number"
                value={form.current}
                className="text-gray-800 w-full border p-3 rounded-xl"
                onChange={(e) =>
                  setForm({ ...form, current: Number(e.target.value) })
                }
              />
            </div>
          ) : (
            <input
              type="number"
              value={form.startAt}
              placeholder="Inicio"
              className="text-gray-800 border p-3 rounded-xl"
              onChange={(e) =>
                setForm({ ...form, startAt: Number(e.target.value) })
              }
            />
          )}
          <div>
            {isEditing && (
              <label className="block mb-1 text-sm text-gray-600">
                Fin del rango
              </label>
            )}
            <input
              type="number"
              value={form.endAt}
              placeholder="Fin"
              className="text-gray-800 w-full border p-3 rounded-xl"
              onChange={(e) =>
                setForm({ ...form, endAt: Number(e.target.value) })
              }
            />
          </div>
        </div>
        <div>
          <label className="block mb-1 text-sm text-gray-600">
            Fecha de vencimiento del rango
          </label>
          <input
            type="date"
            value={form.expiryDate}
            className="text-gray-800 w-full border p-3 rounded-xl"
            onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
          />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 p-3 rounded-xl border bg-red-600 font-semibold hover:bg-red-500 transition">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 p-3 rounded-xl bg-black text-white hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
