import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, vendors, vendorSelections, preferenceEnum, hostelEnum } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import * as xlsx from 'xlsx';
import { eq, inArray } from 'drizzle-orm';

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
        if (process.env.NODE_ENV !== 'production') {
            console.log("Menu Upload triggered by user:", adminUser.email);
        }

        const formData = await req.formData();
        const month = formData.get('month') as string;
        const file = formData.get('vendor-selection') as File | null;

        if (!file) {
            return NextResponse.json({ success: false, message: "No file uploaded" }, { status: 400 });
        }

        if (!month) {
            return NextResponse.json({ success: false, message: "Month not specified" }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const workbook = xlsx.read(buffer, { type: 'buffer' });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data: VendorSelectionRow[] = xlsx.utils.sheet_to_json<VendorSelectionRow>(sheet);

        if (data.length === 0) {
            return NextResponse.json({ success: false, message: "No data found in file" }, { status: 400 });
        }

        const issues: Issue[] = [];
        const duplicates: SelectionInfo[] = [];
        const newEntries: SelectionInfo[] = [];

        // Fetch all vendors to map name -> vendor
        const allVendors = await db.select().from(vendors);
        const vendorsMap = new Map(allVendors.map(vendor => [vendor.name, vendor]));

        const forMonthDate = new Date(month);

        // Fetch existing selections for this month
        const existingSelections = await db.query.vendorSelections.findMany({
            where: eq(vendorSelections.forMonth, forMonthDate),
        });
        const existingUserIds = new Set(existingSelections.map(sel => sel.userId));

        // OPTIMIZATION: Batch fetch all users by email to avoid N+1 queries
        const allEmails = data
            .map(row => row['Email Address']?.toLowerCase())
            .filter((email): email is string => Boolean(email));

        const existingUsers = allEmails.length > 0
            ? await db.select().from(users).where(inArray(users.email, allEmails))
            : [];
        const userMap = new Map(existingUsers.map(u => [u.email, u]));

        // Use transaction for atomicity
        await db.transaction(async (tx) => {
            for (const row of data) {
                try {
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

                    // Check if user exists in our pre-fetched map
                    let user = userMap.get(emailLower);

                    if (user && (!user.hostel || user.hostel !== hostel || !user.batch || user.batch !== batch)) {
                        // Update user info
                        const [updatedUser] = await tx.update(users)
                            .set({ hostel, batch })
                            .where(eq(users.id, user.id))
                            .returning();
                        user = updatedUser;
                        userMap.set(emailLower, updatedUser);
                    }

                    if (!user) {
                        // Create new user
                        const [newUser] = await tx.insert(users).values({
                            email: emailLower,
                            name: name || emailLower.split('@')[0],
                            batch: batch,
                            hostel: hostel,
                            role: 'student'
                        }).returning();
                        user = newUser;
                        userMap.set(emailLower, newUser);
                    }

                    if (existingUserIds.has(user.id)) {
                        duplicates.push({ email: emailLower, vendorName: vendorNameString });
                        continue;
                    }

                    const vendor = vendorsMap.get(vendorNameString);
                    if (!vendor) {
                        issues.push({ row, error: `Vendor with name '${vendorNameString}' not found` });
                        continue;
                    }

                    // Create selection
                    await tx.insert(vendorSelections).values({
                        userId: user.id,
                        vendorId: vendor.id,
                        preference,
                        forMonth: forMonthDate,
                        dateofEntry: new Date(),
                        hostel: hostel,
                    });
                    newEntries.push({ email: emailLower, vendorName: vendorNameString });
                    existingUserIds.add(user.id);

                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
                    issues.push({ row, error: errorMessage });
                }
            }
        });

        if (process.env.NODE_ENV !== 'production') {
            console.log(`${duplicates.length} duplicates, ${issues.length} issues, ${newEntries.length} new entries`);
        }

        return NextResponse.json({
            success: true,
            message: "Vendor selection upload processed.",
            newEntries: newEntries.length,
            duplicates: duplicates.length,
            issues,
        });

    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === "Unauthorized") return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
            if (error.message === "Forbidden") return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
            return NextResponse.json({ success: false, message: "Internal server error", error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: false, message: "An unknown internal server error occurred" }, { status: 500 });
    }
}
