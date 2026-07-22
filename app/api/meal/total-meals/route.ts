import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { meals, vendorSelections } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import { getVendorForEmail } from '@/lib/vendor-scope';
import { and, eq, gte, lt, inArray, sql, SQL } from 'drizzle-orm';

export async function POST(req: Request) {
    try {
        // 1. Authenticate (Vendor or Admin)
        const user = await requireRole(['vendor', 'admin']);

        // 2. Parse Input
        const body = await req.json();
        const { date, vendorId, mealType, period = 'daily' } = body;

        if (!date || !mealType) {
            return NextResponse.json({ success: false, message: "Missing required fields: date, mealType" }, { status: 400 });
        }

        // A vendor user can only ever see THEIR OWN vendor's counts: resolve it server-side from
        // their login email and ignore any client-supplied vendorId. admin/superAdmin may pass any
        // vendorId (including 'all'). This is the trust boundary for cross-vendor stats isolation.
        let effectiveVendorId: string;
        if (user.role === 'vendor') {
            const myVendor = await getVendorForEmail(user.email);
            if (!myVendor) {
                return NextResponse.json({ success: false, message: "No vendor is linked to your account. Contact an admin." }, { status: 403 });
            }
            effectiveVendorId = myVendor.id;
        } else {
            if (!vendorId) {
                return NextResponse.json({ success: false, message: "Missing required field: vendorId" }, { status: 400 });
            }
            effectiveVendorId = vendorId;
        }

        if (!['daily', 'weekly', 'monthly'].includes(period)) {
            return NextResponse.json({ success: false, message: "Invalid period. Must be daily, weekly, or monthly" }, { status: 400 });
        }

        // 3. Parse date (YYYY-MM-DD, treated as UTC midnight)
        const targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
            return NextResponse.json({ success: false, message: "Invalid date format" }, { status: 400 });
        }

        // 4. Compute date range based on period
        const dayStart = new Date(date);
        const dayEnd = new Date(dayStart);

        if (period === 'daily') {
            dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
        } else if (period === 'weekly') {
            dayEnd.setUTCDate(dayEnd.getUTCDate() + 7);
        } else {
            // monthly: first of month → first of next month
            dayEnd.setUTCMonth(dayEnd.getUTCMonth() + 1);
            dayEnd.setUTCDate(1);
        }

        // 5. Build meal filter conditions
        const mealConditions: SQL[] = [
            gte(meals.date, dayStart),
            lt(meals.date, dayEnd),
        ];

        if (mealType !== 'all') {
            mealConditions.push(eq(meals.mealType, mealType));
        }

        // 6. Vendor filter — if not "all", find opted-in students for this vendor+month
        if (effectiveVendorId !== 'all') {
            const selections = await db.select({ userId: vendorSelections.userId })
                .from(vendorSelections)
                .where(and(
                    eq(vendorSelections.vendorId, effectiveVendorId),
                    sql`EXTRACT(MONTH FROM ${vendorSelections.forMonth}) = ${targetDate.getUTCMonth() + 1}`,
                    sql`EXTRACT(YEAR FROM ${vendorSelections.forMonth}) = ${targetDate.getUTCFullYear()}`
                ));

            const studentIds = selections.map(s => s.userId);

            if (studentIds.length === 0) {
                return NextResponse.json({ success: true, count: 0, message: "No students selected this vendor for this month." });
            }

            mealConditions.push(inArray(meals.forUserId, studentIds));
        }

        // 7. Count
        const mealCountResult = await db.select({ count: sql<number>`count(*)` })
            .from(meals)
            .where(and(...mealConditions));

        const count = mealCountResult[0]?.count || 0;

        return NextResponse.json({ success: true, count: Number(count) });

    } catch (error: unknown) {
        console.error("Error calculating total meals:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
