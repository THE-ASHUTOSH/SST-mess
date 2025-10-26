import mongoose from "mongoose";

const vendorFeedbackFormSchema = new mongoose.Schema({
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true,
    },
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    feedback: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
},
{
    timestamps: true,
});

export default mongoose.model("VendorFeedback", vendorFeedbackFormSchema);
    