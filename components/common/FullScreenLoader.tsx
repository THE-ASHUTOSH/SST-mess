import { Loader2 } from "lucide-react";

interface FullScreenLoaderProps {
  /** Headline, e.g. "Signing you in". */
  title?: string;
  /** One line of reassurance underneath. */
  detail?: string;
}

/**
 * The interstitial shown while the server works out where a signed-in user belongs.
 *
 * Deliberately not a login form and not a dashboard — it is the honest answer to "we know who you
 * are, we're finding your dashboard". A server component, so it costs no client JS.
 */
export default function FullScreenLoader({
  title = "Signing you in",
  detail = "Just a moment while we get your dashboard ready.",
}: FullScreenLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="app-shell-canvas flex min-h-screen w-full items-center justify-center px-4"
    >
      <div className="w-full max-w-[380px] theme-card-surface rounded-2xl px-8 py-10 text-center">
        <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
        </div>
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
