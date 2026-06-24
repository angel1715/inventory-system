"use client";

import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "@/app/context/AuthContext";
import BusinessBranding from "@/components/BusinessBranding";
import FullScreenLoader from "@/components/ui/FullScreenLoader";
import { useEffect } from "react";

function AppContent({ children }: { children: React.ReactNode }) {
  // Solo necesitamos 'loading' del contexto.
  // 'authLoading' no existe, así que lo eliminamos.

  // Dentro de AppProviders.tsx
  useEffect(() => {
    // Limpiamos los restos de localStorage al cargar la app
    if (localStorage.getItem("token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      console.log("Datos de localStorage antiguos eliminados correctamente.");
    }
  }, []);
  const { loading } = useAuth();

  return (
    <>
      {loading ? (
        <FullScreenLoader text="Validando sesión..." />
      ) : (
        <>
          <BusinessBranding />
          {children}
        </>
      )}

      <Toaster position="top-right" />
    </>
  );
}

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AppContent>{children}</AppContent>
    </AuthProvider>
  );
}
