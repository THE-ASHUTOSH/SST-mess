import User from "../models/user.model.js";
import VendorSelection from "../models/vendorselectform.model.js";
import Vendor from "../models/vendor.model.js";

async function addVendordetails(req, res, next) {
    try {
        const { user } = req.body;
        
        if (!user || !user._id) {
            return res.status(400).json({ message: "User information is required" });
        }

        const vendorSelection = await VendorSelection.findOne({ user: user._id });
        
        if (!vendorSelection) {
            return res.status(404).json({ message: "No vendor selection found for this user" });
        }

        const vendorMongo = await Vendor.findById(vendorSelection.vendor);
        
        if (!vendorMongo) {
            return res.status(404).json({ message: "Vendor not found" });
        }

        if (req.body) {
            req.body.vendor = vendorMongo;
        }
        req.vendor = vendorMongo;
        next();
    } catch (err) {
        console.error("Error in addVendordetails middleware:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export { addVendordetails };