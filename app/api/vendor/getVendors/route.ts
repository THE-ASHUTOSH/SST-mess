import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

import { unstable_cache } from 'next/cache';

const getCachedVendors = unstable_cache(
    async () => {
        return await db.query.vendors.findMany({
            // Hide soft-deleted vendors (deletedAt set by DELETE /api/vendor/manageVendor).
            where: (vendor, { isNull }) => isNull(vendor.deletedAt),
            // `email` is the vendor's login mapping — superAdmin-only. Never expose it on this
            // public endpoint (consumed by students/vendors); see GET /api/admin/vendors instead.
            columns: { email: false },
            with: {
                menu: true,
            },
        });
    },
    ['vendors-list'], // cache key
    { tags: ['vendors'], revalidate: 3600 } // revalidate after 1 hour and tag
);

export async function GET() {
    try {
        const allVendors = await getCachedVendors();
        return NextResponse.json({ success: true, vendors: allVendors });
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
        return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
    }
}
