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

    navigator.serviceWorker.register("/portal/sw.js", { scope: "/portal/" }).catch(function (err) {
      console.error("Portal service worker registration failed:", err);
    });
  }, []);

  return null;
}
