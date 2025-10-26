import { Router } from "express";
import { getVendors, vendorSelectionFrom, vendorFeedbackForm } from "../controllers/vendor.controller.js";
import { adduserdetails } from "../middlewares/user.middleware.js";
import { addVendordetails } from "../middlewares/vendor.middleware.js";

const router = Router();

router.route("/getVendors").get(getVendors);
router.route("/vendorSelectionForm").post(adduserdetails, vendorSelectionFrom);
router.route("/vendorFeedbackForm").post(adduserdetails,addVendordetails,vendorFeedbackForm);

export default router;