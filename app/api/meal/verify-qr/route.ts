import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { meals, users } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { and, eq, gte, lt } from 'drizzle-orm';
import { getCurrentMealType, getISTDayBounds } from '@/lib/utils/timezone';

interface QrCodePayload extends JwtPayload {
    userId: string;
    vendorId: string;
}

export async function POST(req: Request) {
    try {
        const byUser = await requireRole(['vendor', 'admin']);

        const body = await req.json();
        const { token, vendorId } = body;

        // Validate required fields
        if (!token || typeof token !== 'string') {
            return NextResponse.json({ success: false, message: "Token is required" }, { status: 400 });
        }

        if (!vendorId) {
            return NextResponse.json({ success: false, message: "Vendor ID is required" }, { status: 400 });
        }

        // Validate JWT secret
        const jwtSecret = process.env.JWT_SECRET_KEY;
        if (!jwtSecret) {
            console.error("CRITICAL: JWT_SECRET_KEY environment variable is not configured");
            return NextResponse.json({ success: false, message: "Server configuration error" }, { status: 500 });
        }

        // Verify token from QR
        const decoded = jwt.verify(token, jwtSecret) as QrCodePayload;
        const forUserId = decoded.userId;
        const userVendorId = decoded.vendorId;

        const isVendorAuthorized = Array.isArray(vendorId)
            ? vendorId.includes(userVendorId.toString())
            : userVendorId.toString() === vendorId.toString();

        if (!isVendorAuthorized) {
            return NextResponse.json({ success: false, message: "This student is not assigned to your vendor." }, { status: 403 });
        }

        const mealType = getCurrentMealType();
        if (!mealType) {
            return NextResponse.json({ success: false, message: "Wrong meal time." }, { status: 403 });
        }

        const { startOfDay, endOfDay } = getISTDayBounds();

        // Check if already eaten - use the unique constraint to handle race condition
        const existingMeal = await db.query.meals.findFirst({
            where: and(
                eq(meals.forUserId, forUserId),
                eq(meals.mealType, mealType),
                gte(meals.date, startOfDay),
                lt(meals.date, endOfDay)
            )
        });

        if (existingMeal) {
            return NextResponse.json({ success: false, message: `User has already taken ${mealType} today.` }, { status: 403 });
        }

        // Insert with onConflictDoNothing to handle race condition at DB level
        const result = await db.insert(meals).values({
            forUserId: forUserId,
            byUserId: byUser.id,
            mealType: mealType,
        }).onConflictDoNothing().returning();

        // If no row was inserted, it means there was a concurrent insert (race condition handled)
        if (result.length === 0) {
            return NextResponse.json({ success: false, message: `User has already taken ${mealType} today.` }, { status: 403 });
        }

        const foruser = await db.query.users.findFirst({
            where: eq(users.id, forUserId)
        });

        if (process.env.NODE_ENV !== 'production') {
            console.log("Meal verified for", foruser?.name);
        }

        return NextResponse.json({ success: true, message: "Meal verified successfully.", user: foruser });

    } catch (error: unknown) {
        console.error("Error verifying QR code:", error);

        if (error instanceof Error) {
            if (error.name === "JsonWebTokenError") {
                return NextResponse.json({ success: false, message: "Invalid QR code." }, { status: 401 });
            }
            if (error.name === "TokenExpiredError") {
                return NextResponse.json({ success: false, message: "QR code has expired." }, { status: 401 });
            }
            if (error.message === "Unauthorized") return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
            if (error.message === "Forbidden") return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
