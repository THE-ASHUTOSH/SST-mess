import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { db } from '@/lib/db';
import { menuDays, vendors } from '@/lib/db/schema';
import { getDbUser, requireRole } from '@/lib/auth-helper';
import { and, eq, inArray, isNull, lt } from 'drizzle-orm';
import {
    getISTDateKey,
    getISTMenuWindow,
    MENU_RETENTION_DAYS,
    MENU_WINDOW_DAYS,
} from '@/lib/utils/timezone';

/**
 * THE menu endpoint for a vendor. Everything menu-shaped lives here — this replaced two routes
 * (`menu-days` and `updateMenu`) that were both editing "the menu" from different angles.
 *
 *   GET   /api/vendor/menu?vendorId=<id>   the rolling window + the vendor's menu details
 *                                          (any signed-in user — students read this)
 *   PUT   /api/vendor/menu?vendorId=<id>   upsert ONE day          (admin / superAdmin)
 *   PATCH /api/vendor/menu?vendorId=<id>   set the menu link only  (admin / superAdmin)
 *
 * The window is DERIVED from IST "today", never stored: the response always contains exactly
 * MENU_WINDOW_DAYS entries, and a date with no row yet comes back empty and editable. That is what
 * makes the far end grow automatically as the near end falls off — nothing to pre-create.
 *
 * Vendor details (name, price, meals, add/delete) live in `/api/vendor/manageVendor`.
 * `vendors.email` is superAdmin-only and is never selected here, because students read this route.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const MEALS = ['breakfast', 'lunch', 'dinner'] as const;
type Meal = (typeof MEALS)[number];

// Bounds so one request cannot blow up a row or the payload (CONVENTIONS: validate + bound input).
const MAX_DISHES_PER_MEAL = 30;
const MAX_DISH_LENGTH = 160;
const MAX_MENU_URL_LENGTH = 2048;

const err = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });

/** Trim, drop blanks, dedupe, and bound a submitted dish list. `null` = rejected. */
function cleanDishes(value: unknown): string[] | null {
    if (value == null) return [];
    if (!Array.isArray(value)) return null;
    if (value.length > MAX_DISHES_PER_MEAL) return null;

    const out: string[] = [];
    const seen = new Set<string>();
    for (const raw of value) {
        if (typeof raw !== 'string') return null;
        const dish = raw.trim().replace(/\s+/g, ' ');
        if (!dish) continue;
        if (dish.length > MAX_DISH_LENGTH) return null;
        const key = dish.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(dish);
    }
    return out;
}

/**
 * Hard-delete days that have fallen out of retention. Cheap and indexed, and it only ever touches
 * rows the UI already stopped showing, so it cannot affect the current window.
 */
async function pruneOldDays(): Promise<void> {
    try {
        await db.delete(menuDays).where(lt(menuDays.date, getISTDateKey(-MENU_RETENTION_DAYS)));
    } catch (error) {
        // Never fail a menu request because housekeeping failed.
        console.error('menu: prune failed', error);
    }
}

/** The vendor, if it exists and is active. Never selects `email`. */
async function getActiveVendor(vendorId: string) {
    const [vendor] = await db
        .select({
            id: vendors.id,
            name: vendors.name,
            price: vendors.price,
            description: vendors.description,
            menuUrl: vendors.menuUrl,
            breakfast: vendors.breakfast,
            lunch: vendors.lunch,
            dinner: vendors.dinner,
        })
        .from(vendors)
        .where(and(eq(vendors.id, vendorId), isNull(vendors.deletedAt)))
        .limit(1);
    return vendor ?? null;
}

/** Shared by all three methods: validate the id and load the vendor, or return the error response. */
async function resolveVendor(req: NextRequest) {
    const vendorId = req.nextUrl.searchParams.get('vendorId');
    if (!vendorId || !UUID_RE.test(vendorId)) {
        return { error: err('A valid vendor id is required', 400) } as const;
    }
    const vendor = await getActiveVendor(vendorId);
    if (!vendor) return { error: err('Vendor not found', 404) } as const;
    return { vendorId, vendor } as const;
}

function mapError(error: unknown, fallback: string) {
    if (error instanceof Error) {
        if (error.message === 'Unauthorized') return err('Unauthorized', 401);
        if (error.message === 'Forbidden') return err('Forbidden', 403);
    }
    console.error(`${fallback}:`, error);
    return err(fallback, 500);
}

