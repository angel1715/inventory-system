"use client";

import { useEffect } from "react";

import { useSettings } from "@/hooks/useSettings";

export default function BusinessBranding() {
  const { settings } = useSettings();

  useEffect(() => {
    if (!settings) return;

    // PAGE TITLE

    document.title = settings.businessName || "POS System";

    // FAVICON

    if (settings.logoUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;

      if (!link) {
        link = document.createElement("link");

        link.rel = "icon";

        document.head.appendChild(link);
      }

      link.href = settings.logoUrl;
    }
  }, [settings]);

  return null;
}
