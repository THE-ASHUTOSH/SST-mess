import { Router } from "express";
import { getLatestVendorSelection } from "../controllers/user.controller.js";
import { adduserdetails } from "../middlewares/user.middleware.js";

const router = Router();

router.route("/latest-vendor").get(adduserdetails, getLatestVendorSelection);

export default router;
