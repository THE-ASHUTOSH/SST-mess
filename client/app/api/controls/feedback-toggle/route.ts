import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Control from '@/lib/models/control.model';
import { requireRole } from '@/lib/auth-helper';

export async function GET() {
    try {
        await connectDB();
        const feedbackToggle = await Control.findOne({ name: 'feedbackToggle' });
        if (!feedbackToggle) {
            const newToggle = new Control({ name: 'feedbackToggle', enabled: false });
            await newToggle.save();
            return NextResponse.json({ enabled: newToggle.enabled });
        }
        return NextResponse.json({ enabled: feedbackToggle.enabled });
    } catch (error: any) {
        return NextResponse.json({ message: 'Error fetching feedback toggle', error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const user = await requireRole(['admin']);
        await connectDB();

        let feedbackToggle = await Control.findOne({ name: 'feedbackToggle' });

        if (feedbackToggle) {
            feedbackToggle.enabled = !feedbackToggle.enabled;
        } else {
            feedbackToggle = new Control({ name: 'feedbackToggle', enabled: true });
        }

        await feedbackToggle.save();
        console.log(`Feedback toggle set to ${feedbackToggle.enabled} by ${user.email}`);
        return NextResponse.json({ enabled: feedbackToggle.enabled });

    } catch (error: any) {
        if (error.message === "Unauthorized") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        if (error.message === "Forbidden") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        return NextResponse.json({ message: 'Error toggling feedback toggle', error: error.message }, { status: 500 });
    }
}
