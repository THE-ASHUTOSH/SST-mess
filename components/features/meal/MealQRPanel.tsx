"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQRCode } from "next-qrcode";
import { AlertCircle, GraduationCap, Info, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMealQR } from "@/context/MealQRContext";
import { useUser } from "@/context/UserContext";

export default function MealQRPanel() {
  const {
    token,
    error,
    errorRetryable,
    loading,
    refreshing,
    scanned,
    secondsLeft,
    expired,
    refresh,
  } = useMealQR();
  const { user } = useUser();

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
      <div className="flex items-start justify-between gap-3 w-full px-4 sm:px-0 pt-4 sm:pt-0">
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
        {user?.batch && (
          <span
            title="Batch"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[color:var(--surface-active)] px-3 py-1 text-xs font-semibold text-primary"
          >
            <GraduationCap className="h-3.5 w-3.5" aria-hidden />
            {user.batch}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <Skeleton className="h-[260px] w-[260px] rounded-xl" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : error ? (
        // A rule the server is stating (outside meal hours, not opted in) is information, not a
        // failure — so it gets a calmer tone and no retry, because retrying cannot change it.
        <div className="w-full px-4 sm:px-0 pb-5 sm:pb-0" role="status" aria-live="polite">
          <div
            className={`mx-auto max-w-sm rounded-xl border px-5 py-6 text-center ${
              errorRetryable
                ? "border-destructive/30 bg-destructive/10"
                : "border-warning/40 bg-warning/10"
            }`}
          >
            <div
              className={`mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl ${
                errorRetryable ? "bg-destructive/10" : "bg-warning/10"
              }`}
            >
              {errorRetryable ? (
                <AlertCircle className="h-7 w-7 text-destructive" aria-hidden />
              ) : (
                <Info className="h-7 w-7 text-warning" aria-hidden />
              )}
            </div>

            <p className="text-base font-semibold leading-snug text-foreground">{error}</p>

            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {errorRetryable
                ? "Your QR couldn't be generated."
                : "No QR is available right now."}
            </p>

            {errorRetryable && (
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={refreshing}
                className="mt-4"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Retrying…" : "Try again"}
              </Button>
            )}
          </div>
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
