import mongoose from "mongoose";


const vendorSectionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    roomNo:{
        type: String,
        required: true,
    },
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true,
    },
});

export default mongoose.model("VendorSection", vendorSectionSchema);