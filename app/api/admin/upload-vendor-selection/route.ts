import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, vendors, vendorSelections, hostels, preferenceEnum, hostelEnum } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import * as xlsx from 'xlsx';
import { eq } from 'drizzle-orm';

type Preference = (typeof preferenceEnum.enumValues)[number];
type Hostel = (typeof hostelEnum.enumValues)[number];

interface VendorSelectionRow {
    'Email Address': string;
    'Choose your preference': string; // This is vendor name
    'Meal Option': Preference;
    'Hostel': Hostel;
    'Batch': string;
    'Name': string;
}

interface Issue {
    row: Partial<VendorSelectionRow>;
    error: string;
}

interface SelectionInfo {
    email: string;
    vendorName: string;
}

export async function POST(req: Request) {
    try {
        const adminUser = await requireRole(['admin']);
        console.log("Menu Upload triggered by user:", adminUser.email);

        const formData = await req.formData();
        const month = formData.get('month') as string;
        const file = formData.get('vendor-selection') as File | null;

        if (!file) {
            return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
        }

        if (!month) {
            return NextResponse.json({ message: "Month not specified" }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const workbook = xlsx.read(buffer, { type: 'buffer' });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data: VendorSelectionRow[] = xlsx.utils.sheet_to_json<VendorSelectionRow>(sheet);

        const issues: Issue[] = [];

        // Fetch all vendors to map name -> vendor
        const allVendors = await db.select().from(vendors);
        const vendorsMap = new Map(allVendors.map(vendor => [vendor.name, vendor]));

        // Map hostel name -> record (case-insensitive + trimmed) for FK resolution.
        const allHostels = await db.select().from(hostels);
        if (allHostels.length === 0) {
            return NextResponse.json({
                message: "Hostels table is empty. Seed it first (run scripts/migrate-hostels.ts) before uploading vendor selections.",
            }, { status: 503 });
        }
        const hostelsMap = new Map(allHostels.map(h => [h.name.trim().toLowerCase(), h]));
        const hostelEnumValues = hostelEnum.enumValues as readonly string[];

        const forMonthDate = new Date(month);

        
        const existingSelections = await db.query.vendorSelections.findMany({
            where: eq(vendorSelections.forMonth, forMonthDate),
            with: {
                user: true
            }
        });

        
        const existingUserIds = new Set(existingSelections.map(sel => sel.userId));

        const duplicates: SelectionInfo[] = [];
        const newEntries: SelectionInfo[] = [];

        for (const row of data) {
            try {
                // Access using bracket notation for keys with spaces
                const email = row['Email Address'];
                const vendorNameString = row['Choose your preference'];
                const preference = row['Meal Option'];
                const hostel = row['Hostel'];
                const batch = row['Batch'];
                const name = row['Name'];

                if (!email || !vendorNameString || !preference || !hostel || !batch) {
                    issues.push({ row, error: 'Missing required fields' });
                    continue;
                }

                const emailLower = email.toLowerCase();
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(emailLower)) {
                    issues.push({ row, error: `Invalid email format: '${email}'` });
                    continue;
                }

                // Resolve the hostel against the hostels table (the FK source of truth).
                const hostelRecord = hostelsMap.get(String(hostel).trim().toLowerCase());
                if (!hostelRecord) {
                    issues.push({ row, error: `Unknown hostel: '${hostel}'. Add it to the hostels table or fix the spreadsheet.` });
                    continue;
                }
                // Keep the legacy enum column in sync only while the name is still a valid enum value.
                const hostelEnumValue = hostelEnumValues.includes(hostelRecord.name)
                    ? (hostelRecord.name as Hostel)
                    : undefined;

                // Check if user exists
                let [user] = await db.select().from(users).where(eq(users.email, emailLower)).limit(1);

                if (user && (user.hostelId !== hostelRecord.id || !user.batch || user.batch !== batch)) {
                    // Update user info (dual-write: legacy text column + new FK)
                    [user] = await db.update(users)
                        .set({ hostel: hostelRecord.name, hostelId: hostelRecord.id, batch })
                        .where(eq(users.id, user.id))
                        .returning();
                    console.log(`Updated user ${emailLower} with hostel and batch info`);
                }

                if (!user) {
                    // Create new user
                    [user] = await db.insert(users).values({
                        email: emailLower,
                        name: name || emailLower.split('@')[0],
                        batch: batch,
                        hostel: hostelRecord.name,
                        hostelId: hostelRecord.id,
                        role: 'student'
                    }).returning();
                    console.log(`Created new user with email ${emailLower}`);
                }

                if (existingUserIds.has(user.id)) {
                    duplicates.push({ email: emailLower, vendorName: vendorNameString });
                    continue;
                }

                const vendor = vendorsMap.get(vendorNameString);
                if (!vendor) {
                    console.log(`Vendor with name ${vendorNameString} not found`);
                    issues.push({ row, error: `Vendor with name '${vendorNameString}' not found` });
                    continue;
                }

                // Create selection (dual-write: legacy enum column when valid + new FK)
                await db.insert(vendorSelections).values({
                    userId: user.id,
                    vendorId: vendor.id,
                    preference,
                    forMonth: forMonthDate,
                    dateofEntry: new Date(),
                    hostel: hostelEnumValue,
                    hostelId: hostelRecord.id,
                });
                console.log(`Created vendor selection for user ${emailLower} with vendor ${vendorNameString}`);
                newEntries.push({ email: emailLower, vendorName: vendorNameString });
                existingUserIds.add(user.id);

            } catch (error: unknown) {
                console.error('Error processing row:', row, error);
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
                issues.push({ row, error: errorMessage });
            }
        }

        console.log(duplicates.length + " duplicates found.");
        console.log(issues.length + " issues found.");
        console.log(newEntries.length + " new entries added.");

        return NextResponse.json({
            message: "Vendor selection upload processed.",
            newEntries: newEntries.length,
            duplicates: duplicates.length,
            issues,
        });

    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === "Unauthorized") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
            if (error.message === "Forbidden") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
            return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
        }
        return NextResponse.json({ message: "An unknown internal server error occurred" }, { status: 500 });
    }
}
