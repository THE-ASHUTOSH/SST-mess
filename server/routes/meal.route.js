import express from "express";
const router = express.Router();
import { generateQR, verifyQR, getMealStatus } from "../controllers/meal.controller.js";
import { adduserdetails } from "../middlewares/user.middleware.js";
import { requireVendor } from "../middlewares/roleAuth.middleware.js";
import { getMealAnalysisByDate } from "../controllers/meal.controller.js";

router.get("/generate-qr", generateQR);
router.post("/verify-qr" , adduserdetails, requireVendor, verifyQR);
router.get("/status", getMealStatus);
router.get("/meal-analysis-by-date", getMealAnalysisByDate);

export default router;
