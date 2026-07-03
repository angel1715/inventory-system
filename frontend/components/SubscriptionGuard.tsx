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

  useEffect(() => {
    // Solo refrescamos si ya tenemos un usuario cargado
    // Esto asegura que cada vez que entras al dashboard,
    // se valide el estado actual contra la base de datos.
    if (user) {
      refreshUser();
    }
  }, []); // Se ejecuta solo al montar el componente

  // Mientras carga, no hacemos nada (mantenemos el estado de espera)
  if (loading) {
    return <div className="flex justify-center p-10">Cargando...</div>;
  }

  // 1. SI ES ADMINISTRADOR, ACCESO TOTAL
  if (user && user.role === "ADMIN") {
    return <>{children}</>;
  }

  // 2. LÓGICA DE REDIRECCIÓN (Solo si NO es admin)
  // Verificamos si el usuario no existe o no tiene estatus ACTIVO
  if (!user || user.subscriptionStatus !== "ACTIVE") {
    // Si el usuario existe pero está en otro estado, redirigimos
    if (user) {
      if (user.subscriptionStatus === "PENDING") {
        router.replace("/subscription/waiting-approval");
      } else {
        // CANCELED o cualquier otro estado inválido
        router.replace("/subscription/pricing");
      }
    }

    // Si no hay usuario y ya terminó de cargar, podríamos ir al login
    // pero aquí devolvemos null para evitar parpadeo de contenido privado
    return null;
  }

  // Si todo está bien, mostramos el contenido
  return <>{children}</>;
}
