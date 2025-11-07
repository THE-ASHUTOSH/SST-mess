import express from "express";
const router = express.Router();
import { generateQR, verifyQR } from "../controllers/meal.controller.js";

router.get("/generate-qr", generateQR);
router.post("/verify-qr", verifyQR);

export default router;
