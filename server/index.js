import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRouter from "./routes/auth.route.js";
import "./config/passport.js";
import vendorModel from "./models/vendor.model.js";
import connectDB from "./config/dbconfig.js";
import vendorRoute from "./routes/vendor.route.js";

dotenv.config();

const app  = express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cors(
    {
        origin:"http://localhost:3000",
        credentials:true
    }
));
app.use("/auth",authRouter);
app.use("/vendor",vendorRoute);
connectDB()

// app.get("/addvendor",async(req,res)=>{
//     try {
//         const vendor = new vendorModel({
//             name:"Uniworld",
//             description:"South Indian Cuisine",
//             price:4000,
//             menu:"https://www.greatsr.com/menu3 "
//     })
//         await vendor.save();
//         res.send("Vendor Added Successfully");
// }catch(err){
//         console.log(err);
//         res.send(err);
//     }
// });

app.listen(5000,()=>{
    console.log("Server is running on port 5000");
})