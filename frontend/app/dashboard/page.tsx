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
import { getDashboard, getCashSession, getLowStockProducts } from "@/lib/api";

import CashControl from "@/components/CashControl";
import RoleGuard from "@/components/RoleGuard";
import Receipt from "@/components/Receipt";

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

  async function load(currentRange: typeof range) {
    try {
      setLoading(true);
      const [dashboard, cashSession, lowStock] = await Promise.all([
        getDashboard(currentRange),
        getCashSession(),
        getLowStockProducts(),
      ]);
      setStats(dashboard);
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
              label: "Efectivo Esperado",
              value: cash?.expectedCash || 0,
              icon: <Wallet size={20} className="text-emerald-600" />,
            },
            {
              label: "Recaudado CxC Hoy",
              value: cash?.totalCreditPayments || 0,
              icon: <HandCoins size={20} className="text-blue-600" />,
            },
            {
              label: "Utilidad Real",
              value: realProfit,
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
                {stat.label === "Efectivo Esperado" && !cash
                  ? "Caja Cerrada"
                  : formatMoney(stat.value)}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-5 bg-gray-900 border border-zinc-200 rounded-3xl p-8">
            <p className="text-emerald-500 font-bold tracking-widest text-sm">
              VENTAS TOTALES
            </p>
            <p className="text-white text-5xl font-semibold mt-4">
              {formatMoney(realRevenue)}
            </p>
            {creditNotCollected > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-2xl text-sm">
                <AlertTriangle size={18} /> Pendiente:{" "}
                {formatMoney(creditNotCollected)}
              </div>
            )}
          </div>
          <div className="col-span-12 lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-300 rounded-3xl p-6">
              <p className="text-red-600 font-bold text-sm">GASTOS</p>
              <p className="text-4xl font-semibold mt-4 text-red-600">
                {formatMoney(stats?.expenses || 0)}
              </p>
            </div>
            <div className="bg-white border border-zinc-300 rounded-3xl p-6">
              <p className="text-zinc-500 font-bold text-sm">ÓRDENES</p>
              <p className="text-4xl font-semibold mt-4">
                {stats?.totalOrders || 0}
              </p>
            </div>
            <div className="md:col-span-2 bg-zinc-900 text-white rounded-3xl p-8">
              <p className="text-zinc-200">EFECTIVO EN CAJA (Real)</p>
              <p className="text-4xl font-bold mt-2">
                {formatMoney(realCashFlow)}
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

        <div className="mt-12 pt-8 border-t border-zinc-200">
          <RoleGuard roles={["OWNER"]}>
            <CashControl session={cash} refresh={() => load(range)} />
          </RoleGuard>
        </div>

        {isAdmin && (
          <div className="mt-8 pt-8 border-t border-dashed border-zinc-300">
            <InvitationManager />
          </div>
        )}
      </div>
    </div>
  );
}
