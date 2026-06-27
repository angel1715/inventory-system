"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Box,
  Truck,
  BarChart3,
  ShoppingBag,
  Settings,
  Users,
  BadgeDollarSign,
  Contact2,
  SearchCode,
  Wrench,
  FileSpreadsheet,
} from "lucide-react";
import RoleGuard from "./RoleGuard";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS", icon: ShoppingCart },
  { href: "/sales", label: "Ventas", icon: Receipt },
  { href: "/inventory", label: "Inventario", icon: Package },
  { href: "/cxc", label: "Cuentas por Cobrar", icon: FileSpreadsheet },
  { href: "/dashboard/tracker", label: "Track IMEI/Serial", icon: SearchCode },
  { href: "/service-orders", label: "Órdenes de Servicio", icon: Wrench },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-gray-800 border-r border-zinc-800
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          flex flex-col h-screen
        `}
      >
        {/* Logo */}
        <div className="p-8 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              <span className="bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(165,243,252,0.5)]">
                OG
              </span>
              <span className="text-white">Admin</span>
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Sistema de Gestión</p>
          </div>

          {/* Botón cerrar en móvil */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden text-zinc-400 hover:text-white"
          >
            <X size={28} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)} // Cerrar al navegar en móvil
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ${
                    isActive
                      ? "bg-white text-zinc-900 font-medium"
                      : "text-zinc-300 hover:bg-gray-100 hover:text-black"
                  }`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Owner Only */}
            <RoleGuard roles={["OWNER"]}>
              <div className="pt-6 mt-6 border-t border-white">
                <p className="px-4 text-xs uppercase tracking-widest text-zinc-200 mb-3">
                  Administración
                </p>
                <div className="space-y-1">
                  {[
                    { href: "/products", label: "Productos", icon: Box },
                    { href: "/suppliers", label: "Proveedores", icon: Truck },
                    { href: "/purchases", label: "Compras", icon: ShoppingBag },
                    {
                      href: "/expenses",
                      label: "Gastos",
                      icon: BadgeDollarSign,
                    },
                    { href: "/employees", label: "Empleados", icon: Users },
                    { href: "/customers", label: "Clientes", icon: Contact2 },
                    { href: "/reports", label: "Reportes", icon: BarChart3 },
                    {
                      href: "/settings",
                      label: "Configuración",
                      icon: Settings,
                    },
                  ].map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ${
                          isActive
                            ? "bg-white text-zinc-900 font-medium"
                            : "text-zinc-300 hover:bg-gray-100 hover:text-black"
                        }`}
                      >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </RoleGuard>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-white mt-auto bg-gray-800">
          <div className="bg-gray-200 rounded-2xl p-4 text-xs text-black">
            POS System v1.0 • {new Date().getFullYear()}
          </div>
        </div>
      </aside>
    </>
  );
}
