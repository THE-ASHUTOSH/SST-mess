import express from "express";
import passport from "passport";
import { generateToken } from "../utils/generateToken.js";

const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const token = generateToken({
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture,
    });

    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });

    res.redirect('http://localhost:3000/student');

    res.json({
      success: true,
      token,
      user: req.user,
    });
    
  }
);

router.get("/details", (req, res) => {
  if (!req.cookies?.token) {
  return res.status(401).json({ message: "Unauthorized" });
}

  if(req.cookies && req.cookies.token){
    const user = jwt.verify(req.cookies.token, "your_jwt_secret_key");
    return res.json({user});
  }
  res.json();
});

export default router;
