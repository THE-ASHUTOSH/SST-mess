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
