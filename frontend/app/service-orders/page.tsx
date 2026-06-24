"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getServiceOrders } from "@/lib/api";
import { Plus, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

export default function ServiceOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        const data = await getServiceOrders();
        setOrders(data);
      } catch (err) {
        toast.error("Error al cargar las órdenes");
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  return (
    // Background claro (bg-gray-50) para un contraste limpio
    <div className="p-8 max-w-6xl mx-auto min-h-screen bg-gray-50">
      {/* HEADER: Títulos Oscuros */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          {/* Botón de retroceso */}
          <button
            onClick={() => router.back()} // O router.push('/dashboard') si prefieres forzar esa ruta
            className="p-3 bg-gray-100 rounded-2xl text-gray-600 hover:bg-gray-200 transition-all"
          >
            <ArrowLeft size={24} />
          </button>

          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Órdenes de Servicio
            </h1>
            <p className="text-gray-600 mt-1">
              Gestiona las reparaciones y estados de equipos
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push("/service-orders/create")}
          className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
        >
          <Plus size={20} /> Nueva Orden
        </button>
      </div>

      {/* TABLA: Tarjeta clara, contenido oscuro */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100/50">
            <tr>
              <th className="p-5 font-bold text-gray-700">Ticket</th>
              <th className="p-5 font-bold text-gray-700">Dispositivo</th>
              <th className="p-5 font-bold text-gray-700">Estatus</th>
              <th className="p-5 font-bold text-gray-700">Total</th>
              <th className="p-5 font-bold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="p-5 font-extrabold text-gray-900">
                    {order.ticketNumber}
                  </td>
                  <td className="p-5 text-gray-700 font-medium">
                    {order.deviceBrand} {order.deviceModel}
                  </td>
                  <td className="p-5">
                    <span className="bg-gray-900 text-white px-3 py-1 rounded-full text-xs font-bold">
                      {order.status}
                    </span>
                  </td>
                  <td className="p-5 font-semibold text-gray-900">
                    RD$ {order.totalAmount}
                  </td>
                  <td className="p-5">
                    <button
                      onClick={() => router.push(`/service-orders/${order.id}`)}
                      className="text-gray-900 font-bold hover:text-blue-600 transition"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
