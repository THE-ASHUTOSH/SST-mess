import mongoose from "mongoose";

const vendorSelectionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true,
    },
    preference: {
        type: String,
        enum: ["Vegetarian", "Non-Vegetarian",],
        default: 'vegetarian',
    },
    forMonth: {
        type: Date,
        required: true,
    },
    dateofEntry: {
        type: Date,
        required: true,
    }
},
    {
        timestamps: true,
    });

// Index creation might need adjustment in serverless env if autoIndex is false, but keeping schema definition is fine
// vendorSelectionSchema.index({ forMonth: -1 });
// vendorSelectionSchema.index({ vendor: 1 });

const VendorSelection = mongoose.models.VendorSelection || mongoose.model("VendorSelection", vendorSelectionSchema);

export default VendorSelection;
