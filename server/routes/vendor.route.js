import { Router } from "express";
import { getVendors, vendorSelectionFrom, vendorFeedbackForm } from "../controllers/vendor.controller.js";
import { adduserdetails } from "../middlewares/user.middleware.js";
import { addVendordetails } from "../middlewares/vendor.middleware.js";
import { addVendor, updateVendor } from "../controllers/vendor.controller.js";
import { getChoiceAnalysis, getFeedbackAnalysis } from "../controllers/vendor.controller.js";

const router = Router();

router.route("/getVendors").get(getVendors);
router.route("/vendorSelectionForm").post(adduserdetails, vendorSelectionFrom);
router.route("/vendorFeedbackForm").post(adduserdetails,addVendordetails,vendorFeedbackForm);
router.route("/addVendor").post(adduserdetails,addVendor);
router.route("/updateVendor/:id").put(adduserdetails,updateVendor);
router.route("/getChoiceAnalysis").get(getChoiceAnalysis);
router.route("/getFeedbackAnalysis").get(getFeedbackAnalysis);


export default router;