import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, vendors } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import { and, asc, eq, isNull, ne, notExists, sql } from 'drizzle-orm';

/**
 * Vendor login accounts available to link to a vendor entity — superAdmin ONLY.
 *
 * A vendor entity no longer accepts a free-text email: it is bound to an account that already
 * exists with role 'vendor' (created under Admin Controls → User Management). This endpoint
 * returns the accounts that are selectable right now:
 *
 *   - role = 'vendor', AND
 *   - not already linked to some other ACTIVE vendor
 *
 * Pass ?vendorId=<id> when editing, so the account currently linked to THAT vendor stays in the
 * list — otherwise the edit form would have no way to keep its own current value.
 *
 *   GET /api/admin/vendor-users[?vendorId=<uuid>]
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
    try {
        await requireRole(['superAdmin']);

        const vendorId = req.nextUrl.searchParams.get('vendorId');
        if (vendorId && !UUID_RE.test(vendorId)) {
            return NextResponse.json({ success: false, message: 'A valid vendor id is required' }, { status: 400 });
        }

        // Correlated NOT EXISTS: exclude accounts already claimed by an active vendor, except
        // the vendor being edited. Soft-deleted vendors release their account back to the pool.
        const claimedByAnotherVendor = db
            .select({ one: sql`1` })
            .from(vendors)
            .where(
                and(
                    isNull(vendors.deletedAt),
                    sql`lower(${vendors.email}) = lower(${users.email})`,
                    vendorId ? ne(vendors.id, vendorId) : undefined,
                ),
            );

        const rows = await db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(and(eq(users.role, 'vendor'), notExists(claimedByAnotherVendor)))
            .orderBy(asc(users.name))
            .limit(200);

        return NextResponse.json({ success: true, users: rows });
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            if (error.message === 'Forbidden') return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }
        console.error('Failed to list vendor accounts:', error);
        return NextResponse.json({ success: false, message: 'Failed to load vendor accounts' }, { status: 500 });
    }
}
