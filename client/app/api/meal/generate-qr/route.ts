import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Meal from '@/lib/models/meal.model';
import VendorSelection from '@/lib/models/vendorselectform.model';
import { getDbUser } from '@/lib/auth-helper';
import jwt from 'jsonwebtoken';
import Vendor from '@/lib/models/vendor.model';

export async function GET() {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const nowtime = new Date();
        const istTime = new Date(nowtime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const indianHours = istTime.getHours();
        const year = nowtime.getFullYear();
        const month = nowtime.getMonth();

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

        // Fix logic for month range query
        const selection = await VendorSelection.findOne({
            user: user._id,
            forMonth: { $gte: new Date(year, month, 1), $lt: new Date(year, month + 1, 1) },
        });

        if (!selection) {
            return NextResponse.json({ message: "Mess not opted in for this month." }, { status: 403 });
        }

        await selection.populate({ path: "vendor", model: Vendor });
        if (selection.vendor.mealsOptions && !selection.vendor.mealsOptions[mealType] == true) {
            return NextResponse.json({ message: `Vendor does not offer ${mealType}.` }, { status: 403 });
        }

        const startOfDay = new Date(year, month, nowtime.getDate());
        const endOfDay = new Date(year, month, nowtime.getDate() + 1);

        const currentMeal = await Meal.findOne({
            forUser: user._id,
            mealType,
            date: { $gte: startOfDay, $lt: endOfDay },
        });

        if (currentMeal) {
            return NextResponse.json({ message: "You have already scanned for this meal." }, { status: 403 });
        }

        const token = jwt.sign(
            { userId: user._id, vendorId: selection.vendor._id },
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
