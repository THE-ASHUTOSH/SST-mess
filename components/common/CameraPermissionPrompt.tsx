"use client";

import React from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraPermissionPromptProps {
  /** Raises the browser's real prompt — must run inside this click. */
  onEnable: () => void;
  /** True while the browser's prompt is open. */
  requesting?: boolean;
  /** Why the last attempt failed, if it did. */
  notice?: string | null;
}

/**
 * Asks for the camera in our own words before the browser's prompt appears.
 *
 * A vendor who meets the browser dialog cold — no context, mid-queue — often taps Block, and a
 * saved block cannot be prompted for again from JavaScript; it can only be undone in browser
 * settings. Explaining first, and only raising the real prompt once they've tapped Enable, keeps
 * that dead end from happening: the worst case here is a dismissal we can ask about again.
 */
const CameraPermissionPrompt: React.FC<CameraPermissionPromptProps> = ({
  onEnable,
  requesting = false,
  notice,
}) => (
  <div className="w-full rounded-2xl border border-border bg-card p-6 text-center animate-in fade-in duration-300">
    <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
      <Camera className="h-9 w-9 text-primary" aria-hidden />
    </div>

    <h2 className="mb-1 text-xl font-bold text-foreground">Turn on the camera to scan</h2>
    <p className="mx-auto max-w-[38ch] text-sm leading-snug text-muted-foreground">
      It reads the student&apos;s QR code and nothing else — no photos are taken, stored, or uploaded.
    </p>

    {notice && (
      <p
        role="alert"
        className="mx-auto mt-4 max-w-[38ch] rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium leading-snug text-destructive"
      >
        {notice}
      </p>
    )}

    <Button onClick={onEnable} disabled={requesting} size="lg" className="mt-6 w-full">
      <Camera className="h-4 w-4" />
      {requesting ? "Waiting for permission…" : "Enable camera"}
    </Button>
    <p className="mt-3 text-xs text-muted-foreground">
      Your browser will ask next — choose <span className="font-medium">Allow</span>.
    </p>
  </div>
);

export default CameraPermissionPrompt;
