import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

async function verifyAndSendDetails(req, res) {
    try {
        if (!req.cookies?.token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const payload = jwt.verify(req.cookies.token, process.env.JWT_SECRET_KEY);

        // Try to fetch the user from DB to get the role and other persisted fields
        const dbUser = await User.findOne({ email: payload.email }).select('-__v').lean();

        if (!dbUser) {
            // If user not in DB, return payload as fallback
            return res.status(200).json({ user: payload });
        }

        return res.status(200).json({ user: dbUser });
    } catch (err) {
        console.error('verifyAndSendDetails error', err);
        return res.status(401).json({ message: 'Unauthorized' });
    }
}

function verifyAndSetCookies(req, res) {
    if (!req.body.token) {
        return res.status(400).json({ error: "No token provided" });
    }

    jwt.verify(req.body.token, process.env.JWT_SECRET_KEY, async (err, payload) => {
        if (err) {
            return res.status(401).json({ error: "Invalid token" });
        }

        try {
            // set cookie
            res.cookie('token', req.body.token, { httpOnly: true, secure: true, sameSite: 'none' });

            // try to fetch DB user to return role
            const dbUser = await User.findOne({ email: payload.email }).select('-__v').lean();
            return res.status(200).json({ user: dbUser ?? payload });
        } catch (e) {
            console.error('verifyAndSetCookies error', e);
            return res.status(500).json({ error: 'Server error' });
        }
    });
}

export { verifyAndSendDetails, verifyAndSetCookies };
