import { currentUser } from "@clerk/nextjs/server";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

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

export async function getDbUser(): Promise<IUser | null> {
    const clerkUser = await currentUser();

    if (!clerkUser) {
        return null;
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
        return null;
    }

    const domain = email.split('@')[1];
    const allowedDomains = ["sst.scaler.com", "scaler.com"];

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    // If user doesn't exist in DB, create new one
    if (!user) {
        if (!allowedDomains.includes(domain)) {
            return null; // Don't create user for unauthorized domain
        }

        const [newUser] = await db.insert(users).values({
            email,
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
            picture: clerkUser.imageUrl,
            role: 'student',
        }).returning();

        // Cast or map to IUser. Drizzle type should match mostly, but null vs undefined handling might be needed
        return newUser as unknown as IUser;
    }

    return user as unknown as IUser;
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
