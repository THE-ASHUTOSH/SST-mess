import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    price: {
        type: Number,
        required: true,
    },
    menuUrl: {
        type: String,
    },
    menu: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Menu",
    },
    createdAt: {
        type: Date,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

export default mongoose.model("Vendor", vendorSchema);
    