"use client";

import { useAuth } from "@/app/context/AuthContext";
import { ReactNode } from "react";
import { ShieldAlert } from "lucide-react"; // O cualquier icono que tengas

type Props = {
  roles: string[];
  children: ReactNode;
};

export default function RoleGuard({ roles, children }: Props) {
  const { user, loading } = useAuth();

  if (loading) return null; // O un spinner de carga

  if (!user) return null;

  // Si el usuario no tiene el rol permitido, mostramos un mensaje de error visual
  if (!roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center bg-white p-10 rounded-3xl shadow-xl border border-gray-100 max-w-sm">
          <div className="text-red-500 mb-4 flex justify-center">
            <ShieldAlert size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Acceso Denegado</h2>
          <p className="text-gray-500 mt-2">
            No tienes permisos para ver esta sección.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
