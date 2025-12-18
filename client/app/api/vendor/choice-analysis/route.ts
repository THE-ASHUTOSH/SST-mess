import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vendorSelections } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import { and, gte, lt } from 'drizzle-orm';

export async function POST(req: Request) {
    try {
        await requireRole(['vendor', 'admin']);

        const body = await req.json();
        let { month, year } = body;

        if (month === undefined || year === undefined) {
            const today = new Date();
            month = today.getMonth() + 1; // 1-indexed
            year = today.getFullYear();
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1); // Next month start

        const section = await db.query.vendorSelections.findMany({
            where: and(
                gte(vendorSelections.forMonth, startDate),
                lt(vendorSelections.forMonth, endDate)
            ),
            with: {
                vendor: true
            }
        });

        return NextResponse.json({ success: true, data: section });
    } catch (err: any) {
        if (err.message === "Unauthorized") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        if (err.message === "Forbidden") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        return NextResponse.json({ success: false, err: err.message }, { status: 400 });
    }
}
