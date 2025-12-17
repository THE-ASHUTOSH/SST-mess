import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import VendorSelection from '@/lib/models/vendorselectform.model';
import { requireRole } from '@/lib/auth-helper';
import Vendor from '@/lib/models/vendor.model'; // Register model

export async function POST(req: Request) {
    try {
        await requireRole(['vendor', 'admin']);

        const body = await req.json();
        let { month, year } = body;

        await connectDB();

        if (month === undefined || year === undefined) {
            const today = new Date();
            month = today.getMonth() + 1; // 1-indexed
            year = today.getFullYear();
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);

        const section = await VendorSelection.find({
            forMonth: {
                $gte: startDate,
                $lt: endDate,
            },
        }).populate({ path: "vendor", model: Vendor }).lean();

        return NextResponse.json({ success: true, data: section });
    } catch (err: any) {
        if (err.message === "Unauthorized") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        if (err.message === "Forbidden") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        return NextResponse.json({ success: false, err: err.message }, { status: 400 });
    }
}
