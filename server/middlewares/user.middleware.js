import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
async function adduserdetails(req, res, next) {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const user = await User.findOne({ email: decoded.email });
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        req.user = user;
        if (req.body) {
            req.body.user = user;
        }
        next();
    } catch (err) {
        console.log("err", err);
        return res.status(401).json({ message: "Unauthorized" });
    }
}

export { adduserdetails };