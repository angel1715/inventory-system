// components/AdminGuard.tsx
"use client";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role !== "ADMIN") {
      router.replace("/dashboard"); // Si no es admin, lo echamos al dashboard
    }
  }, [loading, user, router]);

  if (loading || user?.role !== "ADMIN") return null;

  return <>{children}</>;
}
