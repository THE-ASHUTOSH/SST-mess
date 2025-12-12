import jwt from "jsonwebtoken";

function adduserdetails(req, res, next) {
    let token = null;
    if (req.cookies?.token) {
        token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = decoded;
        if (req.body) {
            req.body.user = decoded;
        }
        // console.log("User details added to request:", decoded.email);
        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: "Unauthorized: Invalid token" });
        }
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Unauthorized: Token expired" });
        }
        console.error("Add user details middleware error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export { adduserdetails };