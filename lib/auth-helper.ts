import { currentUser } from "@clerk/nextjs/server";
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
 * Resolves the caller's app account from their Clerk session.
 *
 * A row in `users` IS the authorization to use this app. Accounts are never created here — an
 * unknown email gets `null`, and the caller is treated as unauthorized. New accounts come only
 * from the superAdmin user panel (admin/superAdmin/vendor) or the student roster upload.
 *
 * Returns null when there is no Clerk session, no email on it, or no matching row.
 */
export async function getDbUser(): Promise<IUser | null> {
    const clerkUser = await currentUser();

    if (!clerkUser) {
        return null;
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;

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
