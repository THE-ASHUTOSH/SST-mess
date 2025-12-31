import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { meals, vendorSelections } from '@/lib/db/schema';
import { getDbUser } from '@/lib/auth-helper';
import jwt from 'jsonwebtoken';
import { and, eq, gte, lt } from 'drizzle-orm';
import { getCurrentMealType, getISTDayBounds, getISTMonthStart, getISTNow } from '@/lib/utils/timezone';

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

        const istNow = getISTNow();
        const year = istNow.getFullYear();
        const month = istNow.getMonth();

        // Get vendor selection for current month
        const selection = await db.query.vendorSelections.findFirst({
            where: and(
                eq(vendorSelections.userId, user.id),
                gte(vendorSelections.forMonth, new Date(year, month, 1)),
                lt(vendorSelections.forMonth, new Date(year, month + 1, 1))
            ),
            with: {
                vendor: true
            }
        });

        if (!selection) {
            return NextResponse.json({ success: false, message: "Mess not opted in for this month." }, { status: 403 });
        }

        // Check if vendor offers this meal
        if (selection.vendor && !selection.vendor[mealType]) {
            return NextResponse.json({ success: false, message: `Vendor does not offer ${mealType}.` }, { status: 403 });
        }

        const { startOfDay, endOfDay } = getISTDayBounds();

        // Check if already scanned today
        const currentMeal = await db.query.meals.findFirst({
            where: and(
                eq(meals.forUserId, user.id),
                eq(meals.mealType, mealType),
                gte(meals.date, startOfDay),
                lt(meals.date, endOfDay)
            )
        });

        if (currentMeal) {
            return NextResponse.json({ success: false, message: "You have already scanned for this meal." }, { status: 403 });
        }

        const jwtSecret = process.env.JWT_SECRET_KEY;
        if (!jwtSecret) {
            console.error("CRITICAL: JWT_SECRET_KEY environment variable is not configured");
            return NextResponse.json({ success: false, message: "Server configuration error" }, { status: 500 });
        }

        const token = jwt.sign(
            { userId: user.id, vendorId: selection.vendor.id },
            jwtSecret,
            { expiresIn: "15m" }
        );

        if (process.env.NODE_ENV !== 'production') {
            console.log("QR generated for " + user.name + " for vendor " + selection.vendor.name);
        }

        return NextResponse.json({ success: true, token });

    } catch (error) {
        console.error("Error generating QR code:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
