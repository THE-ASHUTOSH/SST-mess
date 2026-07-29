// Shared types, palettes, and helpers for the Analytics dashboard.
//
// The categorical palettes below were validated with the dataviz palette checker for BOTH light and
// dark surfaces (lightness band, chroma floor, CVD adjacent-pair separation, contrast). Meal types
// pass every check; preferences sit in the labelled CVD-floor band (deutan ΔE 7.8) — which is why
// every preference view ALSO ships direct labels + a legend + a table toggle, never colour alone.

export type MealType = "breakfast" | "lunch" | "dinner";
export type PrefKey = "vegetarian" | "nonVegetarian" | "eggetarian";

export interface VendorRef {
    id: string;
    name: string;
}
export interface OptInVendor {
    vendorId: string;
    vendorName: string;
    count: number;
    preferences: Record<PrefKey, number>;
}
export interface MealVendor {
    vendorId: string;
    vendorName: string;
    breakfast: number;
    lunch: number;
    dinner: number;
    total: number;
}
export interface DailyPoint {
    day: string; // YYYY-MM-DD
    breakfast: number;
    lunch: number;
    dinner: number;
    total: number;
}

export interface AnalyticsSummary {
    success: boolean;
    month: number;
    year: number;
    vendors: VendorRef[];
    totals: { optIns: number; optedInStudents: number; mealsServed: number; activeVendors: number };
    optInByVendor: OptInVendor[];
    preferenceTotals: Record<PrefKey, number>;
    mealsByVendor: MealVendor[];
    mealsByType: Record<MealType, number>;
    dailyTrend: DailyPoint[];
    mealTypes: MealType[];
}

// --- Validated categorical palettes (fixed order; assigned by entity, never cycled) ---
export const MEAL_META: { key: MealType; label: string; color: string }[] = [
    { key: "breakfast", label: "Breakfast", color: "#d97706" }, // amber-600
    { key: "lunch", label: "Lunch", color: "#0d9488" }, // teal-600
    { key: "dinner", label: "Dinner", color: "#6366f1" }, // indigo-500
];

export const PREF_META: { key: PrefKey; label: string; color: string }[] = [
    { key: "vegetarian", label: "Vegetarian", color: "#15803d" }, // green-700
    { key: "nonVegetarian", label: "Non-Vegetarian", color: "#e11d48" }, // rose-600
    { key: "eggetarian", label: "Eggetarian", color: "#d97706" }, // amber-600
];

// Single hue for magnitude-only charts (opt-ins by vendor — identity carried by the axis label).
export const SERIES_PRIMARY = "#6366f1";

export const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

// Compact integer formatting (en-IN grouping matches the rest of the app's locale usage).
export const fmt = (n: number | null | undefined) => (typeof n === "number" ? n.toLocaleString("en-IN") : "—");

export const emptyPrefs = (): Record<PrefKey, number> => ({ vegetarian: 0, nonVegetarian: 0, eggetarian: 0 });
