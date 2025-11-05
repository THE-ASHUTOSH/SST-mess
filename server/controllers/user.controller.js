import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

async function verifyAndSendDetails(req, res) {
    try {
        if (!req.cookies?.token) {
            return res.status(402).json({ message: "Unauthorized" });
        }

        const payload = jwt.verify(req.cookies.token, process.env.JWT_SECRET_KEY);

        // Try to fetch the user from DB to get the role and other persisted fields
        const dbUser = await User.findOne({ email: payload.email }).select('-__v').lean();

        if (!dbUser) {
            // If user not in DB, return payload as fallback
            return res.status(401).json({ message: 'Unauthorized' });
        }

        return res.status(200).json({ user: dbUser });
    } catch (err) {
        console.error('verifyAndSendDetails error', err);
        return res.status(401).json({ message: 'Unauthorized' });
    }
}

async function verifyAndSetCookies(req, res) {
    // Set cache control headers to prevent caching
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (!req.body.token) {
        console.error('No token provided in request');
        return res.status(400).json({ error: "No token provided" });
    }

    try {
        const payload = await jwt.verify(req.body.token, process.env.JWT_SECRET_KEY);
        console.log('Token verified, payload:', payload);

        try {
            const dbUser = await User.findOne({ email: payload.email }).select('-__v').lean();
            console.log('User found:', dbUser ? 'yes' : 'no');

            if (dbUser) {
                // Set cookie with proper settings for cross-domain
                const cookieOptions = {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production', // Only secure in production
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    maxAge: 24 * 60 * 60 * 1000, // 24 hours
                    path: '/',
                    domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined // Adjust this to your domain
                };
                
                res.cookie('token', req.body.token, cookieOptions);
                console.log('Cookie set with options:', cookieOptions);
                
                return res.status(200).json({ 
                    user: dbUser,
                    debug: process.env.NODE_ENV === 'development' ? { cookieSet: true, options: cookieOptions } : undefined
                });
            }
            return res.status(401).json({ message: 'User not found' });
        } catch (dbError) {
            console.error('Database error:', dbError);
            return res.status(500).json({ error: 'Database error' });
        }
    } catch (jwtError) {
        console.error('JWT verification error:', jwtError);
        return res.status(401).json({ error: "Invalid token" });
    }
}

export { verifyAndSendDetails, verifyAndSetCookies };