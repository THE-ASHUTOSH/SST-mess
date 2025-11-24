import express from "express";
import passport from "passport";
import { generateToken } from "../utils/generateToken.js";
import {
  verifyAndSendDetails,
  verifyAndSetCookies,
} from "../controllers/user.controller.js";
import User from "../models/user.model.js";
const router = express.Router();

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

    const token = generateToken({
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture,
    });


    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 8 * 60 * 60 * 1000,
    });

    const userfound = await User.findOne({ email: req.user.email });

    const DEFAULT_ROLL = "00000";
    const extractedRoll = parseScalerEmail(req.user.email).valid
      ? parseScalerEmail(req.user.email).roll
      : null;

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
        console.log("New user created:");
      }
    } catch (err) {
      console.log("Error while creating or updating user", err);
    }
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  }
);

router.get("/verifyanddetails", verifyAndSendDetails);
router.post("/verifyandsetcookies", verifyAndSetCookies);
router.post("/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "none" });
  return res.status(200).json({ message: "Logged out" });
});

export default router;
