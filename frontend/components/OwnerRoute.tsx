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

    if (user.role !== "OWNER") {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div
        className="
          min-h-screen
          flex
          items-center
          justify-center
        "
      >
        Loading...
      </div>
    );
  }

  if (!user) return null;

  if (user.role !== "OWNER") {
    return null;
  }

  return <>{children}</>;
}
