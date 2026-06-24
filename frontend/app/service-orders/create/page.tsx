"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCustomers, getUsers, createServiceOrder } from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, ArrowLeft } from "lucide-react";

export default function CreateServiceOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [c, u] = await Promise.all([getCustomers(), getUsers()]);
        setCustomers(c);
        setUsers(u.filter((user: any) => user.active));
      } catch (err) {
        toast.error("Error al cargar los datos iniciales");
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      await createServiceOrder(data);
      toast.success("Orden creada exitosamente");
      router.push("/service-orders");
    } catch (err: any) {
      toast.error(err.message || "Error al crear la orden");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        {/* Botón de retroceso */}
        <button
          onClick={() => router.back()}
          className="p-3 bg-gray-100 rounded-2xl text-gray-600 hover:bg-gray-200 transition-all"
          aria-label="Regresar"
        >
          <ArrowLeft size={24} />
        </button>

        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Nueva Orden de Servicio
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Registra un nuevo equipo para reparación
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-5">
          {/* CLIENTE */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Cliente
            </label>
            <select
              name="customerId"
              required
              className="w-full border border-gray-200 rounded-2xl p-3 outline-none focus:ring-2 focus:ring-black text-gray-700"
            >
              <option value="">Seleccionar cliente...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* TÉCNICO */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Técnico Asignado
            </label>
            <select
              name="technicianId"
              className="w-full border border-gray-200 rounded-2xl p-3 outline-none focus:ring-2 focus:ring-black text-gray-700"
            >
              <option value="">Seleccionar técnico...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* MARCA / MODELO */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Marca
            </label>
            <input
              name="deviceBrand"
              required
              className="w-full border border-gray-200 rounded-2xl p-3 outline-none focus:ring-2 focus:ring-black text-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Modelo
            </label>
            <input
              name="deviceModel"
              required
              className="w-full border border-gray-200 rounded-2xl p-3 outline-none focus:ring-2 focus:ring-black text-gray-700"
            />
          </div>

          {/* SERIAL / IMEI */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Serial o IMEI
            </label>
            <input
              name="serialOrImei"
              className="w-full border border-gray-200 rounded-2xl p-3 outline-none focus:ring-2 focus:ring-black text-gray-700"
            />
          </div>

          {/* PROBLEMA */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Problema reportado
            </label>
            <textarea
              name="problem"
              rows={3}
              required
              className="w-full border border-gray-200 rounded-2xl p-3 outline-none focus:ring-2 focus:ring-black text-gray-700"
            />
          </div>
        </div>

        {/* ACCIONES */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-red-600 border border-gray-300 py-4 rounded-2xl font-semibold hover:bg-red-500 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-black text-white py-4 rounded-2xl font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear Orden"}
          </button>
        </div>
      </form>
    </div>
  );
}
