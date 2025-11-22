import xlsx from "xlsx";
import User from "../models/user.model.js";
import Vendor from "../models/vendor.model.js";
import VendorSelection from "../models/vendorselectform.model.js";

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

        console.log(data);

        // for (const row of data) {
        //     const { email, vendorName, preference } = row;

        //     const user = await User.findOne({ email });
        //     if (!user) {
        //         console.log(`User with email ${email} not found`);
        //         continue;
        //     }

        //     const vendor = await Vendor.findOne({ name: vendorName });
        //     if (!vendor) {
        //         console.log(`Vendor with name ${vendorName} not found`);
        //         continue;
        //     }

        //     const newVendorSelection = new VendorSelection({
        //         user: user._id,
        //         vendor: vendor._id,
        //         preference,
        //         forMonth: new Date(month),
        //         dateofEntry: new Date(),
        //     });

        //     await newVendorSelection.save();
        // }

        res.status(200).json({ message: "Vendor selection uploaded successfully" });
    } catch (error) {
        console.error("Error uploading vendor selection:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export { uploadVendorSelection };