"use client";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Si no está logueado, al login
        router.replace("/login");
      } else if (user.role !== "ADMIN") {
        // Si está logueado pero no es admin, al dashboard
        router.replace("/dashboard");
      }
    }
  }, [loading, user, router]);

  // Mientras carga, mostramos un indicador de carga
  if (loading) {
    return <div className="flex justify-center p-10">Verificando permisos...</div>;
  }

  // Solo renderizamos si es realmente ADMIN
  if (user?.role !== "ADMIN") {
    return null;
  }

  return <>{children}</>;
}