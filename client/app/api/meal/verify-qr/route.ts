import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Meal from '@/lib/models/meal.model';
import User from '@/lib/models/user.model';
import { requireRole } from '@/lib/auth-helper';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
    try {
        // Enforce vendor role
        // Original logic: requireVendor allowed 'vendor' and 'admin'
        const byUser = await requireRole(['vendor', 'admin']);

        const body = await req.json();
        const { token, vendorId } = body;

        if (!vendorId) {
            return NextResponse.json({ message: "Vendor ID is required" }, { status: 400 });
        }

        await connectDB();

        // Verify token from QR
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET_KEY || 'default_secret');
        const forUserId = decoded.userId;
        const userVendorId = decoded.vendorId;

        const isVendorAuthorized = Array.isArray(vendorId)
            ? vendorId.includes(userVendorId.toString())
            : userVendorId.toString() === vendorId.toString();

        console.log("info", vendorId, userVendorId, isVendorAuthorized);

        if (!isVendorAuthorized) {
            return NextResponse.json({ message: "This student is not assigned to your vendor." }, { status: 403 });
        }

        const nowtime = new Date();
        const istTime = new Date(nowtime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const indianHours = istTime.getHours();

        let mealType;
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

        const existingMeal = await Meal.findOne({
            forUser: forUserId,
            mealType,
            date: { $gte: startOfDay, $lt: endOfDay },
        });

        if (existingMeal) {
            return NextResponse.json({ message: `User has already taken ${mealType} today.` }, { status: 403 });
        }

        const meal = new Meal({
            forUser: forUserId,
            byUser: byUser._id,
            mealType,
        });

        await meal.save();

        const foruser = await User.findById(forUserId);
        console.log("meal verified for", foruser?.name);

        return NextResponse.json({ message: "Meal verified successfully.", user: foruser });

    } catch (error: any) {
        console.error("Error verifying QR code:", error);
        if (error.name === "JsonWebTokenError") {
            return NextResponse.json({ message: "Invalid QR code." }, { status: 401 });
        }
        if (error.name === "TokenExpiredError") {
            return NextResponse.json({ message: "QR code has expired." }, { status: 401 });
        }
        // Handle auth helper error
        if (error.message === "Unauthorized") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        if (error.message === "Forbidden") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
