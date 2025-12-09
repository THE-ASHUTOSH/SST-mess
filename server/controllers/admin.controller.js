import xlsx from "xlsx";
import User from "../models/user.model.js";
import Vendor from "../models/vendor.model.js";
import VendorSelection from "../models/vendorselectform.model.js";
import fs from "fs";

const uploadVendorSelection = async (req, res) => {
    try {
        const { month } = req.body;
        const file = req.file;

        console.log(month, file);

        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        if (!month) {
            return res.status(400).json({ message: "Month not specified" });
        }

        const workbook = xlsx.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        const issues = [];

        // Optimization: Fetch all vendors at once
        const allVendors = await Vendor.find({});
        const vendorsMap = new Map(allVendors.map(vendor => [vendor.name, vendor]));

        const forMonthDate = new Date(month);
        const existingSelections = await VendorSelection.find({ forMonth: forMonthDate });
        const existingUserSelections = new Set(existingSelections.map(sel => sel.user.toString()));

        const duplicates = [];
        const newEntries = [];

        for (const row of data) {
            try {
                const email = row['Email Address'];
                const vendorNameString = row['Please select the below options according to your preference'];
                const preference = row['Choose your preference'];
                const hostel = row['Hostel'];
                const batch = row['Batch'];


                if (!email || !vendorNameString || !preference || !hostel || !batch) {
                    issues.push({ row, error: 'Missing required fields' });
                    continue;
                }

                const vendorName = vendorNameString;

                let user = await User.findOne({ email });
                if(user && (!user.hostel||user.hostel !== hostel || !user.batch || user.batch !== batch) ){
                    user.hostel = hostel;
                    user.batch = batch;
                    await user.save();
                    console.log(`Updated user ${email} with hostel and batch info`);
                }


                if (!user) {
                    user = new User({
                        email: email,
                        name: row['Full Name'],
                        batch: batch,
                        hostel: hostel,
                    });
                    await user.save();
                    console.log(`Created new user with email ${email}`);
                }

                if (existingUserSelections.has(user._id.toString())) {
                    duplicates.push({ email, vendorName: vendorNameString });
                    continue;
                }

                const vendor = vendorsMap.get(vendorName);
                if (!vendor) {
                    console.log(`Vendor with name ${vendorName} not found`);
                    issues.push({ row, error: `Vendor with name '${vendorName}' not found` });
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
                console.log(`Created vendor selection for user ${email} with vendor ${vendorName}`);
            
                newEntries.push({ email, vendorName: vendorNameString });
                existingUserSelections.add(user._id.toString()); // Add to set to prevent duplicates from the same file

            } catch (error) {
                console.error('Error processing row:', row, error);
                issues.push({ row, error: error.message });
            }
        }

        fs.unlinkSync(file.path);
        console.log(duplicates.length + " duplicates found.");
        console.log(issues.length + " issues found.");
        console.log(newEntries.length + " new entries added.");
        console.log("By User : " + req.user.email);
        res.status(200).json({
            message: "Vendor selection upload processed.",
            newEntries: newEntries.length,
            duplicates: duplicates.length,
            issues,
        });
    } catch (error) {
        console.error("Error uploading vendor selection:", error);
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: "Internal server error" });
    }finally{
        console.log("Upload vendor selection process completed.");
    }
};

export { uploadVendorSelection };