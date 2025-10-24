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
    menu: {
        type: String,
        required: true,
    },
});

export default mongoose.model("Vendor", vendorSchema);
    