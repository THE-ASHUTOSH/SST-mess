import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import VendorFeedback from '@/lib/models/vendorfeedbackform.model';
import { getDbUser } from '@/lib/auth-helper';

export async function POST(req: Request) {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { ratings, vendor, feedback } = body;

        await connectDB();

        const newFeedback = new VendorFeedback({
            ratings,
            vendor,
            feedback,
            user: user._id,
        });

        await newFeedback.save();
        return NextResponse.json({ success: true, VendorFeedbackForm: newFeedback });

    } catch (err: any) {
        return NextResponse.json({ success: false, err: err.message }, { status: 400 });
    }
}
