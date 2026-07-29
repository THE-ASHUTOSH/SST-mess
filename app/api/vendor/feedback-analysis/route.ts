import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vendorFeedbacks } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import { desc } from 'drizzle-orm';

export async function GET(req: Request) {
    try {
        await requireRole(['admin']);

        // Parse pagination parameters
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
        const offset = (page - 1) * limit;

        const feedback = await db.query.vendorFeedbacks.findMany({
            with: {
                vendor: { columns: { email: false } } // never expose the superAdmin-only login email
            },
            limit: limit,
            offset: offset,
            orderBy: [desc(vendorFeedbacks.date)]
        });

        return NextResponse.json({
            success: true,
            data: feedback,
            pagination: {
                page,
                limit,
                hasMore: feedback.length === limit
            }
        });
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message === "Unauthorized") return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
            if (err.message === "Forbidden") return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
            return NextResponse.json({ success: false, message: err.message }, { status: 500 });
        }
        return NextResponse.json({ success: false, message: "An unknown error occurred" }, { status: 500 });
    }
}
