export interface StudentRow {
    id: string;
    name: string;
    email: string;
    roll: string | null;
    batch: string | null;
    hostel: string | null;
    picture: string | null;
    optedIn: boolean;
    vendorId: string | null;
    vendorName: string | null;
    preference: string | null;
}

export interface VendorOption {
    id: string;
    name: string;
}

export interface FilterOptions {
    vendors: VendorOption[];
    batches: string[];
    hostels: string[];
    preferences: string[];
}

// Validated meal-type colours (shared look with the Analytics dashboard).
export const MEAL_COLORS: { key: "breakfast" | "lunch" | "dinner"; label: string; color: string }[] = [
    { key: "breakfast", label: "Breakfast", color: "#d97706" },
    { key: "lunch", label: "Lunch", color: "#0d9488" },
    { key: "dinner", label: "Dinner", color: "#6366f1" },
];
