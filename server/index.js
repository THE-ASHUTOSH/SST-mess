import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRouter from "./routes/auth.route.js";
import "./config/passport.js";
import vendorModel from "./models/vendor.model.js";
import connectDB from "./config/dbconfig.js";
import vendorRoute from "./routes/vendor.route.js";
import cookieParser from "cookie-parser";

dotenv.config({ quiet: true });

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(
    cors({
        origin: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            process.env.CLIENT_URL,
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);
app.use("/auth", authRouter);
app.use("/vendor", vendorRoute);
connectDB();

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

app.listen(process.env.PORT || 5000, "0.0.0.0", () => {
    console.log("Server is running on port ", process.env.PORT || 5000);
});
