import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import VendorSelection from '@/lib/models/vendorselectform.model';
import { getDbUser } from '@/lib/auth-helper';
import Vendor from '@/lib/models/vendor.model';

export async function GET() {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        // console.log("Fetching latest vendor selection for user:", user._id);

        const latestSelection = await VendorSelection.findOne({
            user: user._id,
            forMonth: {
                $gte: startOfMonth,
                $lte: endOfMonth,
            },
        }).sort({ createdAt: -1 }).populate({ path: 'vendor', model: Vendor });

        if (!latestSelection) {
            return NextResponse.json({ message: "No vendor selection found" }, { status: 404 });
        }

        return NextResponse.json({ latestSelection });

    } catch (error) {
        console.error('Error fetching latest vendor selection:', error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
