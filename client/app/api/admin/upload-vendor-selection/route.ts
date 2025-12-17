import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/user.model';
import Vendor from '@/lib/models/vendor.model';
import VendorSelection from '@/lib/models/vendorselectform.model';
import { requireRole } from '@/lib/auth-helper';
import * as xlsx from 'xlsx';

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

        await connectDB();

        const buffer = await file.arrayBuffer();
        const workbook = xlsx.read(buffer, { type: 'buffer' });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data: any[] = xlsx.utils.sheet_to_json(sheet);

        const issues: any[] = [];

        const allVendors = await Vendor.find({});
        const vendorsMap = new Map(allVendors.map(vendor => [vendor.name, vendor]));

        const forMonthDate = new Date(month);
        const existingSelections = await VendorSelection.find({ forMonth: forMonthDate });
        const existingUserSelections = new Set(existingSelections.map(sel => sel.user.toString()));

        const duplicates: any[] = [];
        const newEntries: any[] = [];

        // Note: Field mapping check logic from original controller is assumed to be handled by data access below
        // or we could add explicit headers check.

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
                let user = await User.findOne({ email: emailLower });

                if (user && (!user.hostel || user.hostel !== hostel || !user.batch || user.batch !== batch)) {
                    user.hostel = hostel;
                    user.batch = batch;
                    await user.save();
                    console.log(`Updated user ${emailLower} with hostel and batch info`);
                }

                if (!user) {
                    user = new User({
                        email: emailLower,
                        name: name || emailLower.split('@')[0], // Fallback name
                        batch: batch,
                        hostel: hostel,
                        role: 'student'
                    });
                    await user.save();
                    console.log(`Created new user with email ${emailLower}`);
                }

                if (existingUserSelections.has(user._id.toString())) {
                    duplicates.push({ email: emailLower, vendorName: vendorNameString });
                    continue;
                }

                const vendor = vendorsMap.get(vendorNameString);
                if (!vendor) {
                    console.log(`Vendor with name ${vendorNameString} not found`);
                    issues.push({ row, error: `Vendor with name '${vendorNameString}' not found` });
                    continue;
                }

                const newVendorSelection = new VendorSelection({
                    user: user._id,
                    vendor: vendor._id,
                    preference,
                    forMonth: forMonthDate,
                    dateofEntry: new Date(),
                });

                await newVendorSelection.save();

                newEntries.push({ email: emailLower, vendorName: vendorNameString });
                existingUserSelections.add(user._id.toString());

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
