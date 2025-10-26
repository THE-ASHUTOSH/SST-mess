import mongoose from "mongoose";


const vendorSelectionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
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

export default mongoose.model("VendorSelection", vendorSelectionSchema);