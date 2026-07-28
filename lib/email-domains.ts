/**
 * Email domains allowed to hold an account in this app.
 *
 * Sign-in is Google SSO restricted to these domains, so an address outside them can never
 * authenticate. Since a row in `users` is what grants access, creating one for an outside
 * address would only ever produce a dead account.
 *
 * Kept dependency-free so both route handlers and client components can import it.
 */
export const ALLOWED_EMAIL_DOMAINS: readonly string[] = ["sst.scaler.com", "scaler.com"];

/** Human-readable list for form hints and error copy, e.g. "@sst.scaler.com or @scaler.com". */
export const ALLOWED_EMAIL_DOMAINS_LABEL = ALLOWED_EMAIL_DOMAINS.map((d) => `@${d}`).join(" or ");

/**
 * Exact-domain, case-insensitive match. Subdomains are NOT accepted — `x@a.scaler.com` is
 * rejected, matching the sign-in gate. Uses the last `@` so a malformed local part cannot
 * smuggle an allowed domain through.
 */
export function isAllowedEmailDomain(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at < 1 || at === normalized.length - 1) return false;
  return ALLOWED_EMAIL_DOMAINS.includes(normalized.slice(at + 1));
}
