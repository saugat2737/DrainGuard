"use client";

import React, { useState, useEffect } from "react";
import { Download, Smartphone, X, Check, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // Check if already in standalone display mode
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standaloneMode);

    // Detect iOS user agent
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 5000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === "accepted") {
          setInstalledSuccess(true);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error("Install prompt error:", err);
      }
    } else {
      // Fallback instruction modal for iOS or browsers that don't emit beforeinstallprompt
      setShowModal(true);
    }
  };

  // If already running inside standalone app, do not display install buttons
  if (isStandalone) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--dg-surface-elevated)] hover:bg-[var(--dg-surface-hover)] border border-[var(--dg-border)] text-xs font-medium text-[var(--dg-text-secondary)] hover:text-[var(--dg-text)] transition shadow-sm touch-target"
        title="Install DrainGuard App on Phone / Desktop"
        aria-label="Install App"
      >
        <Smartphone className="w-4 h-4 text-[#20D6C2] shrink-0" />
        <span className="hidden sm:inline">Install App</span>
      </button>

      {/* Installed Toast */}
      {installedSuccess && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium shadow-xl text-xs sm:text-sm animate-fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>DrainGuard installed successfully!</span>
        </div>
      )}

      {/* Manual Add to Home Screen Instructions Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--dg-surface-card)] border border-[var(--dg-border)] rounded-2xl max-w-sm w-full p-5 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-[var(--dg-text-muted)] hover:text-[var(--dg-text)] p-1 rounded-lg"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#20D6C2]/15 border border-[#20D6C2]/30 flex items-center justify-center text-[#20D6C2]">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-[var(--dg-text)]">Install DrainGuard</h3>
                <p className="text-xs text-[var(--dg-text-secondary)]">Instant, offline-ready navigation</p>
              </div>
            </div>

            {isIos ? (
              <div className="space-y-3 text-xs text-[var(--dg-text-secondary)] bg-[var(--dg-surface-elevated)] p-3.5 rounded-xl border border-[var(--dg-border)]">
                <p className="font-medium text-[var(--dg-text)]">To install on iPhone or iPad:</p>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center text-[10px] shrink-0">1</span>
                  <span>Tap the Safari <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline mx-0.5 text-sky-400" /></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center text-[10px] shrink-0">2</span>
                  <span>Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center text-[10px] shrink-0">3</span>
                  <span>Tap <strong>Add</strong> in the top right corner</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-[var(--dg-text-secondary)] bg-[var(--dg-surface-elevated)] p-3.5 rounded-xl border border-[var(--dg-border)]">
                <p className="font-medium text-[var(--dg-text)]">To install on Android / Chrome:</p>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center text-[10px] shrink-0">1</span>
                  <span>Tap the browser menu (<strong>⋮</strong> or three dots)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center text-[10px] shrink-0">2</span>
                  <span>Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong></span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="mt-4 w-full py-2 rounded-xl bg-[#20D6C2] hover:bg-[#1bb8a6] text-[#0A0F1D] font-bold text-xs shadow-md transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
