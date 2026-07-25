import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { meals, vendors, vendorSelections } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import { and, asc, eq, gte, isNull, lt, sql } from 'drizzle-orm';

/**
 * Combined analytics summary for the admin dashboard — one call returns both DEMAND (monthly
 * opt-ins / vendor popularity / preference split) and CONSUMPTION (meals served, by vendor, by
 * meal type, and a daily trend) for a given month. All aggregation happens in SQL. superAdmin ONLY.
 *
 * IMPORTANT: only vendor id + name are ever selected — `vendors.email` must never reach a client.
 * Vendor / meal-type / preference filtering is done CLIENT-SIDE from these breakdowns so the UI
 * filters are instant; the server just does the heavy monthly aggregation once.
 *
 *   POST /api/admin/analytics/summary   (JSON: { month: 1-12, year })
 */

type MealType = 'breakfast' | 'lunch' | 'dinner';
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];

// Map the preference enum to stable object keys for the client.
const PREF_KEY: Record<string, 'vegetarian' | 'nonVegetarian' | 'eggetarian'> = {
    Vegetarian: 'vegetarian',
    'Non-Vegetarian': 'nonVegetarian',
    Eggetarian: 'eggetarian',
};

const zeroPrefs = () => ({ vegetarian: 0, nonVegetarian: 0, eggetarian: 0 });
const zeroMeals = () => ({ breakfast: 0, lunch: 0, dinner: 0, total: 0 });

