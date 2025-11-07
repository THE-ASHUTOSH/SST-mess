import express from "express";
const router = express.Router();
import { generateQR, verifyQR, getMealStatus } from "../controllers/meal.controller.js";

router.get("/generate-qr", generateQR);
router.post("/verify-qr", verifyQR);
router.get("/status", getMealStatus);

export default router;
