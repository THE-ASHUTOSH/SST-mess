"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";
import Topbar from "@/components/common/layout/Topbar";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/context/UserContext";

/**
 * Shown to someone who authenticated with Google but has no row in `users`.
 *
 * Access to this app is roster-based: an account has to be added by a superAdmin (admins,
 * superAdmins, vendors) or come from the student roster upload. Nothing is created on sign-in,
 * so there is no self-service path out of this screen — only logout, via the Topbar.
 */
export default function NoAccessPage() {
  const { user, loading, notRegistered } = useUser();
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  // Don't let this page strand anyone it doesn't apply to: signed-out visitors belong on login,
  // and a user whose account was added while they sat here should be let through.
  useEffect(() => {
    if (loading || !isLoaded) return;
    if (!isSignedIn) router.replace("/login");
    else if (user) router.replace("/login");
  }, [loading, isLoaded, isSignedIn, user, router]);

  if (loading || !isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

  return (
    <div className="app-shell-canvas flex min-h-screen w-full flex-col">
      <Topbar homeHref="/" />

      <main className="flex flex-1 items-center justify-center px-4 pt-16">
        <div className="w-full max-w-[460px] theme-card-surface rounded-2xl px-6 py-10 sm:px-8 text-center">
          <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>

          <h1 className="mb-2 text-xl font-bold text-foreground">
            You&apos;re not authorized to access this app
          </h1>

          <p className="text-sm leading-relaxed text-muted-foreground">
            Your account isn&apos;t registered for SST Mess. Please contact your administrator to
            request access, then sign in again.
          </p>

          {!notRegistered && (
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              If you were just added, sign out and sign back in to refresh your access.
            </p>
          )}

          <p className="mt-6 text-xs text-muted-foreground">
            Use the account menu above to log out.
          </p>
        </div>
      </main>
    </div>
  );
}
