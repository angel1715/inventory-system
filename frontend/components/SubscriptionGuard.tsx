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
    if (!loading && user) {
      if (user.subscriptionStatus === "PENDING") {
        router.replace("/subscription/waiting-approval");
      } else if (user.subscriptionStatus !== "ACTIVE") {
        router.replace("/subscription/pricing");
      }
    }
  }, [loading, user, router]);

  if (loading)
    return <div className="flex justify-center p-10">Cargando...</div>;
  if (!user || user.subscriptionStatus !== "ACTIVE") return null;

  return <>{children}</>;
}
