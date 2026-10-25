"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("DrainGuard PWA ServiceWorker active:", registration.scope);
          })
          .catch((err) => {
            console.warn("DrainGuard PWA ServiceWorker registration failed:", err);
          });
      });
    }
  }, []);

  return null;
}
