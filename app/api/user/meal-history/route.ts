import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { vendorSelections } from '@/lib/db/schema';
// NOTE: the per-meal-type breakdown is temporarily disabled to reduce DB load — only opted-in
// months are returned. To restore it, re-import `meals` and uncomment the meals query +
// aggregation + response counts below (and the meals UI on the Meal History page).
import { getDbUser } from '@/lib/auth-helper';
import { eq } from 'drizzle-orm';

/**
 * Per-month opt-in history for the CURRENTLY LOGGED-IN user (self-scoped — the user id comes
 * from the session, never from the client). Returns, newest first, every month the user opted
 * in (has a vendorSelection). The per-meal-type breakdown is temporarily disabled to reduce DB
 * load (see the commented meals query). Months are bucketed by UTC.
 *
 * The result is cached PER USER for 10 days via unstable_cache. The user id is resolved from the
 * session OUTSIDE the cached function and passed in as a cache-key part, so each user gets their
 * own entry. All entries share the `meal-history` tag, so uploading vendor selections (which
 * changes opt-ins) calls revalidateTag('meal-history') to refresh everyone at once.
 *
 *   GET /api/user/meal-history
 */

const TEN_DAYS_SECONDS = 60 * 60 * 24 * 10;

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

// Cached (per user, 1 day) aggregation. MUST NOT read the session/cookies — the caller passes
// the already-resolved userId so it can be part of the cache key.
function getCachedMealHistory(userId: string) {
    return unstable_cache(
        async () => {
            const selections = await db.query.vendorSelections.findMany({
                where: eq(vendorSelections.userId, userId),
                columns: { forMonth: true },
                with: { vendor: { columns: { name: true } } },
            });

            // Meals breakdown temporarily disabled — one query instead of two.
            // const userMeals = await db.select({ mealType: meals.mealType, date: meals.date })
            //     .from(meals)
            //     .where(eq(meals.forUserId, userId));

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

            for (const selection of selections) {
                if (!selection.forMonth) continue;
                const bucket = bucketFor(new Date(selection.forMonth));
                bucket.optedIn = true;
                bucket.vendorName = selection.vendor?.name ?? bucket.vendorName;
            }

            // Meals breakdown temporarily disabled.
            // for (const meal of userMeals) {
            //     const bucket = bucketFor(new Date(meal.date));
            //     if (meal.mealType === 'breakfast') bucket.breakfast += 1;
            //     else if (meal.mealType === 'lunch') bucket.lunch += 1;
            //     else if (meal.mealType === 'dinner') bucket.dinner += 1;
            // }

            return Array.from(buckets.entries())
                .map(([key, b]) => ({
                    key,
                    label: `${MONTH_NAMES[b.month]} ${b.year}`,
                    optedIn: b.optedIn,
                    vendorName: b.vendorName,
                    // Meals breakdown disabled — re-add with the meals query above.
                    // counts: { breakfast: b.breakfast, lunch: b.lunch, dinner: b.dinner },
                    // total: b.breakfast + b.lunch + b.dinner,
                }))
                // newest month first (keys are zero-padded YYYY-MM so string compare works)
                .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
        },
        ['meal-history', userId], // cache key parts (per user)
        { tags: ['meal-history', `meal-history:${userId}`], revalidate: TEN_DAYS_SECONDS },
    )();
}

export async function GET() {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const months = await getCachedMealHistory(user.id);
        return NextResponse.json({ success: true, months });
    } catch (error: unknown) {
        // Log full detail server-side; return a generic message so internals aren't disclosed.
        console.error('Failed to load meal history:', error);
        return NextResponse.json({ success: false, message: 'Failed to load meal history' }, { status: 500 });
    }
}
