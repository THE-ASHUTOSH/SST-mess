import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vendorSelections } from '@/lib/db/schema';
import { getDbUser } from '@/lib/auth-helper';
import { and, eq, gte, lte, desc } from 'drizzle-orm';

export async function GET() {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

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
            return NextResponse.json({ message: "No vendor selection found" }, { status: 404 });
        }

        return NextResponse.json({ latestSelection });

    } catch (error) {
        console.error('Error fetching latest vendor selection:', error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
