import { Router } from "express";
import { uploadVendorSelection } from "../controllers/admin.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { adduserdetails } from "../middlewares/user.middleware.js";
import { requireAdmin } from "../middlewares/roleAuth.middleware.js";

const router = Router();

router
    .route("/upload-vendor-selection")
    .post(adduserdetails,requireAdmin ,upload.single("vendor-selection"),uploadVendorSelection);

export default router;
