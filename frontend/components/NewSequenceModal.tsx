import { useState } from "react";
import toast from "react-hot-toast";

export default function NewSequenceModal({ isOpen, onClose, onCreated }: any) {
  const [form, setForm] = useState({
    type: "B01",
    prefix: "",
    startAt: 1,
    endAt: 100,
  });

  if (!isOpen) return null;

  async function handleSubmit() {
    try {
      // Aquí llamarías a tu endpoint POST /settings/sequences
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings/sequences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(form),
      });
      toast.success("Secuencia creada");
      onCreated(); // Recarga la lista en la página padre
      onClose();
    } catch (e) {
      toast.error("Error al crear");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl space-y-4">
        <h3 className="text-gray-900 text-xl font-bold">Nueva Secuencia NCF</h3>
        <select
          className="text-gray-800 w-full border p-3 rounded-xl"
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="B01">B01 - Facturas de Crédito Fiscal</option>
          <option value="B02">B02 - Facturas de Consumidor Final</option>
          <option value="B14">B14 - Notas de Crédito</option>
        </select>
        <input
          placeholder="Prefijo (ej: A01)"
          className="text-gray-800 w-full border p-3 rounded-xl"
          onChange={(e) => setForm({ ...form, prefix: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            placeholder="Inicio"
            className="text-gray-800 border p-3 rounded-xl"
            onChange={(e) =>
              setForm({ ...form, startAt: Number(e.target.value) })
            }
          />
          <input
            type="number"
            placeholder="Fin"
            className="text-gray-800 border p-3 rounded-xl"
            onChange={(e) =>
              setForm({ ...form, endAt: Number(e.target.value) })
            }
          />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 p-3 rounded-xl border bg-red-600 font-semibold hover:bg-red-500 transition">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 p-3 rounded-xl bg-black text-white hover:opacity-90 transition disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
