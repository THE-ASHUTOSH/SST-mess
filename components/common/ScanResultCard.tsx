"use client";

import React from "react";
import { AlertCircle, CheckCircle2, GraduationCap, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScanResultCardProps {
  variant: "success" | "error";
  /** The server's own message, rendered as-is. */
  message: string;
  /** Shown on success so the operator can match the face to the person. */
  user?: { name: string; picture?: string | null; batch?: string | null } | null;
  onAction: () => void;
  /** Defaults to "Scan Again"; setup failures want "Reload" or "Dismiss" instead. */
  actionLabel?: string;
}

/**
 * One card for every scan verdict. A vendor reads this at arm's length with a queue waiting, so
 * the result has to be legible before the text is: icon + colour carry the verdict, and the
 * message states it. Colour is never the only signal — the icon always agrees with it.
 */
const ScanResultCard: React.FC<ScanResultCardProps> = ({
  variant,
  message,
  user,
  onAction,
  actionLabel = "Scan Again",
}) => {
  const isSuccess = variant === "success";
  const accent = isSuccess ? "text-success" : "text-destructive";
  const tint = isSuccess ? "bg-success/10" : "bg-destructive/10";
  const edge = isSuccess ? "border-success/30" : "border-destructive/30";
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;
  const showAvatar = isSuccess && !!user;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full rounded-2xl border ${edge} ${tint} p-6 text-center animate-in fade-in zoom-in duration-300`}
    >
      {showAvatar ? (
        <div className="relative mx-auto mb-4 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element -- the Google avatar host isn't in
              next.config remotePatterns, so next/image cannot optimize it. */}
          <img
            src={user?.picture || "/avatar_placeholder.png"}
            alt={user?.name ?? "Student"}
            referrerPolicy="no-referrer"
            className={`h-24 w-24 rounded-full border-4 object-cover ${edge}`}
          />
          <span className={`absolute -bottom-1 -right-1 rounded-full border-4 border-background ${tint} p-1`}>
            <Icon className={`h-6 w-6 ${accent}`} aria-hidden />
          </span>
        </div>
      ) : (
        <div className={`mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl ${tint}`}>
          <Icon className={`h-9 w-9 ${accent}`} aria-hidden />
        </div>
      )}

      {showAvatar && (
        <h3 className="mb-1 truncate text-xl font-bold text-foreground">{user?.name}</h3>
      )}

      {showAvatar && user?.batch && (
        <span
          title="Batch"
          className="mb-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1 text-sm font-semibold text-foreground"
        >
          <GraduationCap className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="truncate">{user.batch}</span>
        </span>
      )}

      <p className={`mx-auto max-w-[34ch] text-lg font-semibold leading-snug ${accent}`}>
        {message}
      </p>

      <Button onClick={onAction} size="lg" className="mt-6 w-full">
        <RotateCcw className="h-4 w-4" />
        {actionLabel}
      </Button>
    </div>
  );
};

export default ScanResultCard;
