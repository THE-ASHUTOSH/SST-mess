"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useClerk, useSignIn } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { ArrowLeft, GraduationCap, Loader2, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import AuthErrorNotice from "@/components/common/AuthErrorNotice";
import {
  authErrorFromCode,
  authErrorFromException,
  type AuthErrorInfo,
} from "@/lib/auth-errors";
import { useUser } from "@/context/UserContext";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { signOut } = useClerk();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, loading, notRegistered, authError, setAuthError } = useUser();

  const [error, setError] = useState<AuthErrorInfo | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  // Surface auth rejections raised by UserContext (e.g. a non-SST Google account)
  useEffect(() => {
    if (!authError) return;
    const info = authErrorFromCode(authError);
    setError(info);
    toast.error(info.title, { description: info.message });
    setAuthError(null);
  }, [authError, setAuthError]);

  // Any ?error=<code> handed over by the SSO callback or a route guard
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (!errorParam) return;
    setError(authErrorFromCode(errorParam));
  }, [searchParams]);

  // Authenticated with Google but absent from the roster — there is no dashboard to send
  // them to, so explain it rather than bouncing them into a role they don't have.
  useEffect(() => {
    if (loading || !notRegistered) return;
    router.replace("/noAccess");
  }, [loading, notRegistered, router]);

  // Once UserContext resolves a DB user, route by role — unless we're showing a failure
  useEffect(() => {
    if (loading || !user || error) return;
    if (user.role === "admin" || user.role === "superAdmin") router.replace("/admin/dashboard");
    else if (user.role === "vendor") router.replace("/vendorUser/dashboard");
    else router.replace("/student/dashboard");
  }, [user, loading, router, error]);

  // These codes leave a Clerk session with no usable app account — drop it so the retry is clean
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const orphanSession =
      errorParam === "not_registered" || errorParam === "unauthorized_domain";
    if (!orphanSession || !authLoaded || !isSignedIn || isSigningOut) return;

    setIsSigningOut(true);
    signOut().then(() => {
      router.replace("/login");
    });
  }, [searchParams, authLoaded, isSignedIn, signOut, router, isSigningOut]);

  const handleGoogleSignIn = async () => {
    if (!signIn || isRedirecting) return;

    // If already signed in, let the UserContext role-redirect effect handle it.
    if (authLoaded && isSignedIn) {
      setIsRedirecting(true);
      return;
    }

    setIsRedirecting(true);
    setError(null);

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/login/sso-callback",
        redirectUrlComplete: "/login",
      });
    } catch (err) {
      console.error("Google sign-in error:", err);
      setError(authErrorFromException(err));
      setIsRedirecting(false);
    }
  };

  const isLoading = !signInLoaded || !authLoaded || !mounted;

  return (
    <div className="flex min-h-screen app-shell-canvas text-foreground">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-4 lg:p-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="lg:hidden">Back</span>
          </Link>
          {mounted && (
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center px-4 pb-8">
          <div className="w-full max-w-[420px] app-shell-panel rounded-3xl p-6 sm:p-8">
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-1">SST Mess</h1>
              <p className="text-muted-foreground text-sm">
                Sign in to access your dashboard
              </p>
            </div>

            <div className="hidden lg:block mb-8">
              <h1 className="text-2xl font-bold mb-2">Sign in</h1>
              <p className="text-muted-foreground">
                Use your SST Google account to continue
              </p>
            </div>

            {error && <AuthErrorNotice error={error} className="mb-6" />}

            <Button
              variant="outline"
              size="lg"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isRedirecting}
              className="w-full h-12 rounded-xl text-sm font-medium gap-3 border-border hover:bg-accent transition-all duration-200"
            >
              {isRedirecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <GoogleIcon className="w-5 h-5" />
              )}
              {isRedirecting
                ? "Redirecting to Google..."
                : "Continue with Google"}
            </Button>

            {/* Clerk Smart CAPTCHA mounts here — a custom flow must supply its own container */}
            <div
              id="clerk-captcha"
              data-cl-theme="auto"
              data-cl-size="flexible"
              className="mt-4 empty:mt-0"
            />

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 text-muted-foreground app-shell-topbar rounded-full">
                  SST Accounts Only
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/60 dark:bg-background/20 p-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 flex-shrink-0">
                  <GraduationCap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">
                    Authorized Access Only
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Sign in is restricted to registered SST students and
                    administrators. Contact your administrator if you need
                    access.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} Scaler School of Technology
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen app-shell-canvas">
          <div className="flex flex-col items-center gap-4 app-shell-panel rounded-2xl px-8 py-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