export async function GET(req: NextRequest) {
    try {
        // Identity only — students read menus. middleware.ts already requires a session.
        const user = await getDbUser();
        if (!user) return err('Unauthorized', 401);

        const resolved = await resolveVendor(req);
        if ('error' in resolved) return resolved.error;
        const { vendorId, vendor } = resolved;

        const window = getISTMenuWindow();
        const stored = await db
            .select({
                date: menuDays.date,
                breakfast: menuDays.breakfast,
                lunch: menuDays.lunch,
                dinner: menuDays.dinner,
                updatedAt: menuDays.updatedAt,
            })
            .from(menuDays)
            .where(and(eq(menuDays.vendorId, vendorId), inArray(menuDays.date, window)));

        const byDate = new Map(stored.map((d) => [d.date, d]));

        // Always MENU_WINDOW_DAYS entries, in order. A date with no row is an empty editable day —
        // this is where the new far date "appears" without anything having created it.
        const days = window.map((date) => {
            const row = byDate.get(date);
            return {
                date,
                breakfast: vendor.breakfast ? (row?.breakfast ?? []) : [],
                lunch: vendor.lunch ? (row?.lunch ?? []) : [],
                dinner: vendor.dinner ? (row?.dinner ?? []) : [],
                isSet: !!row,
                updatedAt: row?.updatedAt ?? null,
            };
        });

        return NextResponse.json({ success: true, vendor, windowDays: MENU_WINDOW_DAYS, days });
    } catch (error) {
        return mapError(error, 'Failed to load the menu');
    }
}

export async function PUT(req: NextRequest) {
    try {
        const actor = await requireRole(['admin']);

        const resolved = await resolveVendor(req);
        if ('error' in resolved) return resolved.error;
        const { vendorId, vendor } = resolved;

        const body = await req.json().catch(() => null);
        const date: unknown = body?.date;
        if (typeof date !== 'string' || !DATE_RE.test(date)) {
            return err('A valid date (YYYY-MM-DD) is required', 400);
        }

        // Only the current window is editable: the past is immutable history, and letting an admin
        // write months ahead would fill the table with days nobody can see.
        const window = getISTMenuWindow();
        if (!window.includes(date)) {
            return err(
                `That day is outside the editable window (${window[0]} to ${window[window.length - 1]}).`,
                400,
            );
        }

        // Meals the vendor does not serve are forced empty, so the stored menu can never contradict
        // the vendor's own breakfast/lunch/dinner flags.
        const values: Record<Meal, string[]> = { breakfast: [], lunch: [], dinner: [] };
        for (const meal of MEALS) {
            const cleaned = cleanDishes(body?.[meal]);
            if (cleaned === null) {
                return err(
                    `Invalid ${meal} list — up to ${MAX_DISHES_PER_MEAL} dishes, each under ${MAX_DISH_LENGTH} characters.`,
                    400,
                );
            }
            values[meal] = vendor[meal] ? cleaned : [];
        }

        const now = new Date();
        const [saved] = await db
            .insert(menuDays)
            .values({ vendorId, date, ...values, updatedAt: now })
            .onConflictDoUpdate({
                target: [menuDays.vendorId, menuDays.date],
                set: { ...values, updatedAt: now },
            })
            .returning({
                date: menuDays.date,
                breakfast: menuDays.breakfast,
                lunch: menuDays.lunch,
                dinner: menuDays.dinner,
                updatedAt: menuDays.updatedAt,
            });

        revalidateTag('vendors');
        // Opportunistic housekeeping on a write, not on every student read.
        await pruneOldDays();

        console.log(`Menu for ${vendor.name} on ${date} updated by ${actor.email}`);
        return NextResponse.json({ success: true, message: 'Menu saved.', day: { ...saved, isSet: true } });
    } catch (error) {
        return mapError(error, 'Failed to save the menu');
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const actor = await requireRole(['admin']);

        const resolved = await resolveVendor(req);
        if ('error' in resolved) return resolved.error;
        const { vendorId, vendor } = resolved;

        const body = await req.json().catch(() => null);
        const raw: unknown = body?.menuUrl;
        if (raw != null && typeof raw !== 'string') return err('menuUrl must be a string', 400);

        const menuUrl = typeof raw === 'string' ? raw.trim() : '';
        if (menuUrl.length > MAX_MENU_URL_LENGTH) return err('That menu link is too long.', 400);
        // Only http(s) — a link is opened in the student's browser, so never accept javascript:
        // or data: URLs here.
        if (menuUrl && !/^https?:\/\//i.test(menuUrl)) {
            return err('The menu link must start with http:// or https://', 400);
        }

        const [updated] = await db
            .update(vendors)
            .set({ menuUrl: menuUrl || null, updatedAt: new Date() })
            // Explicit columns: this route is admin-accessible, and the superAdmin-only login email
            // must never come back to a plain admin.
            .where(eq(vendors.id, vendorId))
            .returning({ id: vendors.id, name: vendors.name, menuUrl: vendors.menuUrl });

        revalidateTag('vendors');
        console.log(`Menu link for ${vendor.name} updated by ${actor.email}`);
        return NextResponse.json({ success: true, message: 'Menu link saved.', vendor: updated });
    } catch (error) {
        return mapError(error, 'Failed to save the menu link');
    }
}
