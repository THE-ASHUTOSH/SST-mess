import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { meals, vendorSelections } from '@/lib/db/schema';
import { getScopedVendorIds, requireRole } from '@/lib/auth-helper';
import { and, eq, gte, lt, inArray, sql } from 'drizzle-orm';

export async function POST(req: Request) {
    try {
        // 1. Authenticate (Vendor or Admin)
        const user = await requireRole(['vendor', 'admin']);
        const scopedVendorIds = getScopedVendorIds(user);

        // 2. Parse Input
        const body = await req.json();
        const { date, vendorId, mealType } = body;

        if (!date || !vendorId || !mealType) {
            return NextResponse.json({ success: false, message: "Missing required fields: date, vendorId, mealType" }, { status: 400 });
        }

        // 3. Logic
        // valid 'date' string (YYYY-MM-DD)
        const targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
            return NextResponse.json({ success: false, message: "Invalid date format" }, { status: 400 });
        }

        if (user.role === 'vendor') {
            if (!scopedVendorIds || scopedVendorIds.length === 0) {
                return NextResponse.json({ success: false, message: "Vendor account is not linked to a vendor." }, { status: 403 });
            }

            if (!scopedVendorIds.includes(vendorId.toString())) {
                return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
            }
        }

        // Find students who selected this vendor for this month
        // We match Month and Year of the selection.
        const selections = await db.select({ userId: vendorSelections.userId })
            .from(vendorSelections)
            .where(and(
                eq(vendorSelections.vendorId, vendorId),
                sql`EXTRACT(MONTH FROM ${vendorSelections.forMonth}) = ${targetDate.getMonth() + 1}`,
                sql`EXTRACT(YEAR FROM ${vendorSelections.forMonth}) = ${targetDate.getFullYear()}`
            ));

        const studentIds = selections.map(s => s.userId);

        if (studentIds.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: "No students selected this vendor for this month." });
        }

        // Count meals for these students on the specific date
        // Assume 'date' (YYYY-MM-DD) means "Full Day in UTC" which covers IST Meal Times.
        // Construct start and end of that UTC day.

        const dayStart = new Date(date); // Parsed as UTC midnight if YYYY-MM-DD
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const mealCountResult = await db.select({ count: sql<number>`count(*)` })
            .from(meals)
            .where(and(
                eq(meals.mealType, mealType),
                inArray(meals.forUserId, studentIds),
                gte(meals.date, dayStart),
                lt(meals.date, dayEnd)
            ));

        const count = mealCountResult[0]?.count || 0;

        return NextResponse.json({ success: true, count: Number(count) });

    } catch (error: unknown) {
        console.error("Error calculating total meals:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
