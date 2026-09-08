/**
 * Timezone utilities for consistent IST (India Standard Time) handling
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30 in milliseconds

/**
 * Get current time in IST timezone
 */
export function getISTNow(): Date {
    const now = new Date();
    return new Date(now.getTime() + IST_OFFSET_MS + now.getTimezoneOffset() * 60 * 1000);
}

/**
 * Get the current hour in IST (0-23)
 */
export function getISTHour(): number {
    return getISTNow().getHours();
}

/**
 * Determine the current meal type based on IST time
 * Returns null if outside meal hours
 */
export function getCurrentMealType(): 'breakfast' | 'lunch' | 'dinner' | null {
    const hour = getISTHour();

    if (hour >= 7 && hour < 10) {
        return 'breakfast';
    } else if (hour >= 12 && hour < 15) {
        return 'lunch';
    } else if (hour >= 19 && hour < 22) {
        return 'dinner';
    }

    return null;
}

/**
 * Get start and end of today in IST (as Date objects)
 */
export function getISTDayBounds(): { startOfDay: Date; endOfDay: Date } {
    const istNow = getISTNow();
    const year = istNow.getFullYear();
    const month = istNow.getMonth();
    const day = istNow.getDate();

    // Start of day in IST
    const startOfDay = new Date(year, month, day);
    // End of day (start of next day) in IST
    const endOfDay = new Date(year, month, day + 1);

    return { startOfDay, endOfDay };
}

/**
 * Today in IST as a plain `YYYY-MM-DD` key, optionally offset by whole days.
 *
 * Menu days are stored as a Postgres `date` (no time), so the whole feature works in these string
 * keys — that is what keeps "today" the same day for a user in Kolkata and a server in Virginia.
 * Never derive a menu date from `new Date().toISOString()`: after 18:30 IST that is already
 * tomorrow's UTC date.
 */
export function getISTDateKey(offsetDays = 0): string {
    const ist = getISTNow();
    ist.setDate(ist.getDate() + offsetDays);
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** How many days of menu the admin may edit and students may see, counting today. */
export const MENU_WINDOW_DAYS = 15;

/** Past menu days are hard-deleted once older than this many days (a small grace buffer). */
export const MENU_RETENTION_DAYS = 2;

/**
 * The editable/visible window: today first, then the next MENU_WINDOW_DAYS - 1 days.
 *
 * The window is DERIVED, never stored — which is what makes it self-maintaining. Every read asks for
 * exactly these keys, so the moment IST rolls over, yesterday leaves the window and a brand-new far
 * date joins it. A date with no row yet is returned as an empty day and becomes a row on its first
 * save (upsert on `menu_days_vendor_date_uniq`), so there is nothing to pre-create and no scheduled
 * job needed to keep the count at MENU_WINDOW_DAYS.
 */
export function getISTMenuWindow(days = MENU_WINDOW_DAYS): string[] {
    return Array.from({ length: days }, (_, i) => getISTDateKey(i));
}

/**
 * Get start of current month in IST
 */
export function getISTMonthStart(): Date {
    const istNow = getISTNow();
    return new Date(istNow.getFullYear(), istNow.getMonth(), 1);
}

/**
 * Get end of current month in IST
 */
export function getISTMonthEnd(): Date {
    const istNow = getISTNow();
    return new Date(istNow.getFullYear(), istNow.getMonth() + 1, 0);
}
