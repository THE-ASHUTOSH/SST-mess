"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

export default function SSOCallbackPage() {
  return (
    <>
      <div className="flex justify-center items-center min-h-screen app-shell-canvas px-4">
        <div className="flex flex-col items-center gap-4 theme-card-surface rounded-2xl px-8 py-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Completing sign in...</p>
        </div>
      </div>
      <AuthenticateWithRedirectCallback />
    </>
  );
}
