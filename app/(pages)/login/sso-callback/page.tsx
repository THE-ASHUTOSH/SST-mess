"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth, useClerk } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthErrorNotice from "@/components/common/AuthErrorNotice";
import {
  authErrorFromCode,
  authErrorFromException,
  isAuthException,
  type AuthErrorInfo,
} from "@/lib/auth-errors";

/** Last resort: Clerk resolved neither way, so stop spinning and offer a route out. */
const CALLBACK_TIMEOUT_MS = 20_000;

const CALLBACK_PARAMS = {
  signInFallbackRedirectUrl: "/login",
  signUpFallbackRedirectUrl: "/login",
  continueSignUpUrl: "/login?error=signup_incomplete",
};

type RealClerk = { handleRedirectCallback?: (params: object) => Promise<unknown> };

/**
 * `useClerk()` returns Clerk's *isomorphic* wrapper. Its `handleRedirectCallback` resolves to
 * `undefined` and drops the failure on both paths — it attaches `.catch(() => {})` once clerk-js
 * is live, and queues a callback whose return value the replay discards before then. clerk-js
 * itself is on `window.Clerk` and returns a promise that genuinely rejects, so prefer that.
 */
function getRealClerk(): RealClerk | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Clerk?: RealClerk }).Clerk;
}

export default function SSOCallbackPage() {
  const clerk = useClerk();
  const { isLoaded } = useAuth();
  const [error, setError] = useState<AuthErrorInfo | null>(null);
  const startedRef = useRef(false);
  const settledRef = useRef(false);

  useEffect(() => {
    // Wait for clerk-js: calling earlier only queues the work, and the queue is the path
    // that loses the error. StrictMode also mounts twice, and running the callback twice is
    // what makes Turnstile reject the second render — so fire it once, after load.
    if (!isLoaded || startedRef.current) return;
    startedRef.current = true;

    // First outcome wins: a late failure must not overwrite the timeout notice, or vice versa.
    // `timer` is declared below but only ever read here at call time, well after it is set.
    function settle(info: AuthErrorInfo | null) {
      if (settledRef.current) return;
      settledRef.current = true;
      clearTimeout(timer);
      window.removeEventListener("unhandledrejection", onUnhandled);
      if (info) setError(info);
    }

    // Safety net for anything that still rejects outside our chain. Only claim rejections we
    // can actually explain, so unrelated failures keep their normal console behaviour.
    function onUnhandled(event: PromiseRejectionEvent) {
      if (!isAuthException(event.reason)) return;
      event.preventDefault();
      console.error("SSO callback failed:", event.reason);
      settle(authErrorFromException(event.reason));
    }

    // Neither the listener nor the timer is torn down in a cleanup: StrictMode's simulated
    // unmount would cancel both, and the guard above stops the remount from re-arming them.
    // `settle` owns the teardown instead, and every exit path runs it.
    window.addEventListener("unhandledrejection", onUnhandled);
    const timer = setTimeout(
      () => settle(authErrorFromCode("callback_timeout")),
      CALLBACK_TIMEOUT_MS,
    );

    const run =
      getRealClerk()?.handleRedirectCallback?.(CALLBACK_PARAMS) ??
      clerk.handleRedirectCallback(CALLBACK_PARAMS);

    Promise.resolve(run)
      .then(() => settle(null))
      .catch((err: unknown) => {
        console.error("SSO callback failed:", err);
        settle(authErrorFromException(err));
      });
  }, [clerk, isLoaded]);

  return (
    <div className="flex justify-center items-center min-h-screen app-shell-canvas px-4">
      <div className="w-full max-w-[420px] theme-card-surface rounded-2xl px-8 py-10">
        {error ? (
          <div className="flex flex-col items-center gap-5">
            <AuthErrorNotice error={error} />
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full h-12 rounded-xl text-sm font-medium"
            >
              <Link href="/login">Back to sign in</Link>
            </Button>
            {!error.retryable && (
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Signing in again won&apos;t help — send the code above to your administrator.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Completing sign in...</p>
          </div>
        )}

        {/* Smart CAPTCHA container: a custom flow must supply its own, and it has to be in the
            DOM before the callback effect runs. Collapse the margin only, never the box, so
            Turnstile can still measure it. */}
        <div id="clerk-captcha" data-cl-theme="auto" className="mt-4 empty:mt-0" />
      </div>
    </div>
  );
}
