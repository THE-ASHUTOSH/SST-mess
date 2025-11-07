import User from "../models/user.model.js";
import VendorSelection from "../models/vendorselectform.model.js";
import Vendor from "../models/vendor.model.js";
async function addVendordetails(req, res, next) {
    const {user} = req.body;
    // const userMongo = await User.findById(user._id);
    console.log("user details from middleware:", req.body);
    const vendorSelection = await VendorSelection.findOne({user:user._id});
    const vendorMongo = await Vendor.findById(vendorSelection.vendor);
    // console.log("vendor details from middleware:", vendorMongo);
    req.body.vendor = vendorMongo
    next();
}

export{addVendordetails};