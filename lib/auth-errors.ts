import { isClerkAPIResponseError, isClerkRuntimeError } from "@clerk/nextjs/errors";

/**
 * Sign-in is a custom Clerk flow (`signIn.authenticateWithRedirect` -> `/login/sso-callback`),
 * so Clerk never renders its own error UI for us. Every failure has to be translated here or
 * the user is left staring at a spinner.
 */
export type AuthErrorInfo = {
  title: string;
  message: string;
  /** Clerk code (or an app-local one) — shown small so a user can quote it to an admin. */
  code: string;
  /** Whether starting the sign-in over could plausibly succeed. */
  retryable: boolean;
};

type AuthErrorCopy = Omit<AuthErrorInfo, "code">;

const UNKNOWN: AuthErrorCopy = {
  title: "Sign-in failed",
  message:
    "Something went wrong while signing you in. Please try again — if it keeps happening, contact your administrator.",
  retryable: true,
};

const CAPTCHA: AuthErrorCopy = {
  title: "Couldn't verify your browser",
  message:
    "The bot-protection check didn't complete. Disable any ad-blocker or privacy extension for this site, then try again.",
  retryable: true,
};

const RESTRICTED: AuthErrorCopy = {
  title: "Access restricted",
  message:
    "This application isn't accepting new accounts right now. Ask your administrator to register you first.",
  retryable: false,
};

const ALREADY_SIGNED_IN: AuthErrorCopy = {
  title: "Already signed in",
  message:
    "This browser already has an active session. Reload the page to continue to your dashboard.",
  retryable: true,
};

const CANCELLED: AuthErrorCopy = {
  title: "Google sign-in cancelled",
  message: "The Google permission screen was dismissed. Try again and pick your SST account.",
  retryable: true,
};

const NETWORK: AuthErrorCopy = {
  title: "Network problem",
  message: "We couldn't reach the sign-in service. Check your connection and try again.",
  retryable: true,
};

const QUOTA: AuthErrorCopy = {
  title: "Sign-in unavailable",
  message:
    "This environment has reached its account limit, so no new accounts can be created. Contact your administrator.",
  retryable: false,
};

/**
 * A Clerk *development* instance is capped at 100 users and reports the overflow as a plain
 * 403 on `POST /v1/client/sign_ups`. The code is not documented, so match the message instead.
 */
const QUOTA_PATTERN = /limit of \d+ users|use a Production instance/i;

/** Codes we can explain precisely. Anything else falls back to Clerk's own copy, then UNKNOWN. */
const COPY: Record<string, AuthErrorCopy> = {
  // App-local codes, handed to /login as ?error=<code>
  not_registered: {
    title: "You're not registered",
    message:
      "Your account isn't on the SST Mess roster. Ask your administrator to add you, then sign in again.",
    retryable: true,
  },
  unauthorized_domain: {
    title: "Unauthorized domain",
    message:
      "Only @sst.scaler.com and @scaler.com Google accounts can sign in here. Switch accounts and try again.",
    retryable: true,
  },
  signup_incomplete: {
    title: "Account setup incomplete",
    message:
      "Your account needs details this app can't collect. Contact your administrator to finish setting it up.",
    retryable: false,
  },
  callback_timeout: {
    title: "Sign-in timed out",
    message:
      "Google sent you back, but we couldn't finish signing you in. This is usually a slow or blocked network — please try again.",
    retryable: true,
  },

  // Bot protection (Clerk Smart CAPTCHA / Cloudflare Turnstile)
  captcha_invalid: CAPTCHA,
  captcha_unavailable: CAPTCHA,
  captcha_not_enabled: CAPTCHA,
  requires_captcha: CAPTCHA,

  // Instance restrictions — an admin has to change a setting, retrying won't help
  not_allowed_access: RESTRICTED,
  sign_up_restricted: RESTRICTED,
  blocked: RESTRICTED,

  // OAuth round-trip problems
  oauth_access_denied: CANCELLED,
  access_denied: CANCELLED,
  external_account_not_found: {
    title: "Google account not linked",
    message:
      "We couldn't match that Google account to a user here. Try again, or ask your administrator to check your email address.",
    retryable: true,
  },
  oauth_email_domain_reserved: {
    title: "Wrong sign-in method",
    message:
      "That email is managed by a different sign-in method. Use your SST Google account to continue.",
    retryable: true,
  },
  identifier_not_found: {
    title: "Account not found",
    message: "We couldn't find an account for that email. Ask your administrator to register you.",
    retryable: true,
  },
  form_identifier_not_found: {
    title: "Account not found",
    message: "We couldn't find an account for that email. Ask your administrator to register you.",
    retryable: true,
  },

  // Session state
  session_exists: ALREADY_SIGNED_IN,
  identifier_already_signed_in: ALREADY_SIGNED_IN,
  single_session_mode: ALREADY_SIGNED_IN,

  // Transport
  network_error: NETWORK,
};

/** Resolve an app-local or Clerk code (e.g. from `?error=`) into display copy. */
export function authErrorFromCode(code: string | null | undefined): AuthErrorInfo {
  const key = (code ?? "").trim();
  if (!key) {
    return { ...UNKNOWN, code: "unknown_error" };
  }
  if (key.startsWith("captcha")) {
    return { ...CAPTCHA, code: key };
  }
  return { ...(COPY[key] ?? UNKNOWN), code: key };
}

/**
 * Whether a value is an error this module can explain. Used to decide if a stray
 * `unhandledrejection` belongs to the auth flow before acting on it.
 */
export function isAuthException(err: unknown): boolean {
  return isClerkAPIResponseError(err) || isClerkRuntimeError(err);
}

/** Resolve a thrown Clerk error (or anything else) into display copy. */
export function authErrorFromException(err: unknown): AuthErrorInfo {
  if (isClerkAPIResponseError(err)) {
    const first = err.errors?.[0];
    const code = first?.code ?? "unknown_error";
    const detail = first?.longMessage || first?.message || "";

    // Clerk namespaces every bot-protection failure with a captcha_* code.
    if (code.startsWith("captcha")) {
      return { ...CAPTCHA, code };
    }

    if (QUOTA_PATTERN.test(detail) || QUOTA_PATTERN.test(err.message ?? "")) {
      return { ...QUOTA, code };
    }

    const known = COPY[code];
    if (known) {
      return { ...known, code };
    }

    // No mapping of our own, but Clerk's copy is written for end users — prefer it.
    return { ...UNKNOWN, code, message: detail || UNKNOWN.message };
  }

  if (isClerkRuntimeError(err)) {
    return { ...(COPY[err.code] ?? UNKNOWN), code: err.code };
  }

  if (err instanceof Error && /network|fetch|load failed/i.test(err.message)) {
    return { ...NETWORK, code: "network_error" };
  }

  return { ...UNKNOWN, code: "unknown_error" };
}
