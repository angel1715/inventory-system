"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { RefreshCw } from "lucide-react";

type Props = {
  children: React.ReactNode;
  roles?: string[];
};
export default function ProtectedRoute({ children, roles }: Props) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
  if (!loading && user) {
    console.log("DEBUG: Usuario:", user.name, "Estado active:", user.active);

    // TypeScript ahora sabrá que user.active es boolean gracias a la definición del tipo
    if (user.active !== true) {
      console.warn("DEBUG: Acceso denegado. Redirigiendo a /subscription/pricing");
      router.push("/subscription/pricing");
    } else {
      console.log("DEBUG: Acceso concedido.");
    }
  }
}, [user, loading, router]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // FORZAMOS el cambio de ventana si el router falla
      window.location.href = "/login";
      return;
    }

    if (roles && !roles.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, loading, roles, router]);

  // Si está cargando O si no hay usuario, no renderizamos nada
  // para evitar flashes de contenido protegido
  if (loading || !user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 text-gray-500">
        <RefreshCw className="w-10 h-10 animate-spin" />
        <p>{loading ? "Validando sesión..." : "Redirigiendo..."}</p>
      </div>
    );
  }

  // Validación de roles
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="p-10 text-center">
        No tienes permiso para acceder aquí.
      </div>
    );
  }

  return <>{children}</>;
}
