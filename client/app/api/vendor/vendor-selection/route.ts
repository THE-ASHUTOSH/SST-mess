import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vendorSelections, vendors } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import { eq, and } from 'drizzle-orm';

export async function POST(req: Request) {
    try {
        const user = await requireRole(['student']);
        const { name, room, vendor } = await req.json();

        if (!vendor) {
            return NextResponse.json({ message: "Vendor is required" }, { status: 400 });
        }

        const [vendorDoc] = await db.select().from(vendors).where(eq(vendors.id, Number(vendor)));
        if (!vendorDoc) {
            return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
        }

        const now = new Date();
        const forMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const existing = await db.query.vendorSelections.findFirst({
            where: and(
                eq(vendorSelections.userId, user.id),
                eq(vendorSelections.forMonth, forMonth)
            )
        });

        if (existing) {
            return NextResponse.json({ message: "You have already selected a mess for this month." }, { status: 400 });
        }

        const [vendorSelection] = await db.insert(vendorSelections).values({
            // name and roomNo are not in the schema currently? 
            // Checking schema... users table has name and hostel.
            // vendorSelections table has 'preference', 'hostel'.
            // The Mongoose model had 'roomNo' implicitly? No, checked model:
            /*
            user: ObjectId, vendor: ObjectId, preference: enum, hostel: enum, forMonth, dateofEntry
            */
            // Wait, the POST request body has `name`, `room`, `vendor`.
            // The mongoose create call had `name: name || user.name`, `roomNo: room`.
            // BUT `vendorSelectForm.model.ts` DID NOT define `name` or `roomNo` in the schema!
            // It only defined user, vendor, preference, hostel, forMonth, dateofEntry.
            // Mongoose ignores extra fields if strict is true (default).
            // So `name` and `room` were likely DROPPED in the old code too, unless schema had `strict: false`.
            // I'll ignore them here too or add them to schema if critical. 
            // Assuming they were ignored or I missed them in schema file.
            // Re-reading `vendorselectform.model.ts`:
            /*
            user, vendor, preference, hostel, forMonth, dateofEntry.
            */
            // Yes, name and room were NOT in the schema.

            userId: user.id,
            vendorId: vendorDoc.id,
            forMonth: forMonth,
            dateofEntry: now,
            preference: 'Vegetarian', // Default, should be capitalize 'Vegetarian' to match Enum
            hostel: 'Neeladri Micro Campus' // Default
        }).returning();

        return NextResponse.json({ success: true, vendorSelection });

    } catch (error: any) {
        if (error.message === "Unauthorized") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        if (error.message === "Forbidden") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
