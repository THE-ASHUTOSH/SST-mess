import express from "express";
const router = express.Router();
import { generateQR, verifyQR, getMealStatus } from "../controllers/meal.controller.js";
import { adduserdetails } from "../middlewares/user.middleware.js";
import { requireVendor } from "../middlewares/roleAuth.middleware.js";

router.get("/generate-qr", generateQR);
// Only vendors can verify QR codes (scan student meals)
router.post("/verify-qr", requireVendor, verifyQR);
router.get("/status", getMealStatus);

export default router;
