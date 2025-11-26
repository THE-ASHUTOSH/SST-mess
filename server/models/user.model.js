import mongoose from "mongoose";

const userModel = new mongoose.Schema({
    email:{
        type:String,
        required:true,
        unique:true,
    },
    roll:{
        type:String,
    },
    role:{
        type:String,
        enum:['admin','student','vendor'],
        default:'student',
    },
    picture:{
        type:String,
    },
    hostel:{
        type:String,
    },
    batch:{
        type:String,
    },
    name:{
        type:String,
        required:true,
    }
})

export default mongoose.model("User", userModel);