export async function POST(req: Request) {
    try {
        await requireRole(['superAdmin']);

        const body = await req.json().catch(() => ({}));
        const month = Math.max(1, Math.min(12, parseInt(body?.month)));
        const year = parseInt(body?.year);
        if (isNaN(month) || isNaN(year) || year < 2020 || year > 2100) {
            return NextResponse.json({ success: false, message: 'A valid month (1-12) and year are required.' }, { status: 400 });
        }

        // UTC month boundaries (opt-in months + served meals are bucketed in UTC).
        const start = new Date(Date.UTC(year, month - 1, 1));
        const next = new Date(Date.UTC(year, month, 1));

        // --- Reference: active vendors (id + name only, ordered) for filter options + colour mapping ---
        const activeVendors = await db
            .select({ id: vendors.id, name: vendors.name })
            .from(vendors)
            .where(isNull(vendors.deletedAt))
            .orderBy(asc(vendors.name));

        // --- DEMAND: opt-ins for the month, grouped by vendor + preference ---
        const optInRows = await db
            .select({
                vendorId: vendorSelections.vendorId,
                vendorName: vendors.name,
                preference: vendorSelections.preference,
                count: sql<number>`count(*)::int`,
            })
            .from(vendorSelections)
            .innerJoin(vendors, eq(vendors.id, vendorSelections.vendorId))
            .where(and(gte(vendorSelections.forMonth, start), lt(vendorSelections.forMonth, next)))
            .groupBy(vendorSelections.vendorId, vendors.name, vendorSelections.preference);

        // --- CONSUMPTION: served meals attributed to the vendor the eater opted into that month ---
        const mealRows = await db
            .select({
                vendorId: vendorSelections.vendorId,
                vendorName: vendors.name,
                mealType: meals.mealType,
                count: sql<number>`count(*)::int`,
            })
            .from(meals)
            .innerJoin(
                vendorSelections,
                and(
                    eq(vendorSelections.userId, meals.forUserId),
                    gte(vendorSelections.forMonth, start),
                    lt(vendorSelections.forMonth, next),
                ),
            )
            .innerJoin(vendors, eq(vendors.id, vendorSelections.vendorId))
            .where(and(gte(meals.date, start), lt(meals.date, next)))
            .groupBy(vendorSelections.vendorId, vendors.name, meals.mealType);

        // --- CONSUMPTION: daily served-meals trend (all meals in the month), grouped by day + type ---
        const dayExpr = sql<string>`to_char(${meals.date}, 'YYYY-MM-DD')`;
        const dailyRows = await db
            .select({ day: dayExpr, mealType: meals.mealType, count: sql<number>`count(*)::int` })
            .from(meals)
            .where(and(gte(meals.date, start), lt(meals.date, next)))
            .groupBy(dayExpr, meals.mealType)
            .orderBy(asc(dayExpr));

        // --- Totals ---
        const [{ totalMealsServed }] = await db
            .select({ totalMealsServed: sql<number>`count(*)::int` })
            .from(meals)
            .where(and(gte(meals.date, start), lt(meals.date, next)));
        const [{ optedInStudents }] = await db
            .select({ optedInStudents: sql<number>`count(distinct ${vendorSelections.userId})::int` })
            .from(vendorSelections)
            .where(and(gte(vendorSelections.forMonth, start), lt(vendorSelections.forMonth, next)));

        // ---- Pivot into a client-friendly shape ----
        const vendorName = new Map(activeVendors.map((v) => [v.id, v.name]));

        // Opt-ins by vendor (+ per-preference) and overall preference totals.
        const optInByVendor = new Map<string, { vendorId: string; vendorName: string; count: number; preferences: ReturnType<typeof zeroPrefs> }>();
        const preferenceTotals = zeroPrefs();
        let totalOptIns = 0;
        for (const r of optInRows) {
            const entry = optInByVendor.get(r.vendorId) ?? {
                vendorId: r.vendorId,
                vendorName: r.vendorName ?? vendorName.get(r.vendorId) ?? 'Unknown',
                count: 0,
                preferences: zeroPrefs(),
            };
            entry.count += r.count;
            const pk = PREF_KEY[r.preference ?? 'Vegetarian'];
            if (pk) {
                entry.preferences[pk] += r.count;
                preferenceTotals[pk] += r.count;
            }
            totalOptIns += r.count;
            optInByVendor.set(r.vendorId, entry);
        }

        // Meals by vendor (+ per meal type) and overall by-type totals (attributed).
        const mealsByVendor = new Map<string, { vendorId: string; vendorName: string } & ReturnType<typeof zeroMeals>>();
        const mealsByType = zeroMeals();
        for (const r of mealRows) {
            const entry = mealsByVendor.get(r.vendorId) ?? {
                vendorId: r.vendorId,
                vendorName: r.vendorName ?? vendorName.get(r.vendorId) ?? 'Unknown',
                ...zeroMeals(),
            };
            const mt = r.mealType as MealType;
            entry[mt] += r.count;
            entry.total += r.count;
            mealsByType[mt] += r.count;
            mealsByType.total += r.count;
            mealsByVendor.set(r.vendorId, entry);
        }

        // Daily trend, one row per day with meal-type breakdown.
        const dailyByDay = new Map<string, { day: string } & ReturnType<typeof zeroMeals>>();
        for (const r of dailyRows) {
            const entry = dailyByDay.get(r.day) ?? { day: r.day, ...zeroMeals() };
            const mt = r.mealType as MealType;
            entry[mt] += r.count;
            entry.total += r.count;
            dailyByDay.set(r.day, entry);
        }

        return NextResponse.json({
            success: true,
            month,
            year,
            vendors: activeVendors,
            totals: {
                optIns: totalOptIns,
                optedInStudents: Number(optedInStudents) || 0,
                mealsServed: Number(totalMealsServed) || 0,
                activeVendors: activeVendors.length,
            },
            optInByVendor: Array.from(optInByVendor.values()).sort((a, b) => b.count - a.count),
            preferenceTotals,
            mealsByVendor: Array.from(mealsByVendor.values()).sort((a, b) => b.total - a.total),
            mealsByType: { breakfast: mealsByType.breakfast, lunch: mealsByType.lunch, dinner: mealsByType.dinner },
            dailyTrend: Array.from(dailyByDay.values()).sort((a, b) => (a.day < b.day ? -1 : 1)),
            mealTypes: MEAL_TYPES,
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            if (error.message === 'Forbidden') return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }
        console.error('Failed to build analytics summary:', error);
        return NextResponse.json({ success: false, message: 'Failed to load analytics.' }, { status: 500 });
    }
}
