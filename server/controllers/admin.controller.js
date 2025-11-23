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

        for (const row of data) {
            try {
                const email = row['Email Address'];
                const vendorNameString = row['Please select the below options according to your preference'];
                const preference = row['Choose your preference'];

                if (!email || !vendorNameString || !preference) {
                    issues.push({ row, error: 'Missing required fields' });
                    continue;
                }

                const vendorName = vendorNameString;

                let user = await User.findOne({ email });
                if (!user) {
                    user = new User({
                        email: email,
                        name: row['Full Name'],
                        batch: row['Batch'],
                    });
                    await user.save();
                    console.log(`Created new user with email ${email}`);
                }

                const vendor = vendorsMap.get(vendorName);
                if (!vendor) {
                    console.log(`Vendor with name ${vendorName} not found`);
                    issues.push({ row, error: `Vendor with name ${vendorName} not found` });
                    continue;
                }

                const newVendorSelection = new VendorSelection({
                    user: user._id,
                    vendor: vendor._id,
                    preference,
                    forMonth: new Date(month),
                    dateofEntry: new Date(),
                });

                await newVendorSelection.save();
            } catch (error) {
                console.error('Error processing row:', row, error);
                issues.push({ row, error: error.message });
            }
        }

        fs.unlinkSync(file.path);

        if (issues.length > 0) {
            return res.status(400).json({
                message: "Vendor selection uploaded with some issues",
                issues,
            });
        }

        res.status(200).json({ message: "Vendor selection uploaded successfully" });
    } catch (error) {
        console.error("Error uploading vendor selection:", error);
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: "Internal server error" });
    }
};

export { uploadVendorSelection };