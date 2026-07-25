import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, meals, vendorSelections } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import { eq } from 'drizzle-orm';
import { isUuid } from '@/lib/vendor-selection-upload';

/**
 * Per-month meal summary for ONE student, for the superAdmin "view meals" panel. Unlike the
 * student self-view (meals disabled to save load), this loads a single student's meals on demand,
 * so it includes the breakfast/lunch/dinner breakdown alongside the opted-in vendor. superAdmin ONLY.
 * Not cached — a superAdmin auditing meals wants fresh counts. Months are bucketed in UTC.
 *
 *   GET /api/admin/students/meals?userId=<id>
 */

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

interface MonthBucket {
    year: number;
    month: number; // 0-indexed
    optedIn: boolean;
    vendorName: string | null;
    breakfast: number;
    lunch: number;
    dinner: number;
}

export async function GET(req: NextRequest) {
    try {
        await requireRole(['superAdmin']);

        const userId = req.nextUrl.searchParams.get('userId') ?? '';
        if (!isUuid(userId)) return NextResponse.json({ success: false, message: 'A valid student id is required.' }, { status: 400 });

        const [student] = await db
            .select({ id: users.id, name: users.name, email: users.email, roll: users.roll })
            .from(users)
            .where(eq(users.id, userId));
        if (!student) return NextResponse.json({ success: false, message: 'Student not found.' }, { status: 404 });

        const [selections, userMeals] = await Promise.all([
            db.query.vendorSelections.findMany({
                where: eq(vendorSelections.userId, userId),
                columns: { forMonth: true },
                with: { vendor: { columns: { name: true } } }, // name only — never vendors.email
            }),
            db.select({ mealType: meals.mealType, date: meals.date }).from(meals).where(eq(meals.forUserId, userId)),
        ]);

        const buckets = new Map<string, MonthBucket>();
        const keyOf = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        const bucketFor = (d: Date): MonthBucket => {
            const key = keyOf(d);
            let bucket = buckets.get(key);
            if (!bucket) {
                bucket = { year: d.getUTCFullYear(), month: d.getUTCMonth(), optedIn: false, vendorName: null, breakfast: 0, lunch: 0, dinner: 0 };
                buckets.set(key, bucket);
            }
            return bucket;
        };

        for (const s of selections) {
            if (!s.forMonth) continue;
            const b = bucketFor(new Date(s.forMonth));
            b.optedIn = true;
            b.vendorName = s.vendor?.name ?? b.vendorName;
        }
        for (const m of userMeals) {
            if (!m.date) continue;
            const b = bucketFor(new Date(m.date));
            if (m.mealType === 'breakfast') b.breakfast += 1;
            else if (m.mealType === 'lunch') b.lunch += 1;
            else if (m.mealType === 'dinner') b.dinner += 1;
        }

        const months = Array.from(buckets.entries())
            .map(([key, b]) => ({
                key,
                label: `${MONTH_NAMES[b.month]} ${b.year}`,
                optedIn: b.optedIn,
                vendorName: b.vendorName,
                breakfast: b.breakfast,
                lunch: b.lunch,
                dinner: b.dinner,
                total: b.breakfast + b.lunch + b.dinner,
            }))
            .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0)); // newest first

        return NextResponse.json({ success: true, student, months });
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            if (error.message === 'Forbidden') return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }
        console.error('Failed to load student meals:', error);
        return NextResponse.json({ success: false, message: 'Failed to load meal details.' }, { status: 500 });
    }
}
