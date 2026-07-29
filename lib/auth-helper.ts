import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";
import { users } from "./db/schema";
import { sql } from "drizzle-orm";

// Define the User interface based on the SQL schema
export interface IUser {
    id: string;
    email: string;
    role: 'admin' | 'student' | 'vendor' | 'superAdmin'; // or string if relying on raw string
    name: string;
    picture?: string | null;
    roll?: string | null;
    batch?: string | null;
}

/**
 * The caller's email, taken from the signed session token whenever possible.
 *
 * `auth()` reads the verified JWT locally — no network. `currentUser()` looks the same but makes an
 * HTTP request to Clerk's Backend API (measured at 400–570ms) purely to translate the token's
 * userId into an email, and it sits on ~24 API routes. Reading a custom claim instead makes it free.
 *
 * REQUIRES this claim in the Clerk Dashboard, under **Sessions → Customize session token**:
 *
 *   { "email": "{{user.primary_email_address}}" }
 *
 * The claim carries IDENTITY only. Clerk signs the token (RS256) so it cannot be forged, but it is
 * readable by the user — never put a secret in a claim. The caller's ROLE is deliberately NOT in the
 * token: it is read from the `users` row below on every request, so revoking access takes effect
 * immediately instead of waiting for the token to refresh.
 *
 * Clerk types custom claims as `unknown`, hence the explicit narrowing. The fallback covers tokens
 * minted BEFORE the claim was configured; those age out as sessions refresh (about a minute), so it
 * is rare and self-healing.
 */
async function getSessionEmail(): Promise<string | null> {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
        return null;
    }

    const claimed = sessionClaims?.email;
    if (typeof claimed === "string" && claimed.includes("@")) {
        return claimed;
    }

    const clerkUser = await currentUser();
    return clerkUser?.emailAddresses[0]?.emailAddress ?? null;
}

/**
 * Resolves the caller's app account from their Clerk session.
 *
 * A row in `users` IS the authorization to use this app. Accounts are never created here — an
 * unknown email gets `null`, and the caller is treated as unauthorized. New accounts come only
 * from the superAdmin user panel (admin/superAdmin/vendor) or the student roster upload.
 *
 * The ROLE always comes from the row, never from the token, so revoking access takes effect on the
 * next request instead of waiting for the session to refresh.
 *
 * Returns null when there is no Clerk session, no email on it, or no matching row.
 */
export async function getDbUser(): Promise<IUser | null> {
    const email = await getSessionEmail();

    if (!email) {
        return null;
    }

    // Case-insensitive match: Clerk echoes whatever casing the user typed, while stored emails
    // are lowercased on write. Without this a mixed-case login silently misses its own row.
    const [user] = await db
        .select()
        .from(users)
        .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
        .limit(1);

    return (user as unknown as IUser) ?? null;
}

export async function requireRole(allowedRoles: string[]) {
    const user = await getDbUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    // superAdmin is a superset of every role: it can access anything an admin (or below) can,
    // so it passes every role check without being listed explicitly on each endpoint.
    if (user.role === 'superAdmin') {
        return user;
    }

    if (!allowedRoles.includes(user.role || 'student')) {
        throw new Error("Forbidden");
    }

    return user;
}
