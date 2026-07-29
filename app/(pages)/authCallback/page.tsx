import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getDbUser } from "@/lib/auth-helper";
import FullScreenLoader from "@/components/common/FullScreenLoader";

/**
 * Where every signed-in visitor is sent to be routed by role.
 *
 * This is a SERVER component, which is the whole point. It calls `getDbUser()` directly — no
 * clerk-js load, no `getToken()`, no `/api/user/me` round trip — and issues the redirect before any
 * HTML reaches the browser. The old flow landed on `/login`, mounted the client page, and only
 * redirected once a four-hop client waterfall had finished, which is what made the login form sit
 * there for seconds.
 *
 * Reached from two directions:
 *  - `redirectUrlComplete` after the Google OAuth handshake
 *  - `middleware.ts`, when a signed-in visitor opens /login
 *
 * DO NOT add a loading.tsx to this segment. It opens a Suspense boundary, so Next flushes the
 * fallback shell before this component finishes; the headers are then already sent and `redirect()`
 * degrades from a real 307 into a client-side navigation performed during render — which paints the
 * loader, then races whatever navigation is already in flight. Verified: with loading.tsx this route
 * answered `200` and leaked NEXT_REDIRECT into the body; without it, a clean `307`.
 */
export const dynamic = "force-dynamic";

export default async function AuthCallbackPage() {
  // No session at all belongs on the login form, not on the no-access screen. Checked separately
  // because getDbUser() returns null for both "signed out" and "signed in but not on the roster".
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  let user = null;

  // Never let a transient DB failure look like "not registered" — that would sign people out of an
  // app they have every right to use. Fall through to the loader and let them retry instead.
  try {
    user = await getDbUser();
  } catch (error) {
    console.error("authCallback: failed to resolve the current user:", error);
    return (
      <FullScreenLoader
        title="Couldn't reach the server"
        detail="We couldn't confirm your access just now. Please refresh to try again."
      />
    );
  }

  // A row in `users` is the authorization; without one there is no dashboard to send them to.
  if (!user) {
    redirect("/noAccess");
  }

  if (user.role === "admin" || user.role === "superAdmin") {
    redirect("/admin/dashboard");
  }
  if (user.role === "vendor") {
    redirect("/vendorUser/dashboard");
  }
  redirect("/student/dashboard");
}
