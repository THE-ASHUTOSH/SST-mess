import User from "../models/user.model.js";
import VendorSection from "../models/vendorselectform.model.js";
import VendorFeedback from "../models/vendorfeedbackform.model.js";
import Vendor from "../models/vendor.model.js";
async function vendorSelectionFrom(req,res){
    const {name,room,vendor,user} = req.body;
    try{
        console.log("starting");
        console.log(user)
        const student = await User.findById(user);
        console.log(student)
        const vendormod = await Vendor.findById(vendor);
        console.log("halfway")
        const vendorSection = await VendorSection.create({name,roomNo:room,vendor:vendormod,user:student}).catch((err)=>{console.log(err)});
        res.status(200).json({success:true,vendorSection});
        console.log("done");
    }catch(err){
        res.status(400).json({success:false,err});
    }

}

async function vendorFeedbackForm(req,res){
    const {rating, vendor, feedback,user} = req.body;
    try{
        const student = await User.findById(user.id);
        const VendorFeedbackForm = await VendorFeedback.create({rating,vendor,feedback,user:student});
        res.status(200).json({success:true,VendorFeedbackForm});
    }catch(err){
        res.status(400).json({success:false,err});
    }
}

async function getVendors(req,res){
    try{
        const vendor = await Vendor.find();
        res.status(200).json({success:true,vendor});
    }catch(err){
        res.status(400).json({success:false,err});
    }
}

export {vendorSelectionFrom,vendorFeedbackForm,getVendors};