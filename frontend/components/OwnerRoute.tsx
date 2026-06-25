"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

export default function OwnerRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    // Permitimos el acceso si es OWNER o si es ADMIN
    const isAuthorized = user.role === "OWNER" || user.role === "ADMIN";

    if (!isAuthorized) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) return null;

  // Igual aquí, permitimos el acceso si es OWNER o si es ADMIN
  const isAuthorized = user.role === "OWNER" || user.role === "ADMIN";

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
