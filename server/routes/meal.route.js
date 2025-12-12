import express from "express";
const router = express.Router();
import { generateQR, verifyQR, getMealStatus } from "../controllers/meal.controller.js";
import { adduserdetails } from "../middlewares/user.middleware.js";
import { requireVendor } from "../middlewares/roleAuth.middleware.js";

router.get("/generate-qr", generateQR);
router.post("/verify-qr" , adduserdetails, requireVendor, verifyQR);
router.get("/status", getMealStatus);

export default router;
