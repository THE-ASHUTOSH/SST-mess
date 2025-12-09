import { Router } from "express";
import { uploadVendorSelection } from "../controllers/admin.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { requireAdmin } from "../middlewares/roleAuth.middleware.js";

const router = Router();

// Auth check BEFORE file upload to prevent unauthenticated file uploads
router
    .route("/upload-vendor-selection")
    .post(requireAdmin, upload.single("vendor-selection"), uploadVendorSelection);

export default router;

