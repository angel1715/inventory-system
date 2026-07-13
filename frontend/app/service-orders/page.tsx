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

  customer?: {
    name: string;
  };

  technician?: {
    name: string;
  };
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

      const text = `${order.ticketNumber}
        ${order.deviceBrand}
        ${order.deviceModel}
        ${order.customer?.name ?? ""}
        ${order.technician?.name ?? ""}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* ================= HEADER ================= */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="h-12 w-12 rounded-xl border bg-white hover:bg-gray-100 transition flex items-center justify-center"
          >
            <ArrowLeft size={22} />
          </button>

          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ClipboardList className="text-blue-600" />
              Órdenes de Servicio
            </h1>

            <p className="text-gray-500 mt-1">
              Gestiona todas las reparaciones de tu taller.
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push("/service-orders/create")}
          className="bg-blue-600 hover:bg-blue-700 transition text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2"
        >
          <Plus size={20} />
          Nueva Orden
        </button>
      </div>

      {/* ================= FILTROS ================= */}

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ticket, cliente, equipo o técnico..."
              className="w-full rounded-xl border pl-11 pr-4 py-3"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border p-3"
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

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-5">Ticket</th>

              <th className="p-5">Cliente</th>

              <th className="p-5">Equipo</th>

              <th className="p-5">Técnico</th>

              <th className="p-5">Estado</th>

              <th className="p-5">Total</th>

              <th className="p-5 text-center">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-16 text-gray-500">
                  Cargando órdenes...
                </td>
              </tr>
            )}

            {!loading && filteredOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-16 text-gray-500">
                  No existen órdenes para mostrar.
                </td>
              </tr>
            )}

            {!loading &&
              filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="p-5 font-bold">{order.ticketNumber}</td>

                  <td className="p-5">{order.customer?.name ?? "-"}</td>

                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
                        {DeviceIcon(order.deviceType)}
                      </div>

                      <div>
                        <div className="font-medium">{order.deviceBrand}</div>

                        <div className="text-sm text-gray-500">
                          {order.deviceModel}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="p-5">{order.technician?.name ?? "-"}</td>

                  <td className="p-5">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        STATUS_COLORS[order.status]
                      }`}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>

                  <td className="p-5 font-semibold">
                    RD$ {Number(order.totalAmount).toFixed(2)}
                  </td>

                  <td className="p-5">
                    <div className="flex justify-center">
                      <button
                        onClick={() =>
                          router.push(`/service-orders/${order.id}`)
                        }
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-blue-50 hover:border-blue-300 transition"
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
  );
}
