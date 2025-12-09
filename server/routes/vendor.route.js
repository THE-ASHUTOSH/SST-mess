import { Router } from "express";
import { getVendors,  vendorFeedbackForm } from "../controllers/vendor.controller.js";
import { adduserdetails } from "../middlewares/user.middleware.js";
import { addVendordetails } from "../middlewares/vendor.middleware.js";
import { addVendor, updateVendor } from "../controllers/vendor.controller.js";
import { getChoiceAnalysis, getFeedbackAnalysis } from "../controllers/vendor.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { requireAdmin, requireVendor, requireStudent } from "../middlewares/roleAuth.middleware.js";

const router = Router();

router.route("/getVendors").get(getVendors);
// router.route("/vendorSelectionForm").post(adduserdetails, vendorSelectionFrom);
router.route("/vendorFeedbackForm").post(adduserdetails, vendorFeedbackForm);
router.route("/addVendor").post(requireAdmin, upload.single('menuFile'), addVendor);
router.route("/updateVendor/:id").put(requireAdmin, upload.single('menuFile'), updateVendor);
// Analytics routes - admin only access to sensitive data
router.route("/getChoiceAnalysis").post(requireAdmin, getChoiceAnalysis);
router.route("/getFeedbackAnalysis").get(requireAdmin, getFeedbackAnalysis);


export default router;