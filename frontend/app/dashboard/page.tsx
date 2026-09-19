"use client";

import { useEffect, useState } from "react";
import InvitationManager from "@/components/admin/InvitationManager";
import {
  TrendingUp,
  Wallet,
  HandCoins,
  ArrowUpRight,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  BadgeDollarSign,
  FileText,
} from "lucide-react";
import {
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Area,
  Legend,
} from "recharts";
import Link from "next/link";
import toast from "react-hot-toast";

import { useAuth } from "@/app/context/AuthContext";
import {
  getDashboard,
  getCashSession,
  getLowStockProducts,
  getSalesMetrics,
} from "@/lib/api";

import CashControl from "@/components/CashControl";
import RoleGuard from "@/components/RoleGuard";
import Receipt from "@/components/Receipt";
import AdminSubscriptionList from "@/components/admin/AdminSubscriptionList";
import SubscriptionManager from "@/components/admin/SubscriptionManager";

const COLORS = [
  "#6366f1",
  "#22d3ee",
  "#a855f7",
  "#f59e0b",
  "#ef4444",
  "#10b981",
];

function formatMoney(value: number) {
  return `RD$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [range, setRange] = useState<"today" | "week" | "month">("today");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [stats, setStats] = useState<any>(null);
  const [cash, setCash] = useState<any>(null);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Cambiamos la comparación de email por la validación de rol
    if (user?.role === "ADMIN") {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Función auxiliar para calcular fechas según el rango seleccionado
  const getDateRangeParams = (currentRange: "today" | "week" | "month") => {
    const now = new Date();
    let start = new Date();

    if (currentRange === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (currentRange === "week") {
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (currentRange === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1); // Primer día del mes actual
    }

    return {
      startDate: start.toISOString(),
      endDate: now.toISOString(),
    };
  };

  async function load(currentRange: typeof range) {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRangeParams(currentRange);

      const [dashboard, cashSession, lowStock, metrics] = await Promise.all([
        getDashboard(currentRange),
        getCashSession(),
        getLowStockProducts(),
        getSalesMetrics(startDate, endDate), // 👈 Llamamos a nuestro nuevo endpoint financiero
      ]);

      console.log("DASHBOARD RESPONSE:", dashboard); // 👈 Revisa esto en la consola del navegador
      console.log("METRICS RESPONSE:", metrics); // 👈 Y esto también

      setStats({
        ...dashboard,
        metrics, // 👈 Guardamos las métricas financieras avanzadas aquí
      });
      setCash(cashSession);
      setLowStockProducts(lowStock);
    } catch (err: any) {
      console.error("DASHBOARD ERROR:", err);
      toast.error(err?.message || "Error cargando métricas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(range);
  }, [range]);

  const safeSales = Array.isArray(stats?.salesByDay) ? stats.salesByDay : [];
  const safePayments = Array.isArray(stats?.paymentMethods)
    ? stats.paymentMethods
    : [];

  const chartPaymentData = [...safePayments];
  if (cash?.totalCreditPayments > 0) {
    chartPaymentData.push({
      method: "RECAUDACIÓN CxC",
      total: cash.totalCreditPayments,
    });
  }

  const realRevenue = stats?.revenue || 0;
  const realCashFlow = stats?.cashFlow || 0;
  const realProfit = stats?.profit || 0;
  const totalAccountsReceivable = stats?.accountsReceivable || 0;
  const creditNotCollected = stats?.creditPending || 0;

  const financialMetrics = stats?.metrics;
  const grossSales = financialMetrics?.revenue?.grossSales || realRevenue;
  const cashCollected = financialMetrics?.revenue?.cashCollected || 0;
  const totalCogs = financialMetrics?.costs?.cogs || 0;
  const totalLaborCost = financialMetrics?.costs?.laborCost || 0;
  const grossProfit =
    financialMetrics?.profitability?.grossProfit || realProfit;
  const profitMargin = financialMetrics?.profitability?.profitMargin || 0;

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-50">
        <RefreshCw className="w-10 h-10 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-semibold tracking-tighter text-zinc-900">
              Dashboard
            </h1>

            <p className="text-zinc-500 mt-1">
              Resumen en tiempo real •{" "}
              {mounted &&
                new Date().toLocaleDateString("es-ES", { dateStyle: "long" })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-white border border-zinc-200 rounded-2xl p-1 shadow-sm">
              {(["today", "week", "month"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${range === r ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
                >
                  {r === "today" ? "Hoy" : r === "week" ? "7 días" : "Mes"}
                </button>
              ))}
            </div>
            <Link
              href="/pos"
              className="bg-zinc-900 px-6 py-3 rounded-2xl font-semibold text-white flex items-center gap-2"
            >
              Nueva Venta <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            {
              label: "Efectivo Recaudado (Caja)",
              value: cashCollected, // 👈 Usamos el flujo de caja real por criterio de caja
              icon: <Wallet size={20} className="text-emerald-600" />,
            },
            {
              label: "Recaudado CxC Hoy",
              value: cash?.totalCreditPayments || 0,
              icon: <HandCoins size={20} className="text-blue-600" />,
            },
            {
              label: "Utilidad Bruta / Real",
              value: grossProfit,
              icon: <TrendingUp size={20} className="text-emerald-500" />,
            },
            {
              label: "Cuentas por Cobrar",
              value: totalAccountsReceivable,
              icon: <FileSpreadsheet size={20} className="text-amber-600" />,
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white border border-zinc-200 rounded-3xl p-6 hover:border-zinc-300 transition-all"
            >
              <div className="flex justify-between items-start">
                <p className="text-zinc-500 text-sm">{stat.label}</p>
                {stat.icon}
              </div>
              <p className="text-3xl font-semibold tracking-tighter mt-3 text-zinc-900">
                {stat.label.includes("Efectivo") && !cash
                  ? "Caja Cerrada"
                  : formatMoney(stat.value)}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Ventas Totales y Brutas */}
          <div className="col-span-12 lg:col-span-5 bg-gray-900 border border-zinc-200 rounded-3xl p-8 flex flex-col justify-between">
            <div>
              <p className="text-emerald-500 font-bold tracking-widest text-sm">
                VENTAS TOTALES (BRUTAS)
              </p>
              <p className="text-white text-5xl font-semibold mt-4">
                {formatMoney(grossSales)}
              </p>
            </div>

            {creditNotCollected > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-2xl text-sm w-fit">
                <AlertTriangle size={18} /> Pendiente:{" "}
                {formatMoney(creditNotCollected)}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-zinc-800 flex justify-between text-zinc-400 text-sm">
              <span>Margen de Utilidad:</span>
              <span className="text-emerald-400 font-bold">
                {Number(profitMargin).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Bloque derecho de Costos Operativos y Gastos */}
          <div className="col-span-12 lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-300 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-amber-600 font-bold text-sm">
                  COSTO DE VENTAS (COGS)
                </p>
                <p className="text-3xl font-semibold mt-2 text-zinc-900">
                  {formatMoney(totalCogs)}
                </p>
              </div>
              <p className="text-xs text-zinc-400 mt-4">
                Inversión en productos vendidos
              </p>
            </div>

            <div className="bg-white border border-zinc-300 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-blue-600 font-bold text-sm">
                  MANO DE OBRA (TALLER)
                </p>
                <p className="text-3xl font-semibold mt-2 text-zinc-900">
                  {formatMoney(totalLaborCost)}
                </p>
              </div>
              <p className="text-xs text-zinc-400 mt-4">
                Pagos a técnicos / servicios
              </p>
            </div>

            <div className="bg-white border border-zinc-300 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-red-600 font-bold text-sm">
                  GASTOS OPERATIVOS
                </p>
                <p className="text-3xl font-semibold mt-2 text-red-600">
                  {formatMoney(stats?.expenses || 0)}
                </p>
              </div>
              <p className="text-xs text-zinc-400 mt-4">
                Gastos generales registrados
              </p>
            </div>

            <div className="bg-white border border-zinc-300 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-zinc-500 font-bold text-sm">
                  ÓRDENES Y FACTURAS
                </p>
                <p className="text-3xl font-semibold mt-2 text-zinc-900">
                  {stats?.totalOrders || 0}
                </p>
              </div>
              <p className="text-xs text-zinc-400 mt-4">
                Transacciones en el periodo
              </p>
            </div>
          </div>
        </div>

        {/* GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 mt-12">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h3 className="text-gray-800 text-xl font-bold mb-6">
              Tendencia de Ventas
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={safeSales}>
                  <defs>
                    <linearGradient
                      id="salesGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                      <stop
                        offset="95%"
                        stopColor="#6366F1"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="#E5E7EB"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
                  />
                  <Tooltip
                    formatter={(v: any) => formatMoney(Number(v || 0))}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#6366F1"
                    strokeWidth={4}
                    fill="url(#salesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h3 className="text-gray-800 text-xl font-bold mb-6">
              Métodos de Pago
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartPaymentData}
                    dataKey="total"
                    nameKey="method"
                    innerRadius={75}
                    outerRadius={120}
                    paddingAngle={4}
                  >
                    {chartPaymentData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => formatMoney(Number(v || 0))}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* BAJO STOCK */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm mb-12">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl">
                <AlertTriangle size={28} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">
                  Bajo Stock
                </p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {lowStockProducts?.length || 0} Productos
                </h3>
              </div>
            </div>
          </div>
          {lowStockProducts?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lowStockProducts.slice(0, 4).map((prod: any) => (
                <div
                  key={prod.id}
                  className="flex justify-between items-center p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="font-medium text-gray-800">{prod.name}</p>
                    <p className="text-sm text-gray-500">Stock: {prod.stock}</p>
                  </div>
                  <span className="text-xs bg-red-100 text-red-700 font-bold px-4 py-2 rounded-xl">
                    REABASTECER
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-12 text-green-600 font-medium text-lg">
              ✅ Tu inventario se encuentra saludable
            </p>
          )}
        </div>

        {/* 👇 AQUÍ VA EL BLOQUE DE PRODUCTOS MÁS VENDIDOS BIEN ALINEADO */}
        <div className="bg-white border border-zinc-200 rounded-3xl p-8 mb-12 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-zinc-900">
                Productos y Servicios Más Vendidos
              </h3>
              <p className="text-sm text-zinc-500 mt-1">
                Artículos con mayor rotación en el periodo seleccionado
              </p>
            </div>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
              Top Ranking
            </span>
          </div>

          {stats?.topProducts && stats.topProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 text-xs text-zinc-400 uppercase tracking-wider">
                    <th className="pb-3 font-medium">#</th>
                    <th className="pb-3 font-medium">Producto / Servicio</th>
                    <th className="pb-3 font-medium text-center">
                      Unidades Vendidas
                    </th>
                    <th className="pb-3 font-medium text-right">
                      Ingreso Generado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 text-sm">
                  {stats.topProducts.map((product: any, index: number) => (
                    <tr
                      key={index}
                      className="hover:bg-zinc-50/50 transition-colors"
                    >
                      <td className="py-4 text-zinc-400 font-semibold w-12">
                        0{index + 1}
                      </td>
                      <td className="py-4 font-medium text-zinc-900">
                        {product.name}
                      </td>
                      <td className="py-4 text-center">
                        <span className="bg-zinc-100 text-zinc-800 px-2.5 py-1 rounded-xl text-xs font-semibold">
                          {product.totalSold} un.
                        </span>
                      </td>
                      <td className="py-4 text-right font-semibold text-zinc-900">
                        {formatMoney(product.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-400">
              <p className="text-sm">
                No hay registros de ventas suficientes en este rango de fechas.
              </p>
            </div>
          )}
        </div>
        {/* 👆 FIN DEL BLOQUE */}

        <div className="mt-12 pt-8 border-t border-zinc-200">
          <RoleGuard roles={["OWNER"]}>
            <CashControl session={cash} refresh={() => load(range)} />
          </RoleGuard>
        </div>

        {isAdmin && (
          <div className="space-y-8">
            {/* Sección de Invitaciones */}
            <div className="mt-8 pt-8 border-t border-dashed border-zinc-300">
              <h3 className="text-lg font-semibold mb-4">
                Gestión de Usuarios
              </h3>
              <InvitationManager />
            </div>

            {/* Sección de Suscripciones Pendientes */}
            <div className="mt-8 pt-8 border-t border-dashed border-zinc-300">
              <h3 className="text-lg font-semibold mb-4">
                Pagos de Suscripción
              </h3>
              <AdminSubscriptionList />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
              <SubscriptionManager />{" "}
            </div>
          </div>
        )}
      </div>{" "}
      {/* Cierre del contenedor principal max-w-7xl */}
    </div>
  );
}
