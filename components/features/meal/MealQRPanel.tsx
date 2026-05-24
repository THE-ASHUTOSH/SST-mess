"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQRCode } from "next-qrcode";
import { Loader2, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMealQR } from "@/context/MealQRContext";

export default function MealQRPanel() {
  const {
    token,
    error,
    loading,
    refreshing,
    scanned,
    secondsLeft,
    expired,
    refresh,
  } = useMealQR();

  const { Canvas } = useQRCode();
  const [qrWidth, setQrWidth] = useState(260);
  const observerRef = useRef<ResizeObserver | null>(null);

  // Size the QR to fit its container via a ref callback. This fires whenever
  // the wrapper element attaches or detaches (e.g. when the `token` branch
  // mounts), so we don't depend on token timing.
  const qrWrapperRef = useCallback((el: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      const isMobile = window.innerWidth < 640;
      setQrWidth(isMobile ? w : Math.min(w, 320));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    observerRef.current = observer;
  }, []);

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <Card className="app-shell-kpi rounded-none sm:rounded-2xl border-x-0 sm:border-x px-0 sm:px-6 py-0 sm:py-6 flex flex-col items-center gap-3 sm:gap-4 overflow-hidden">
      <div className="flex items-center justify-between w-full px-4 sm:px-0 pt-4 sm:pt-0">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            {scanned ? "Meal verified" : "Your meal QR"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {scanned
              ? "Enjoy your meal."
              : "Show this code to the vendor to collect food."}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <Skeleton className="h-[260px] w-[260px] rounded-xl" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : error ? (
        <div className="w-full text-center py-6">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      ) : scanned ? (
        <div className="flex flex-col items-center py-8 animate-in fade-in zoom-in duration-500">
          <div className="rounded-full bg-[color:var(--status-success-bg)] p-6 mb-4">
            <svg
              className="w-16 h-16"
              style={{ color: "var(--status-success-solid)" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p
            className="text-xl font-bold"
            style={{ color: "var(--status-success-solid)" }}
          >
            Verified
          </p>
        </div>
      ) : token ? (
        <div className="flex flex-col items-center w-full">
          <div ref={qrWrapperRef} className="relative mx-4">
            <div
              className={`transition-all duration-300 ${
                expired || refreshing ? "blur-md opacity-60" : ""
              }`}
              aria-hidden={expired || refreshing}
            >
              <Canvas
                text={token}
                options={{
                  errorCorrectionLevel: "M",
                  margin: 1,
                  scale: 4,
                  width: qrWidth,
                  color: { dark: "#000000", light: "#FFFFFF" },
                }}
              />
            </div>
            {refreshing ? (
              <div
                aria-live="polite"
                className="absolute inset-0 flex flex-col items-center justify-center gap-2"
              >
                <span className="flex items-center justify-center w-16 h-16 rounded-full bg-background/90 border border-border shadow-lg">
                  <Loader2 className="w-7 h-7 text-primary animate-spin" />
                </span>
                <span className="text-sm font-medium text-primary drop-shadow-sm">
                  Refreshing
                </span>
              </div>
            ) : expired ? (
              <button
                type="button"
                onClick={refresh}
                aria-label="Refresh expired QR code"
                className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary group"
              >
                <span className="flex items-center justify-center w-16 h-16 rounded-full bg-background/90 border border-border shadow-lg group-hover:bg-background group-hover:scale-110 transition-all">
                  <RefreshCw className="w-7 h-7 text-primary" />
                </span>
                <span className="text-sm font-medium text-primary drop-shadow-sm">
                  Refresh
                </span>
              </button>
            ) : null}
          </div>

          {!expired && (
            <p
              className={`mt-4 mb-4 sm:mb-0 text-sm font-medium ${
                secondsLeft <= 5 ? "text-destructive" : "text-muted-foreground"
              }`}
              aria-live="polite"
            >
              Valid for {secondsLeft}s
            </p>
          )}
        </div>
      ) : null}
    </Card>
  );
}
