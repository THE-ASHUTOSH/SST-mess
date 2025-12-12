import express from "express";
import passport from "passport";
import crypto from "crypto";
import { generateToken } from "../utils/generateToken.js";
import {
  verifyAndSendDetails,
  verifyAndSetCookies,
} from "../controllers/user.controller.js";
import User from "../models/user.model.js";
const router = express.Router();

const authCodes = new Map();

// Cleanup expired codes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of authCodes.entries()) {
    if (now > data.expiresAt) {
      authCodes.delete(code);
    }
  }
}, 5 * 60 * 1000);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    function parseScalerEmail(email) {
      if (!email || typeof email !== "string") {
        return { valid: false, error: "Invalid email format" };
      }

      // Regex breakdown:
      // ^([a-zA-Z]+)\.   -> name before dot
      // (\d{2}bcs\d{5})  -> roll format
      // @sst\.scaler\.com$ -> fixed domain
      const regex = /^([a-zA-Z]+)\.(\d{2}bcs\d{5})@sst\.scaler\.com$/;

      const match = email.match(regex);

      if (!match) {
        return { valid: false, error: "Invalid email format" };
      }

      const name = match[1];
      const roll = match[2];

      return { valid: true, name, roll };
    }

    const DEFAULT_ROLL = "00000";
    const emailParseResult = parseScalerEmail(req.user.email);
    const extractedRoll = emailParseResult.valid
      ? emailParseResult.roll
      : null;

    let userfound = await User.findOne({ email: req.user.email });

    try {
      if (userfound) {
        // If user exists, update missing details
        let updated = false;
        if (userfound.name !== req.user.name || !userfound.name) {
          userfound.name = req.user.name;
          updated = true;
        }
        if (userfound.picture !== req.user.picture || !userfound.picture) {
          userfound.picture = req.user.picture;
          updated = true;
        }
        if (
          ((userfound.roll === DEFAULT_ROLL || !userfound.roll )) &&
          extractedRoll
        ) {
          userfound.roll = extractedRoll;
          updated = true;
        }

        if (updated) {
          await userfound.save();
          console.log("User details updated:");
        }
      } else {
        // If user doesn't exist, create a new one
        const newUser = new User({
          email: req.user.email,
          name: req.user.name,
          picture: req.user.picture,
          roll: extractedRoll ?? DEFAULT_ROLL,
        });
        await newUser.save();
        userfound = newUser;
        console.log("New user created:");
      }
    } catch (err) {
      console.log("Error while creating or updating user", err);
    }
    
    // Get the user's role from database (default to 'student' for new users)
    const userRole = userfound?.role || 'student';

    // Generate token with role included in the payload
    const token = generateToken({
      _id: userfound._id,
      email: userfound.email,
      name: userfound.name,
      picture: userfound.picture,
      roll: userfound?.roll,
    }, userRole);

    // Set httpOnly cookie with explicit path (only once to avoid duplicates)
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 8 * 60 * 60 * 1000,
    });

    // Generate a short-lived auth code instead of passing token in URL
    // This prevents token exposure in browser history, server logs, and referer headers
    const authCode = crypto.randomBytes(32).toString('hex');
    authCodes.set(authCode, {
      token,
      expiresAt: Date.now() + 60 * 1000  // 60 seconds
    });

    res.redirect(`${process.env.CLIENT_URL}/auth/callback?code=${authCode}`);  }
);

// Exchange auth code for token (secure alternative to token in URL)
router.post("/exchange-code", (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ message: "Auth code is required" });
  }

  const authData = authCodes.get(code);
  
  if (!authData) {
    return res.status(401).json({ message: "Invalid or expired auth code" });
  }

  if (Date.now() > authData.expiresAt) {
    authCodes.delete(code);
    return res.status(401).json({ message: "Auth code has expired" });
  }

  // Delete the code immediately after use (one-time use)
  authCodes.delete(code);

  // Set the token cookie
  res.cookie("token", authData.token, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 8 * 60 * 60 * 1000,
  });

  return res.status(200).json({ token: authData.token });
});

router.get("/verifyanddetails", verifyAndSendDetails);
router.post("/verifyandsetcookies", verifyAndSetCookies);
router.post("/logout", (req, res) => {
  res.clearCookie("token", { path: "/", httpOnly: true, secure: true, sameSite: "none" });
  return res.status(200).json({ message: "Logged out" });
});

export default router;
