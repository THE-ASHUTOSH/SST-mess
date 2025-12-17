import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Meal from '@/lib/models/meal.model';
import { getDbUser } from '@/lib/auth-helper';

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

        const meal = await Meal.findOne({
            forUser: user._id,
            mealType,
            date: { $gte: startOfDay, $lt: endOfDay },
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
