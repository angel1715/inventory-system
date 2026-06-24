
"use client";

import { useEffect, useState } from "react";
import {
  TrendingDown,
  Wallet,
  HandCoins,
  ArrowUpRight,
  Boxes,
  FileSpreadsheet,
  Info,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
  Area,
} from "recharts";
import Link from "next/link";
import toast from "react-hot-toast";

import { useAuth } from "@/app/context/AuthContext";
import {
  getDashboard,
  getCashSession,
  getLowStockProducts,
  getPurchaseRecommendations,
} from "@/lib/api";

import CashControl from "@/components/CashControl";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import { useRouter } from "next/navigation";
import SubscriptionGuard from "@/components/SubscriptionGuard";

const COLORS = [
  "#111827",
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
];

function formatMoney(value: number) {
  return `RD$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export default function DashboardPage() {
  const { loading: authLoading } = useAuth();
  const [range, setRange] = useState<"today" | "week" | "month">("today");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<any>(null);
  const [cash, setCash] = useState<any>(null);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [purchaseRecommendations, setPurchaseRecommendations] = useState<any[]>(
    [],
  );

  const { user } = useAuth();
  const subscriptionStatus = user?.subscriptionStatus;
  const router = useRouter();

  async function load(currentRange: typeof range) {
    try {
      setLoading(true);
      const [dashboard, cashSession, lowStock, recommendations] =
        await Promise.all([
          getDashboard(currentRange),
          getCashSession(),
          getLowStockProducts(),
          getPurchaseRecommendations(),
        ]);

      setStats(dashboard);
      setCash(cashSession);
      setLowStockProducts(lowStock);
      setPurchaseRecommendations(recommendations);
    } catch (err: any) {
      console.error("DASHBOARD ERROR:", err);
      toast.error(err?.message || "Error cargando métricas");
      setStats(null);
      setCash(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(range);
    const handleFocus = () => load(range);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [range]);

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 animate-spin text-gray-400" />
          <p className="text-gray-500 font-medium text-lg">
            Sincronizando analíticas del negocio...
          </p>
        </div>
      </div>
    );
  }

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

  const cxcRecaudadoHoy =
    stats?.paymentMethods?.find(
      (p: any) =>
        p.method === "CREDIT_COLLECTION" || p.method === "RECAUDACIÓN CxC",
    )?.total || 0;

  const creditNotCollected =
    (cash?.creditSales || 0) -
    (cash?.totalInitialPayments || 0) -
    cxcRecaudadoHoy;

  return (
    <ProtectedRoute>
      <SubscriptionGuard>
        <div className="min-h-screen bg-gray-50 p-6 md:p-8 lg:p-10 max-w-full overflow-x-hidden">
          {/* HEADER */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-12">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                Dashboard Analítico
              </h1>
              <p className="text-gray-500 mt-2 text-lg">
                Monitoreo financiero y operativo en tiempo real
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 lg:items-center">
              <div className="flex bg-white rounded-2xl border border-gray-200 p-1 shadow-sm">
                {(["today", "week", "month"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                      range === r
                        ? "bg-gray-900 text-white shadow"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {r === "today" ? "Hoy" : r === "week" ? "Semana" : "Mes"}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/pos"
                  className="bg-black text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg"
                >
                  Nueva Venta <ArrowUpRight size={18} />
                </Link>
                <Link
                  href="/inventory"
                  className="bg-white border border-gray-200 text-gray-700 px-5 py-3 rounded-2xl font-semibold flex items-center gap-2 hover:bg-gray-50 transition"
                >
                  <Boxes size={18} /> Inventario
                </Link>
                <Link
                  href="/cxc"
                  className="bg-white border border-gray-200 text-gray-700 px-5 py-3 rounded-2xl font-semibold flex items-center gap-2 hover:bg-gray-50 transition"
                >
                  <FileSpreadsheet size={18} /> CxC
                </Link>
              </div>
            </div>
          </div>

          {subscriptionStatus !== "ACTIVE" && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-amber-600" />
                <span className="font-semibold">
                  Tu suscripción requiere atención
                </span>
              </div>
              <Link
                href="/subscription/pricing"
                className="bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-amber-700"
              >
                Gestionar Plan
              </Link>
            </div>
          )}

          {/* CASH MONITORING */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition">
              <div>
                <p className="uppercase text-xs font-bold tracking-widest text-emerald-600">
                  Efectivo Esperado
                </p>
                <h3 className="text-3xl font-bold text-gray-900 mt-3">
                  {cash ? formatMoney(cash.expectedCash) : "Caja Cerrada"}
                </h3>
              </div>
              <div className="p-5 bg-emerald-100 text-emerald-600 rounded-2xl">
                <Wallet size={42} />
              </div>
            </div>
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition">
              <div>
                <p className="uppercase text-xs font-bold tracking-widest text-blue-600">
                  Recaudado CxC Hoy
                </p>
                <h3 className="text-3xl font-bold text-gray-900 mt-3">
                  {cash
                    ? formatMoney(cash.totalCreditPayments)
                    : formatMoney(0)}
                </h3>
              </div>
              <div className="p-5 bg-blue-100 text-blue-600 rounded-2xl">
                <HandCoins size={42} />
              </div>
            </div>
          </div>

          {/* KPI BENTO GRID */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
            <div className="md:col-span-5 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <p className="text-sm font-semibold text-gray-500">
                Ventas Liquidadas
              </p>
              <h2 className="text-3xl font-bold text-gray-900 mt-3">
                {formatMoney(realRevenue)}
              </h2>
              {creditNotCollected > 0 && (
                <div className="mt-6 inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-5 py-2 rounded-2xl text-sm font-medium">
                  <AlertTriangle size={18} /> Pendiente:{" "}
                  {formatMoney(creditNotCollected)}
                </div>
              )}
            </div>
            <div className="md:col-span-3 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <p className="text-sm font-semibold text-gray-500">Gastos</p>
              <h2 className="text-3xl font-bold text-red-500 mt-3">
                {formatMoney(stats?.expenses || 0)}
              </h2>
            </div>
            <div className="md:col-span-4 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <p className="text-sm font-semibold text-gray-500">
                Facturas Emitidas
              </p>
              <h2 className="text-4xl font-bold text-gray-900 mt-3">
                {stats?.totalOrders || 0}
              </h2>
            </div>
            <div className="md:col-span-6 bg-black text-white rounded-3xl p-8 border border-gray-100 shadow-xl">
              <p className="text-white text-sm font-medium">
                Efectivo Neto en Caja
              </p>
              <h2 className="text-white text-4xl font-bold mt-3">
                {formatMoney(realCashFlow)}
              </h2>
            </div>
            <div className="md:col-span-6 bg-green-600 text-white rounded-3xl p-8 border border-green-200 shadow-xl">
              <p className="text-white text-sm font-medium">Utilidad Real</p>
              <h2 className="text-white text-4xl font-bold mt-3">
                {formatMoney(realProfit)}
              </h2>
            </div>
            <div className="md:col-span-12 bg-white rounded-3xl p-8 border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                  Total Cuentas por Cobrar (CxC)
                </p>
                <h2 className="text-3xl font-bold text-gray-900 mt-2">
                  {formatMoney(totalAccountsReceivable)}
                </h2>
              </div>
              <div className="p-4 bg-orange-100 text-orange-600 rounded-2xl">
                <FileSpreadsheet size={32} />
              </div>
            </div>
          </div>

          

          {/* CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-gray-800 text-xl font-bold">
                  Tendencia de Ventas
                </h3>

                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium">
                  Últimos registros
                </span>
              </div>

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
                        <stop
                          offset="5%"
                          stopColor="#6366F1"
                          stopOpacity={0.4}
                        />
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
                      tickFormatter={(value) =>
                        `$${Number(value).toLocaleString()}`
                      }
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: "16px",
                        border: "none",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value: any) =>
                        formatMoney(Number(value || 0))
                      }
                    />

                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#6366F1"
                      strokeWidth={4}
                      fill="url(#salesGradient)"
                      animationDuration={1200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-gray-800 text-xl font-bold">
                  Métodos de Pago Utilizados
                </h3>

                <span className="text-sm text-gray-500">
                  Distribución de ingresos
                </span>
              </div>

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
                      animationDuration={1000}
                      label={({ percent }) =>
                        `${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {chartPaymentData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={(value: any) =>
                        formatMoney(Number(value || 0))
                      }
                      contentStyle={{
                        borderRadius: "16px",
                        border: "none",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                      }}
                    />

                    <Legend verticalAlign="bottom" iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* LOW STOCK */}
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
                      <p className="text-sm text-gray-500">
                        Stock: {prod.stock}
                      </p>
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

          {/* CASH CONTROL */}
          <RoleGuard roles={["OWNER"]}>
            <div className="pt-8 border-t border-gray-200">
              <CashControl session={cash} refresh={() => load(range)} />
            </div>
          </RoleGuard>
        </div>
      </SubscriptionGuard>
    </ProtectedRoute>
  );
}

