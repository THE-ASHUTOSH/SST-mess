import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import VendorSelection from "../models/vendorselectform.model.js";

async function verifyAndSendDetails(req, res) {
    console.time('verifyAndSendDetails');
    try {
        if (!req.cookies?.token) {
            console.timeEnd('verifyAndSendDetails');
            return res.status(402).json({ message: "Unauthorized" });
        }

        console.time('jwtVerify');
        const payload = jwt.verify(req.cookies.token, process.env.JWT_SECRET_KEY);
        console.timeEnd('jwtVerify');

        console.time('dbUserFindOne');
        const dbUser = await User.findOne({ email: payload.email }).select('-__v').lean();
        console.timeEnd('dbUserFindOne');

        if (!dbUser) {
            console.timeEnd('verifyAndSendDetails');
            return res.status(401).json({ message: 'Unauthorized' });
        }

        console.timeEnd('verifyAndSendDetails');
        return res.status(200).json({ user: dbUser });
    } catch (err) {
        console.error('verifyAndSendDetails error', err);
        console.timeEnd('verifyAndSendDetails');
        return res.status(401).json({ message: 'Unauthorized' });
    }
}

async function verifyAndSetCookies(req, res) {
    if (!req.body.token) {
        return res.status(400).json({ error: "No token provided" });
    }

    jwt.verify(req.body.token, process.env.JWT_SECRET_KEY, async (err, payload) => {
        if (err) {
            return res.status(401).json({ error: "Invalid token" });
        }

        try {
            // set cookie
            
            // try to fetch DB user to return role
            try{
                const dbUser = await User.findOne({ email: payload.email }).select('-__v').lean();
            if(dbUser){
                res.cookie('token', req.body.token, { httpOnly: true, secure: true, sameSite: 'none' });
                return res.status(200).json({ user: dbUser});
            }
            return res.status(401).json({ message: 'Unauthorized' });
            }catch(err){
                return res.status(401).json({ message: 'Unauthorized' });
            }
            
        } catch (e) {
            console.error('verifyAndSetCookies error', e);
            return res.status(500).json({ error: 'Server error' });
        }
    });
}

async function getLatestVendorSelection(req, res) {
    try {
        // const latestSelection = await VendorSelection.findOne({ user: req.user._id })
        //     .sort({ createdAt: -1 })
        //     .populate('vendor');
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const latestSelection = await VendorSelection.findOne({
              user: req.user._id,
              date: {
                $gte: startOfMonth,
                $lte: endOfMonth,
              },
            }).sort({ createdAt: -1 }).populate('vendor');

        if (!latestSelection) {
            return res.status(404).json({ message: "No vendor selection found" });
        }

        return res.status(200).json({ latestSelection });
    } catch (error) {
        console.error('Error fetching latest vendor selection:', error);
        return res.status(500).json({ message: 'Server error' });
    }
}

export { verifyAndSendDetails, verifyAndSetCookies, getLatestVendorSelection };