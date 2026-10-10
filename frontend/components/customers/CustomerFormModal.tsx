"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createCustomer, updateCustomer } from "@/lib/api";

type EditableCustomer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  maxCredit?: number;
};

type FormDataType = {
  name: string;
  phone: string;
  email: string;
  taxId: string;
  maxCredit: string;
};

const initialForm: FormDataType = {
  name: "",
  phone: "",
  email: "",
  taxId: "",
  maxCredit: "10000",
};

interface CustomerFormModalProps {
  open: boolean;
  customer?: EditableCustomer | null; // si viene, edita; si no, crea
  onClose: () => void;
  onSaved: (saved?: any) => void | Promise<void>;
}

export default function CustomerFormModal({
  open,
  customer,
  onClose,
  onSaved,
}: CustomerFormModalProps) {
  const [form, setForm] = useState<FormDataType>(initialForm);
  const [saving, setSaving] = useState(false);

  // Cada vez que se abre: carga los datos del cliente a editar o limpia el formulario
  useEffect(() => {
    if (!open) return;

    setForm(
      customer
        ? {
            name: customer.name,
            phone: customer.phone || "",
            email: customer.email || "",
            taxId: customer.taxId || "",
            maxCredit: String(customer.maxCredit ?? 0),
          }
        : initialForm,
    );
  }, [open, customer]);

  async function handleSave() {
    if (saving) return;

    if (!form.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    const email = form.email.trim();
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("El correo electrónico no es válido");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
                email: email || (customer ? null : undefined),
        taxId: form.taxId.trim() || undefined,
        maxCredit: Number(form.maxCredit) || 0,
      };

      const saved = customer
        ? await updateCustomer(customer.id, payload)
        : await createCustomer(payload);

      toast.success(
        customer
          ? "Cliente actualizado exitosamente"
          : "Cliente creado exitosamente",
      );

      await onSaved(saved);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Error al guardar el cliente");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto p-6 backdrop-blur-sm">
      <div className="bg-white w-full max-w-xl rounded-3xl p-8 shadow-2xl mt-10 border border-gray-100 animate-in zoom-in-95 duration-150">
        <h2 className="text-3xl font-bold mb-6 text-gray-900">
          {customer ? "Editar Cliente" : "Registrar Cliente"}
        </h2>

        <div className="space-y-5">
          {/* NOMBRE */}
          <div>
            <label className="text-sm font-semibold text-gray-600">
              Nombre Completo *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Juan Pérez"
              className="w-full border border-gray-200 rounded-2xl p-4 mt-2 text-gray-700 outline-none focus:ring-2 focus:ring-black transition"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TELÉFONO */}
            <div>
              <label className="text-sm font-semibold text-gray-600">
                Teléfono / Celular
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Ej: 809-555-0199"
                className="w-full border border-gray-200 rounded-2xl p-4 mt-2 text-gray-700 outline-none focus:ring-2 focus:ring-black transition"
              />
            </div>

            {/* RNC o CÉDULA */}
            <div>
              <label className="text-sm font-semibold text-gray-600">
                RNC o Cédula (Tax ID)
              </label>
              <input
                type="text"
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                placeholder="Ej: 101-00123-4"
                className="w-full border border-gray-200 rounded-2xl p-4 mt-2 text-gray-700 outline-none focus:ring-2 focus:ring-black transition"
              />
            </div>
          </div>

          {/* CORREO */}
          <div>
            <label className="text-sm font-semibold text-gray-600">
              Correo electrónico (opcional)
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Ej: juan@correo.com"
              className="w-full border border-gray-200 rounded-2xl p-4 mt-2 text-gray-700 outline-none focus:ring-2 focus:ring-black transition"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Se usa para avisarle cuando su reparación esté lista.
            </p>
          </div>

          {/* LÍMITE DE CRÉDITO */}
          <div>
            <label className="text-sm font-semibold text-gray-600">
              Límite de Crédito Autorizado (RD$)
            </label>
            <input
              type="number"
              min="0"
              step="500"
              value={form.maxCredit}
              onChange={(e) => setForm({ ...form, maxCredit: e.target.value })}
              placeholder="10000"
              className="w-full border border-gray-200 rounded-2xl p-4 mt-2 text-gray-700 font-semibold text-lg outline-none focus:ring-2 focus:ring-black transition"
            />
          </div>
        </div>

        {/* ACCIONES */}
        <div className="flex gap-3 mt-8">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-gray-100 hover:bg-gray-200 transition p-4 rounded-2xl font-semibold text-gray-700 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-black hover:opacity-90 transition p-4 rounded-2xl font-bold text-white shadow-lg disabled:opacity-50"
          >
            {saving
              ? "Guardando..."
              : customer
                ? "Actualizar Cambios"
                : "Guardar Cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}