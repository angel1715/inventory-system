"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  ArrowLeft,
  UserPlus,
  Pencil,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  toggleCustomer,
} from "@/lib/api";

type Customer = {
  id: string;
  name: string;
  phone?: string;
  taxId?: string;
  maxCredit: number;
  currentDebt: number;
  active: boolean;
  createdAt: string;
};

type FormDataType = {
  name: string;
  phone: string;
  taxId: string;
  maxCredit: string;
};

const initialForm: FormDataType = {
  name: "",
  phone: "",
  taxId: "",
  maxCredit: "10000",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormDataType>(initialForm);

  // =========================
  // LOAD CUSTOMERS
  // =========================
  async function loadCustomers() {
    try {
      setLoading(true);
      const data = await getCustomers();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Error al cargar los clientes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  // =========================
  // OPEN CREATE MODAL
  // =========================
  function handleOpenCreate() {
    setEditingCustomer(null);
    setForm(initialForm);
    setOpen(true);
  }

  // =========================
  // OPEN EDIT MODAL
  // =========================
  function handleOpenEdit(customer: Customer) {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      phone: customer.phone || "",
      taxId: customer.taxId || "",
      maxCredit: customer.maxCredit.toString(),
    });
    setOpen(true);
  }

  // =========================
  // SAVE CUSTOMER (CREATE / UPDATE)
  // =========================
  async function handleSave() {
    if (saving) return;

    if (!form.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        taxId: form.taxId.trim() || undefined,
        maxCredit: Number(form.maxCredit) || 0,
      };

      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload);
        toast.success("Cliente actualizado exitosamente");
      } else {
        await createCustomer(payload);
        toast.success("Cliente creado exitosamente");
      }

      setOpen(false);
      setForm(initialForm);
      setEditingCustomer(null);
      await loadCustomers();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Error al guardar el cliente");
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // TOGGLE CUSTOMER STATUS
  // =========================
  async function handleToggle(customer: Customer) {
    try {
      await toggleCustomer(customer.id);
      toast.success(
        customer.active ? "Cliente deshabilitado" : "Cliente habilitado",
      );
      await loadCustomers();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "No se pudo cambiar el estado");
    }
  }

  return (
    <ProtectedRoute>
      <RoleGuard roles={["OWNER"]}>
        <div className="min-h-screen bg-gray-50 p-8 animate-in fade-in duration-200">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Clientes</h1>
              <p className="text-gray-500 mt-1">
                Administra las líneas de crédito, RNC/Cédula y estado de las
                cuentas de tus clientes.
              </p>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 transition px-5 py-3 rounded-2xl font-medium shadow-sm"
              >
                <ArrowLeft size={16} />
                Dashboard
              </Link>

              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-semibold hover:opacity-90 transition shadow-md"
              >
                <UserPlus size={18} />
                Agregar Cliente
              </button>
            </div>
          </div>

          {/* TABLA DE CLIENTES */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
            {loading ? (
              <div className="p-16 text-center text-gray-500 font-medium">
                Cargando listado de clientes...
              </div>
            ) : customers.length === 0 ? (
              <div className="p-16 text-center text-gray-500 font-medium">
                No hay clientes registrados en el sistema.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/70 border-b border-gray-100">
                    <tr>
                      <th className="p-4 text-sm font-bold text-gray-500">
                        Nombre
                      </th>
                      <th className="p-4 text-sm font-bold text-gray-500">
                        Teléfono
                      </th>
                      <th className="p-4 text-sm font-bold text-gray-500">
                        RNC / Cédula
                      </th>
                      <th className="p-4 text-sm font-bold text-gray-500">
                        Límite Crédito
                      </th>
                      <th className="p-4 text-sm font-bold text-gray-500">
                        Estado
                      </th>
                      <th className="p-4 text-sm font-bold text-gray-500 text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {customers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="p-4 font-bold text-gray-900">
                          {customer.name}
                        </td>
                        <td className="p-4 text-gray-600">
                          {customer.phone || "—"}
                        </td>
                        <td className="p-4 text-gray-600">
                          <span className="font-mono bg-gray-100/80 px-2 py-0.5 rounded text-xs text-gray-700">
                            {customer.taxId || "—"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-gray-900 font-semibold">
                              Límite: RD${" "}
                              {customer.maxCredit.toLocaleString("en-US")}
                            </span>
                            {customer.currentDebt > 0 ? (
                              <span className="text-red-600 text-xs font-bold mt-0.5">
                                Debe: RD${" "}
                                {customer.currentDebt.toLocaleString("en-US")}
                              </span>
                            ) : (
                              <span className="text-green-600 text-xs font-medium mt-0.5">
                                Al día (Sin deudas)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                              customer.active
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {customer.active ? (
                              <ShieldCheck size={12} />
                            ) : (
                              <ShieldAlert size={12} />
                            )}
                            {customer.active ? "ACTIVO" : "INACTIVO"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(customer)}
                              className="flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-xl text-xs font-bold transition"
                            >
                              <Pencil size={12} />
                              Editar
                            </button>

                            <button
                              onClick={() => handleToggle(customer)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm ${
                                customer.active
                                  ? "bg-red-500 hover:bg-red-600"
                                  : "bg-green-600 hover:bg-green-700"
                              }`}
                            >
                              {customer.active ? "Deshabilitar" : "Habilitar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* MODAL (CREAR / EDITAR) */}
          {open && (
            <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto p-6 backdrop-blur-sm">
              <div className="bg-white w-full max-w-xl rounded-3xl p-8 shadow-2xl mt-10 border border-gray-100 animate-in zoom-in-95 duration-150">
                <h2 className="text-3xl font-bold mb-6 text-gray-900">
                  {editingCustomer ? "Editar Cliente" : "Registrar Cliente"}
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
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
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
                        onChange={(e) =>
                          setForm({ ...form, phone: e.target.value })
                        }
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
                        onChange={(e) =>
                          setForm({ ...form, taxId: e.target.value })
                        }
                        placeholder="Ej: 101-00123-4"
                        className="w-full border border-gray-200 rounded-2xl p-4 mt-2 text-gray-700 outline-none focus:ring-2 focus:ring-black transition"
                      />
                    </div>
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
                      onChange={(e) =>
                        setForm({ ...form, maxCredit: e.target.value })
                      }
                      placeholder="10000"
                      className="w-full border border-gray-200 rounded-2xl p-4 mt-2 text-gray-700 font-semibold text-lg outline-none focus:ring-2 focus:ring-black transition"
                    />
                  </div>
                </div>

                {/* ACCIONES DEL MODAL */}
                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setOpen(false)}
                    disabled={saving}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 transition p-4 rounded-2xl font-semibold text-gray-700 disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-black hover:opacity-90 transition p-4 rounded-2xl font-bold text-white shadow-lg disabled:opacity-50"
                  >
                    {saving
                      ? "Guardando..."
                      : editingCustomer
                        ? "Actualizar Cambios"
                        : "Guardar Cliente"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </RoleGuard>
    </ProtectedRoute>
  );
}
