"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { getSettings, getCashSession } from "@/lib/api";
import { LogOut, Circle } from "lucide-react";

export default function Topbar() {
  const { user, logout } = useAuth();

  const roleLabels = {
    OWNER: "Administrador",
    EMPLOYEE: "Empleado",
  };

  const currentDate = new Date().toLocaleDateString("es-DO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const [settings, setSettings] = useState<any>(null);
  const [cashStatus, setCashStatus] = useState<"OPEN" | "CLOSED">("CLOSED");

  useEffect(() => {
    async function loadSettings() {
      try {
        const [data, session] = await Promise.all([
          getSettings(),
          getCashSession(),
        ]);
        setSettings(data);
        setCashStatus(session ? "OPEN" : "CLOSED");
      } catch (err) {
        console.error("Failed to load settings");
      }
    }
    loadSettings();
  }, []);

  return (
    <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6 shadow-sm z-50">
      {/* Left Side */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl overflow-hidden bg-zinc-100 flex items-center justify-center font-bold text-xl border border-zinc-200">
          {settings?.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.businessName}
              className="w-full h-full object-cover"
            />
          ) : (
            settings?.businessName?.charAt(0) || "AG"
          )}
        </div>

        <div>
          <h1 className="font-semibold text-lg tracking-tight text-zinc-900">
            {settings?.businessName || "AG-POS"}
          </h1>
          {settings?.tradeName && (
            <p className="text-sm text-zinc-500 -mt-1">{settings.tradeName}</p>
          )}
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-6">
        {/* Cash Status */}
        <div
          className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl text-sm font-medium border ${
            cashStatus === "OPEN"
              ? "bg-emerald-100 border-emerald-200 text-emerald-700"
              : "bg-red-100 border-red-200 text-red-700"
          }`}
        >
          <Circle
            className={`w-4 h-4 fill-current ${
              cashStatus === "OPEN" ? "text-emerald-600" : "text-red-600"
            }`}
          />
          <span>{cashStatus === "OPEN" ? "Caja Abierta" : "Caja Cerrada"}</span>
        </div>

        {/* User Info */}
        <div className="hidden sm:flex flex-col items-end">
          <p className="font-medium text-sm text-zinc-900">{user?.name}</p>
          <p className="text-xs text-zinc-500">
            {roleLabels[user?.role as keyof typeof roleLabels] || user?.role}
          </p>
        </div>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-sm text-white border border-white/30 shadow">
          {(user?.name || "U").trim().charAt(0).toUpperCase()}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 transition-colors px-4 py-2 rounded-2xl text-sm font-medium text-white"
        >
          <LogOut size={18} />
          <span className="hidden md:inline">Cerrar Sesión</span>
        </button>
      </div>
    </header>
  );
}
