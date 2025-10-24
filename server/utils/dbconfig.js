import mongoose from "mongoose";

export const connectDB = async ()=>{
    try{
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    console.log("MongoDB connected successfully");
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}
