import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, vendors, vendorSelections } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import * as xlsx from 'xlsx';
import { eq } from 'drizzle-orm';

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
        const data: any[] = xlsx.utils.sheet_to_json(sheet);

        const issues: any[] = [];

        // Fetch all vendors to map name -> vendor
        const allVendors = await db.select().from(vendors);
        const vendorsMap = new Map(allVendors.map(vendor => [vendor.name, vendor]));

        const forMonthDate = new Date(month);

        // Fetch existing selections for this month to check for duplicates
        // We only really need the userIds to check usage
        const existingSelections = await db.query.vendorSelections.findMany({
            where: eq(vendorSelections.forMonth, forMonthDate),
            with: {
                user: true
            }
        });

        // Use user.email as key or userId. 
        // Logic: if user exists in existingSelections, avoid duplicate.
        // We can map userId -> true
        const existingUserIds = new Set(existingSelections.map(sel => sel.userId));

        const duplicates: any[] = [];
        const newEntries: any[] = [];

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

                // Check if user exists
                let [user] = await db.select().from(users).where(eq(users.email, emailLower)).limit(1);

                if (user && (!user.hostel || user.hostel !== hostel || !user.batch || user.batch !== batch)) {
                    // Update user info
                    [user] = await db.update(users)
                        .set({ hostel, batch })
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
                        hostel: hostel,
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

                // Create selection
                await db.insert(vendorSelections).values({
                    userId: user.id,
                    vendorId: vendor.id,
                    preference, // Assuming matches Enum or text
                    forMonth: forMonthDate,
                    dateofEntry: new Date(),
                    hostel: hostel, // Schema has hostel column
                });
                console.log(`Created vendor selection for user ${emailLower} with vendor ${vendorNameString}`);
                newEntries.push({ email: emailLower, vendorName: vendorNameString });
                existingUserIds.add(user.id);

            } catch (error: any) {
                console.error('Error processing row:', row, error);
                issues.push({ row, error: error.message });
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

    } catch (error: any) {
        if (error.message === "Unauthorized") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        if (error.message === "Forbidden") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
    }
}
