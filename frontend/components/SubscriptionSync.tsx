"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SubscriptionSync() {
  const { loadUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasProcessed = useRef(false);

  useEffect(() => {
    const success = searchParams.get("success");

    if (success === "true" && !hasProcessed.current) {
      hasProcessed.current = true;
      loadUser().then(() => {
        toast.success("¡Suscripción confirmada!");
        router.replace("/dashboard");
      });
    }
  }, [searchParams, loadUser, router]);

  return null;
}
