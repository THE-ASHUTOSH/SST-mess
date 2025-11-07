import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
async function adduserdetails(req,res,next){
    // console.log(req);
    if (!req.cookies?.token) {
        // res.redirect('http://localhost:3000/login')
        return res.status(401).json({ message: "Unauthorized" });
        
    }
    if (req.cookies && req.cookies.token) {
        const user = jwt.verify(req.cookies.token, process.env.JWT_SECRET_KEY);
        // console.log(user);
        const u = await User.findOne({email: user.email});
        // console.log(u._id);
        req.user = u;
    }
    next();

}

export { adduserdetails };