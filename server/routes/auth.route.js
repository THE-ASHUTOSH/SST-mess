import express from "express";
import passport from "passport";
import { generateToken } from "../utils/generateToken.js";
import { getUserDetails } from "../controllers/user.controller.js";
import User from "../models/user.model.js";
const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  async (req, res) => {
    const token = generateToken({
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture,
    });

    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none',});
    const userfound = await User.findOne({email:req.user.email});

    const DEFAULT_ROLL = '00000'
    const extractedRoll = req.user.email?.split('@')[0]?.split('.')[1]?.slice(-5);      
    try{
      if(!userfound){
          const newUser = new User({
              email: req.user.email,
              name: req.user.name,
              picture: req.user.picture,
              roll:extractedRoll ?? DEFAULT_ROLL
          });
          await newUser.save();
          console.log("New user created:");
        }
    }catch(err){
        console.log("Error while creating user");
    }
    res.redirect(`${process.env.CLIENT_URL}/student`);

    res.json({
      success: true,
      token,
      user: req.user,
    });
    
  }
);

router.get("/details", getUserDetails);

export default router;
