import { db } from '@/lib/db';
import { vendors } from '@/lib/db/schema';
import { and, isNull, sql } from 'drizzle-orm';

/**
 * Maps a logged-in vendor user to THEIR vendor via the vendor's login email.
 *
 * This is the trust boundary for vendor scoping: the scanner and stats endpoints resolve the
 * caller's vendor here (from the session email) instead of trusting a client-supplied vendorId,
 * so one vendor can never act on another vendor's students or stats.
 *
 * Matches case-insensitively against active (non-soft-deleted) vendors. Returns null if the
 * user's email isn't linked to any active vendor.
 */
export async function getVendorForEmail(email: string): Promise<{ id: string; name: string } | null> {
    if (!email) return null;
    const [vendor] = await db
        .select({ id: vendors.id, name: vendors.name })
        .from(vendors)
        .where(and(sql`lower(${vendors.email}) = ${email.toLowerCase()}`, isNull(vendors.deletedAt)))
        .limit(1);
    return vendor ?? null;
}
