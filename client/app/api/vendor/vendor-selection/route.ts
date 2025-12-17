import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import VendorSelection from '@/lib/models/vendorselectform.model';
import Vendor from '@/lib/models/vendor.model';
import { requireRole } from '@/lib/auth-helper';

export async function POST(req: Request) {
    try {
        const user = await requireRole(['student']);
        const { name, room, vendor } = await req.json();

        if (!vendor) {
            return NextResponse.json({ message: "Vendor is required" }, { status: 400 });
        }

        await connectDB();

        const vendorDoc = await Vendor.findById(vendor);
        if (!vendorDoc) {
            return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
        }

        const now = new Date();
        const forMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const existing = await VendorSelection.findOne({
            user: user._id,
            forMonth: forMonth
        });

        if (existing) {
            return NextResponse.json({ message: "You have already selected a mess for this month." }, { status: 400 });
        }

        const vendorSelection = await VendorSelection.create({
            name: name || user.name,
            roomNo: room,
            vendor: vendorDoc._id,
            user: user._id,
            forMonth: forMonth,
            dateofEntry: now,
            preference: 'vegetarian', // Default
            hostel: 'Neeladri Micro Campus' // Default or fetch from user? User model has hostel.
        });

        return NextResponse.json({ success: true, vendorSelection });

    } catch (error: any) {
        if (error.message === "Unauthorized") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        if (error.message === "Forbidden") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
