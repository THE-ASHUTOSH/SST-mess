import { Router } from "express";
import { uploadVendorSelection } from "../controllers/admin.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { adduserdetails } from "../middlewares/user.middleware.js";

const router = Router();

router
    .route("/upload-vendor-selection")
    .post(upload.single("vendor-selection"),adduserdetails ,uploadVendorSelection);

export default router;
