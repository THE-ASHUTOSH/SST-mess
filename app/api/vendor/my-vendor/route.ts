import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-helper';
import { getVendorForEmail } from '@/lib/vendor-scope';

/**
 * Returns the vendor mapped to the CURRENT vendor user (by their login email), for the vendor
 * UI to show "you are scanning for X". Display-only — the scanner/stats endpoints re-resolve this
 * server-side and never trust a client-supplied vendorId. `vendor` is null if nothing is linked.
 *
 *   GET /api/vendor/my-vendor
 */
export async function GET() {
    try {
        const user = await requireRole(['vendor']);
        const vendor = await getVendorForEmail(user.email);
        return NextResponse.json({ success: true, vendor });
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            if (error.message === 'Forbidden') return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }
        console.error('Failed to resolve vendor for user:', error);
        return NextResponse.json({ success: false, message: 'Failed to resolve vendor' }, { status: 500 });
    }
}
