import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { meals } from '@/lib/db/schema';
import { getDbUser } from '@/lib/auth-helper';
import { and, eq, gte, lt } from 'drizzle-orm';

export async function GET() {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const nowtime = new Date();
        const istTime = new Date(nowtime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const indianHours = istTime.getHours();

        let mealType: 'breakfast' | 'lunch' | 'dinner';
        if (indianHours >= 7 && indianHours < 10) {
            mealType = "breakfast";
        } else if (indianHours >= 12 && indianHours < 15) {
            mealType = "lunch";
        } else if (indianHours >= 19 && indianHours < 22) {
            mealType = "dinner";
        } else {
            return NextResponse.json({ message: "Wrong meal time." }, { status: 403 });
        }

        const startOfDay = new Date(nowtime.getFullYear(), nowtime.getMonth(), nowtime.getDate());
        const endOfDay = new Date(nowtime.getFullYear(), nowtime.getMonth(), nowtime.getDate() + 1);

        const meal = await db.query.meals.findFirst({
            where: and(
                eq(meals.forUserId, user.id),
                eq(meals.mealType, mealType),
                gte(meals.date, startOfDay),
                lt(meals.date, endOfDay)
            )
        });

        if (meal) {
            return NextResponse.json({ status: "scanned" });
        }

        return NextResponse.json({ status: "not_scanned" });

    } catch (error) {
        console.error("Error getting meal status:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
