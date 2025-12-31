import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { meals } from '@/lib/db/schema';
import { getDbUser } from '@/lib/auth-helper';
import { and, eq, gte, lt } from 'drizzle-orm';
import { getCurrentMealType, getISTDayBounds } from '@/lib/utils/timezone';

export async function GET() {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const mealType = getCurrentMealType();
        if (!mealType) {
            return NextResponse.json({ success: false, message: "Wrong meal time." }, { status: 403 });
        }

        const { startOfDay, endOfDay } = getISTDayBounds();

        const meal = await db.query.meals.findFirst({
            where: and(
                eq(meals.forUserId, user.id),
                eq(meals.mealType, mealType),
                gte(meals.date, startOfDay),
                lt(meals.date, endOfDay)
            )
        });

        if (meal) {
            return NextResponse.json({ success: true, status: "scanned" });
        }

        return NextResponse.json({ success: true, status: "not_scanned" });

    } catch (error) {
        console.error("Error getting meal status:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
