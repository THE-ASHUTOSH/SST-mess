import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vendorSelections } from '@/lib/db/schema';
import { getDbUser } from '@/lib/auth-helper';
import { and, eq, gte, lte, desc } from 'drizzle-orm';
import { getISTMonthStart, getISTMonthEnd } from '@/lib/utils/timezone';

export async function GET() {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const startOfMonth = getISTMonthStart();
        const endOfMonth = getISTMonthEnd();

        const latestSelection = await db.query.vendorSelections.findFirst({
            where: and(
                eq(vendorSelections.userId, user.id),
                gte(vendorSelections.forMonth, startOfMonth),
                lte(vendorSelections.forMonth, endOfMonth)
            ),
            orderBy: [desc(vendorSelections.createdAt)],
            with: {
                vendor: true
            }
        });

        if (!latestSelection) {
            return NextResponse.json({ success: false, message: "No vendor selection found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, latestSelection });

    } catch (error) {
        console.error('Error fetching latest vendor selection:', error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
