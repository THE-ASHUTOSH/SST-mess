import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { meals, vendorSelections } from '@/lib/db/schema';
import { getDbUser } from '@/lib/auth-helper';
import jwt from 'jsonwebtoken';
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
        const year = nowtime.getFullYear();
        const month = nowtime.getMonth();

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

        // Fix logic for month range query
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
            return NextResponse.json({ message: "Mess not opted in for this month." }, { status: 403 });
        }

        // Check if vendor offers this meal
        // In schema, vendor has boolean columns: breakfast, lunch, dinner
        if (selection.vendor && !selection.vendor[mealType]) {
            return NextResponse.json({ message: `Vendor does not offer ${mealType}.` }, { status: 403 });
        }

        const startOfDay = new Date(year, month, nowtime.getDate());
        const endOfDay = new Date(year, month, nowtime.getDate() + 1);

        const currentMeal = await db.query.meals.findFirst({
            where: and(
                eq(meals.forUserId, user.id),
                eq(meals.mealType, mealType),
                gte(meals.date, startOfDay),
                lt(meals.date, endOfDay)
            )
        });

        if (currentMeal) {
            return NextResponse.json({ message: "You have already scanned for this meal." }, { status: 403 });
        }

        const token = jwt.sign(
            { userId: user.id, vendorId: selection.vendor.id },
            process.env.JWT_SECRET_KEY || 'default_secret', // Fallback for dev safety
            { expiresIn: "15m" }
        );

        console.log("qr generated for " + user.name + " for vendor " + selection.vendor.name);
        return NextResponse.json({ token });

    } catch (error) {
        console.error("Error generating QR code:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
