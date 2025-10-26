import User from "../models/user.model.js";
import VendorSection from "../models/vendorselectform.model.js";
import VendorFeedback from "../models/vendorfeedbackform.model.js";
import Vendor from "../models/vendor.model.js";
async function vendorSelectionFrom(req,res){
    const {name,room,vendor,user} = req.body;
    try{
        const student = user;
        const vendormod = await Vendor.findById(vendor);
        const vendorSection = await VendorSection.create({name,roomNo:room,vendor:vendormod,user:student});
        res.status(200).json({success:true,vendorSection});
    }catch(err){
        res.status(400).json({success:false,err});
    }

}

async function vendorFeedbackForm(req,res){
    const {rating, vendor, feedback,user} = req.body;
    // console.log(vendor)
    try{
        const VendorFeedbackForm = await new VendorFeedback({rating, vendor, feedback,user}).save();
        res.status(200).json({success:true,VendorFeedbackForm});
    }catch(err){
        res.status(400).json({success:false,err});
    }
    // console.log({rating, vendor, feedback,user});
    
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