import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vendorFeedbacks } from '@/lib/db/schema';
import { getDbUser } from '@/lib/auth-helper';

export async function POST(req: Request) {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { ratings, vendor, feedback } = body;

        const [newFeedback] = await db.insert(vendorFeedbacks).values({
            hygiene: ratings.hygiene,
            quantity: ratings.quantity,
            timeliness: ratings.timeliness,
            variety: ratings.variety,
            staff: ratings.staff,
            overall: ratings.overall,
            vendorId: vendor, // Assuming vendor is passed as ID
            userId: user.id,
            feedback,
        }).returning(); 

        return NextResponse.json({ success: true, VendorFeedbackForm: newFeedback });

    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
        return NextResponse.json({ success: false, err: errorMessage }, { status: 400 });
    }
}
