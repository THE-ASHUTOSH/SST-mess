import { Router } from "express";
import { getVendors,  vendorFeedbackForm } from "../controllers/vendor.controller.js";
import { adduserdetails } from "../middlewares/user.middleware.js";
import { addVendordetails } from "../middlewares/vendor.middleware.js";
import { addVendor, updateVendor } from "../controllers/vendor.controller.js";
import { getChoiceAnalysis, getFeedbackAnalysis } from "../controllers/vendor.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { requireAdmin, requireVendor } from "../middlewares/roleAuth.middleware.js";

const router = Router();

router.route("/getVendors").get(getVendors);
// router.route("/vendorSelectionForm").post(adduserdetails, vendorSelectionFrom);
router.route("/vendorFeedbackForm").post(adduserdetails,vendorFeedbackForm);
router.route("/addVendor").post(adduserdetails, requireAdmin, upload.single('menuFile'), addVendor);
router.route("/updateVendor/:id").put(adduserdetails, requireAdmin, upload.single('menuFile'), updateVendor);
router.route("/getChoiceAnalysis").post(adduserdetails, requireVendor, getChoiceAnalysis);
router.route("/getFeedbackAnalysis").get(adduserdetails, requireAdmin, getFeedbackAnalysis);


export default router;