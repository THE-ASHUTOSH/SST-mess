import { Router } from "express";
import { getVendors, vendorSelectionFrom, vendorFeedbackForm } from "../controllers/vendor.controller.js";

const router = Router();

router.route("/getVendors").get(getVendors);
router.route("/vendorSelectionForm").post(vendorSelectionFrom);
router.route("/vendorFeedbackForm").post(vendorFeedbackForm);

export default router;