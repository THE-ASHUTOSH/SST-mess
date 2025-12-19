import mongoose from "mongoose";

const vendorFeedbackFormSchema = new mongoose.Schema({
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    feedback: {
        type: String,
    },
    ratings: {
        hygiene: { type: Number, required: true },
        quantity: { type: Number, required: true },
        timeliness: { type: Number, required: true },
        variety: { type: Number, required: true },
        staff: { type: Number, required: true },
        overall: { type: Number, required: true },
    },
    date: {
        type: Date,
        default: Date.now,
        index: true,
    },
},
    {
        timestamps: true,
    });

const VendorFeedback = mongoose.models.VendorFeedback || mongoose.model("VendorFeedback", vendorFeedbackFormSchema);

export default VendorFeedback;
