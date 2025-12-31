import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vendorFeedbacks, vendors } from '@/lib/db/schema';
import { getDbUser } from '@/lib/auth-helper';
import { eq } from 'drizzle-orm';

// Validate rating value is integer between 1-5
function validateRating(value: unknown, fieldName: string): number {
    const num = Number(value);
    if (!Number.isInteger(num) || num < 1 || num > 5) {
        throw new Error(`${fieldName} must be an integer between 1 and 5`);
    }
    return num;
}

export async function POST(req: Request) {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { ratings, vendor, feedback } = body;

        // Validate required fields
        if (!ratings || typeof ratings !== 'object') {
            return NextResponse.json({ success: false, message: "Ratings are required" }, { status: 400 });
        }

        if (!vendor || typeof vendor !== 'string') {
            return NextResponse.json({ success: false, message: "Vendor ID is required" }, { status: 400 });
        }

        // Validate vendor exists
        const vendorExists = await db.query.vendors.findFirst({
            where: eq(vendors.id, vendor)
        });
        if (!vendorExists) {
            return NextResponse.json({ success: false, message: "Invalid vendor ID" }, { status: 400 });
        }

        // Validate all rating fields
        let validatedRatings;
        try {
            validatedRatings = {
                hygiene: validateRating(ratings.hygiene, 'Hygiene'),
                quantity: validateRating(ratings.quantity, 'Quantity'),
                timeliness: validateRating(ratings.timeliness, 'Timeliness'),
                variety: validateRating(ratings.variety, 'Variety'),
                staff: validateRating(ratings.staff, 'Staff'),
                overall: validateRating(ratings.overall, 'Overall'),
            };
        } catch (validationError) {
            const message = validationError instanceof Error ? validationError.message : "Invalid rating values";
            return NextResponse.json({ success: false, message }, { status: 400 });
        }

        const [newFeedback] = await db.insert(vendorFeedbacks).values({
            ...validatedRatings,
            vendorId: vendor,
            userId: user.id,
            feedback: typeof feedback === 'string' ? feedback : null,
        }).returning();

        return NextResponse.json({ success: true, VendorFeedbackForm: newFeedback });

    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
        return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
    }
}
