import { Router } from "express";
import { getVendors,  vendorFeedbackForm } from "../controllers/vendor.controller.js";
import { adduserdetails } from "../middlewares/user.middleware.js";
import { addVendordetails } from "../middlewares/vendor.middleware.js";
import { addVendor, updateVendor } from "../controllers/vendor.controller.js";
import { getChoiceAnalysis, getFeedbackAnalysis } from "../controllers/vendor.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/getVendors").get(getVendors);
// router.route("/vendorSelectionForm").post(adduserdetails, vendorSelectionFrom);
router.route("/vendorFeedbackForm").post(adduserdetails,vendorFeedbackForm);
router.route("/addVendor").post(adduserdetails, upload.single('menuFile'), addVendor);
router.route("/updateVendor/:id").put(adduserdetails, upload.single('menuFile'), updateVendor);
router.route("/getChoiceAnalysis").post(getChoiceAnalysis);
router.route("/getFeedbackAnalysis").get(getFeedbackAnalysis);


export default router;