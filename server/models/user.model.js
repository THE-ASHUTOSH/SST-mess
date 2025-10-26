import mongoose from "mongoose";

const userModel = new mongoose.Schema({
    email:{
        type:String,
        required:true,
        unique:true,
    },
    roll:{
        type:String,
        unique:true,
    },
    role:{
        type:String,
        enum:['admin','student'],
        default:'student',
    },
    pictue:{
        type:String,
    },
    name:{
        type:String,
        required:true,
    }
})

export default mongoose.model("User", userModel);