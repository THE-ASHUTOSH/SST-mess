import { Router } from "express";
import { uploadVendorSelection } from "../controllers/admin.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router
    .route("/upload-vendor-selection")
    .post(upload.single("vendor-selection"), uploadVendorSelection);

export default router;
