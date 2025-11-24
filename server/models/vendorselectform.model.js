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
    preference:{
        type: String,
        enum: ["Vegetarian", "Non-Vegetarian", ],
        default: 'vegetarian',
    },
    hostel:{
        type:String,
        enum:["Velankani Micro Campus","Neeladri Micro Campus"]
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