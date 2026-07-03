"use client";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SubscriptionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();

  // 1. Efecto de sincronización al cargar el componente
  useEffect(() => {
    if (user) {
      refreshUser();
    }
  }, []);

  // 2. Efecto de vigilancia (Guard)
  useEffect(() => {
    if (loading) return;

    // Si es ADMIN, no hacemos ninguna validación de suscripción
    if (user?.role === "ADMIN") return;

    // Lógica para usuarios normales (OWNER/EMPLOYEE)
    if (!user || user.subscriptionStatus !== "ACTIVE") {
      console.log(
        "DEBUG GUARD - Redirigiendo por estado:",
        user?.subscriptionStatus,
      );

      if (user?.subscriptionStatus === "PENDING") {
        router.replace("/subscription/waiting-approval");
      } else {
        // RUTA CORREGIDA: Apuntando a la raíz como se ve en tu estructura
        router.replace("/pricing");
      }
    }
  }, [loading, user, router]);

  // Pantalla de carga mientras se valida la sesión
  if (loading) {
    return <div className="flex justify-center p-10">Cargando...</div>;
  }

  // Protección contra renderizado prematuro:
  // Si no es admin y el estatus no es activo, devolvemos null mientras redirige
  if (user?.role !== "ADMIN" && user?.subscriptionStatus !== "ACTIVE") {
    return null;
  }

  return <>{children}</>;
}
