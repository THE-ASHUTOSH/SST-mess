import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
// import { vendors, vendorFeedbacks } from '@/lib/db/schema'; // Not needed if using query builder
import { requireRole } from '@/lib/auth-helper';

export async function GET() {
    try {
        await requireRole(['admin']);

        const feedback = await db.query.vendorFeedbacks.findMany({
            with: {
                vendor: true
            }
        });

        // The original code returned a slightly manipulated structure (data = feedback where vendor is populated).
        // Drizzle returns exactly that if relation exists.
        // However, the original code had a manual mapping:
        /*
        feedback.map(feed => {
             if (!feed.vendor) return { ...feed, vendor: null };
             ... find vendor ...
             return { ...feed, vendor };
        })
        */
        // Drizzle already nests it. So `feedback` array contains objects like { ..., vendor: { ... } }.

        return NextResponse.json({ success: true, data: feedback });
    } catch (err: any) {
        if (err.message === "Unauthorized") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        if (err.message === "Forbidden") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        return NextResponse.json({ success: false, err: err.message }, { status: 400 });
    }
}
