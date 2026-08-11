"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    navigator.serviceWorker.register("/hub/sw.js", { scope: "/hub/" }).catch(function (err) {
      console.error("Hub service worker registration failed:", err);
    });
  }, []);

  return null;
}
