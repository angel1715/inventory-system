"use client";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SubscriptionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.subscriptionStatus !== "ACTIVE") {
      router.replace("/subscription/pricing");
    }
  }, [loading, user, router]);

  if (loading) return null; // Deja que el layout gestione el estado de carga

  if (user && user.subscriptionStatus !== "ACTIVE") return null;

  return <>{children}</>;
}
