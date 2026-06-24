"use client";

import { useEffect, useState, useRef } from "react";
import { getSettings } from "@/lib/api";
import { useAuth } from "@/app/context/AuthContext";

export function useSettings() {
  const { user, loading: authLoading } = useAuth();

  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 evita doble fetch en StrictMode
  const hasLoaded = useRef(false);

  async function load() {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (err) {
      console.error("Settings error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // =========================
    // 🔥 WAIT FOR AUTH SYSTEM
    // =========================
    if (authLoading) return;

    // =========================
    // 🔥 NO USER = STOP
    // =========================
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    // =========================
    // 🔥 PREVENT DOUBLE FETCH
    // =========================
    if (hasLoaded.current) return;

    hasLoaded.current = true;

    load();
  }, [user, authLoading]);

  return {
    settings,
    loading,
  };
}