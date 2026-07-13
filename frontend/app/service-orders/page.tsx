"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Plus,
  Search,
  ClipboardList,
  Smartphone,
  Laptop,
  Monitor,
  Printer,
  Tv,
  Gamepad2,
  Package,
  Eye,
} from "lucide-react";

import toast from "react-hot-toast";

import { getServiceOrders } from "@/lib/api";

interface ServiceOrder {
  id: string;
  ticketNumber: string;
  deviceType?: string;
  deviceBrand: string;
  deviceModel: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  customer?: { name: string };
  technician?: { name: string };
}

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "bg-blue-100 text-blue-700",
  DIAGNOSING: "bg-yellow-100 text-yellow-700",
  WAITING_PARTS: "bg-orange-100 text-orange-700",
  REPAIRED: "bg-green-100 text-green-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Recibido",
  DIAGNOSING: "Diagnóstico",
  WAITING_PARTS: "Esperando Repuestos",
  REPAIRED: "Reparado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

function DeviceIcon(type?: string) {
  switch (type) {
    case "PHONE":
      return <Smartphone size={18} />;
    case "LAPTOP":
      return <Laptop size={18} />;
    case "PC":
      return <Monitor size={18} />;
    case "PRINTER":
      return <Printer size={18} />;
    case "TV":
      return <Tv size={18} />;
    case "CONSOLE":
      return <Gamepad2 size={18} />;
    default:
      return <Package size={18} />;
  }
}

export default function ServiceOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    async function loadOrders() {
      try {
        const data = await getServiceOrders();
        setOrders(data);
      } catch {
        toast.error("No fue posible cargar las órdenes.");
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "ALL" || order.status === statusFilter;

      const text =
        `${order.ticketNumber} ${order.deviceBrand} ${order.deviceModel} ${
          order.customer?.name ?? ""
        } ${order.technician?.name ?? ""}`.toLowerCase();

      return matchesStatus && text.includes(search.toLowerCase());
    });
  }, [orders, search, statusFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-slate-100 pb-12">
      <div className="max-w-7xl mx-auto space-y-8 px-4 pt-8">
        {/* ================= HEADER ================= */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="h-12 w-12 rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50 transition flex items-center justify-center text-zinc-600 hover:text-zinc-900"
            >
              <ArrowLeft size={22} />
            </button>

            <div>
              <h1 className="text-4xl font-semibold text-zinc-900 tracking-tight flex items-center gap-3">
                <ClipboardList className="text-blue-600" />
                Órdenes de Servicio
              </h1>
              <p className="text-zinc-500 mt-1 text-lg">
                Gestiona todas las reparaciones de tu taller
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push("/service-orders/create")}
            className="bg-gradient-to-br from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 transition text-white px-6 py-3.5 rounded-2xl font-semibold flex items-center gap-2 shadow-lg shadow-zinc-200 active:scale-[0.985]"
          >
            <Plus size={20} />
            Nueva Orden
          </button>
        </div>

        {/* ================= FILTROS ================= */}
        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6">
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="relative group">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-600 transition-colors"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por ticket, cliente, equipo o técnico..."
                className="w-full bg-white border border-zinc-200 rounded-2xl pl-11 pr-4 py-4 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-4 text-zinc-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
            >
              <option value="ALL">Todos los estados</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ================= TABLA ================= */}
        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr className="text-left text-zinc-600">
                <th className="p-5 font-medium">Ticket</th>
                <th className="p-5 font-medium">Cliente</th>
                <th className="p-5 font-medium">Equipo</th>
                <th className="p-5 font-medium">Técnico</th>
                <th className="p-5 font-medium">Estado</th>
                <th className="p-5 font-medium">Total</th>
                <th className="p-5 text-center font-medium">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-zinc-500">
                    Cargando órdenes...
                  </td>
                </tr>
              )}

              {!loading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-zinc-500">
                    No existen órdenes para mostrar.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-zinc-100 hover:bg-zinc-50 transition"
                  >
                    <td className="p-5 font-semibold text-zinc-900">
                      {order.ticketNumber}
                    </td>

                    <td className="p-5 text-zinc-700">
                      {order.customer?.name ?? "-"}
                    </td>

                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-600">
                          {DeviceIcon(order.deviceType)}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-900">
                            {order.deviceBrand}
                          </div>
                          <div className="text-sm text-zinc-500">
                            {order.deviceModel}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-5 text-zinc-700">
                      {order.technician?.name ?? "-"}
                    </td>

                    <td className="p-5">
                      <span
                        className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[order.status]}`}
                      >
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>

                    <td className="p-5 font-semibold text-zinc-900">
                      RD$ {Number(order.totalAmount).toFixed(2)}
                    </td>

                    <td className="p-5">
                      <div className="flex justify-center">
                        <button
                          onClick={() =>
                            router.push(`/service-orders/${order.id}`)
                          }
                          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-zinc-200 hover:border-blue-300 hover:bg-blue-50 transition text-zinc-700 hover:text-blue-700"
                        >
                          <Eye size={18} />
                          Ver
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
