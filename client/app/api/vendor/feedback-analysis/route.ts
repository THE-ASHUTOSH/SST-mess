import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Vendor from '@/lib/models/vendor.model';
import VendorFeedback from '@/lib/models/vendorfeedbackform.model';
import { requireRole } from '@/lib/auth-helper';

export async function GET() {
    try {
        await requireRole(['admin']);
        await connectDB();

        const vendors = await Vendor.find().lean();
        const feedback = await VendorFeedback.find().populate({ path: "vendor", model: Vendor }).lean();

        const data = feedback.map((feed: any) => {
            if (!feed.vendor) {
                return { ...feed, vendor: null };
            }

            const vendor = vendors.find(
                (v: any) => v._id.toString() === feed.vendor._id.toString()
            );

            return { ...feed, vendor };
        });

        return NextResponse.json({ success: true, data });
    } catch (err: any) {
        if (err.message === "Unauthorized") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        if (err.message === "Forbidden") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        return NextResponse.json({ success: false, err: err.message }, { status: 400 });
    }
}
