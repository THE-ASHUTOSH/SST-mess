import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
async function adduserdetails(req,res,next){
    // console.log(req);
    if (!req.cookies?.token) {
        // res.redirect('http://localhost:3000/login')
        return res.status(401).json({ message: "Unauthorized" });
        
    }
    if (req.cookies && req.cookies.token) {
        const user = jwt.verify(req.cookies.token, "your_jwt_secret_key");
        // console.log(user);
        const u = await User.findOne({email:"ashutosh.24bcs10111@sst.scaler.com"});
        console.log(u._id);
        req.body.user = u._id;
    }
    next();

}

export { adduserdetails };