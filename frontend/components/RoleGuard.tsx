"use client";

import { useAuth } from "@/app/context/AuthContext";
import { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";

type Props = {
  roles: string[];
  children: ReactNode;
};

export default function RoleGuard({ roles, children }: Props) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return null;

  // Lógica de "Super Usuario":
  // Si el usuario es ADMIN, le damos acceso total inmediatamente.
  const isAdmin = user.role === "ADMIN";

  // Si no es ADMIN, verificamos si su rol está en la lista permitida.
  const hasRequiredRole = roles.includes(user.role);

  if (!isAdmin && !hasRequiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center bg-white p-10 rounded-3xl shadow-xl border border-gray-100 max-w-sm">
          <div className="text-red-500 mb-4 flex justify-center">
            <ShieldAlert size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Acceso Denegado</h2>
          <p className="text-gray-500 mt-2">
            No tienes permisos suficientes para ver esta sección.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
