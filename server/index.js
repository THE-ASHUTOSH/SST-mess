import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRouter from "./routes/auth.route.js";
import "./config/passport.js";

dotenv.config();

const app  = express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cors());
app.use("/auth",authRouter);


app.get("/",(req,res)=>{
    res.send("Hello World");
});

app.listen(5000,()=>{
    console.log("Server is running on port 5000");
})