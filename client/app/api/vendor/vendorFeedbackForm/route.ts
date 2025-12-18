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
        }).returning(); // Cast to any if there are extra fields in ratings object that we don't store in separate columns, wait schema has separate columns.

        // Actually schema has individual columns: hygiene, quantity etc.
        // The detailed breakdown is:
        /*
          hygiene: integer("hygiene").notNull(),
          quantity: integer("quantity").notNull(),
          timeliness: integer("timeliness").notNull(),
          variety: integer("variety").notNull(),
          staff: integer("staff").notNull(),
          overall: integer("overall").notNull(),
        */
        // I need to map `ratings` object to these columns.

        return NextResponse.json({ success: true, VendorFeedbackForm: newFeedback });

    } catch (err: any) {
        return NextResponse.json({ success: false, err: err.message }, { status: 400 });
    }
}
