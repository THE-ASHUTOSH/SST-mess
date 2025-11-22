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
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true,
    },
    preference:{
        type: String,
        enum: ["vegetarian", "non-vegetarian", ],
        default: 'vegetarian',
    },
    forMonth:{
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

export default mongoose.model("VendorSelection", vendorSelectionSchema);