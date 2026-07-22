import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vendors } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import { asc, isNull } from 'drizzle-orm';

/**
 * superAdmin-only vendor list that INCLUDES the login email mapping. This is the source for the
 * Manage Vendors editor (needs email to prefill) and the read-only Controls directory. The public
 * GET /api/vendor/getVendors deliberately omits email, so it is only ever exposed here.
 *
 *   GET /api/admin/vendors
 */
export async function GET() {
    try {
        await requireRole(['superAdmin']);

        const rows = await db
            .select({
                id: vendors.id,
                name: vendors.name,
                email: vendors.email,
                description: vendors.description,
                price: vendors.price,
                breakfast: vendors.breakfast,
                lunch: vendors.lunch,
                dinner: vendors.dinner,
            })
            .from(vendors)
            .where(isNull(vendors.deletedAt))
            .orderBy(asc(vendors.name));

        return NextResponse.json({ success: true, vendors: rows });
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            if (error.message === 'Forbidden') return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }
        console.error('Failed to list vendors:', error);
        return NextResponse.json({ success: false, message: 'Failed to list vendors' }, { status: 500 });
    }
}
