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

        // Validate month and year
        month = Math.max(1, Math.min(12, parseInt(month)));
        year = parseInt(year);

        if (isNaN(month) || isNaN(year) || year < 2020 || year > 2100) {
            return NextResponse.json({ success: false, message: "Invalid month or year" }, { status: 400 });
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1); // Next month start

        const selections = await db.query.vendorSelections.findMany({
            where: and(
                gte(vendorSelections.forMonth, startDate),
                lt(vendorSelections.forMonth, endDate)
            ),
            with: {
                vendor: true
            }
        });

        return NextResponse.json({ success: true, data: selections });
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message === "Unauthorized") return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
            if (err.message === "Forbidden") return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
            return NextResponse.json({ success: false, message: err.message }, { status: 500 });
        }
        return NextResponse.json({ success: false, message: "An unknown error occurred" }, { status: 500 });
    }
}
