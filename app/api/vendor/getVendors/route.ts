import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getScopedVendorIds, getDbUser } from '@/lib/auth-helper';

import { unstable_cache } from 'next/cache';

const getCachedVendors = unstable_cache(
    async () => {
        return await db.query.vendors.findMany({
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
        const user = await getDbUser();

        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const scopedVendorIds = getScopedVendorIds(user);
        const allVendors = await getCachedVendors();

        if (user.role !== 'vendor') {
            return NextResponse.json({ success: true, vendors: allVendors });
        }

        if (!scopedVendorIds || scopedVendorIds.length === 0) {
            return NextResponse.json({ success: false, message: "Vendor account is not linked to a vendor." }, { status: 403 });
        }

        const scopedVendors = allVendors.filter((vendor) => scopedVendorIds.includes(vendor.id));
        return NextResponse.json({ success: true, vendors: scopedVendors });
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
        return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
    }
}
