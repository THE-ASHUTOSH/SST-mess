import express from 'express';
import { getFeedbackToggle, toggleFeedback } from '../controllers/controls.controller.js';
import { adduserdetails } from '../middlewares/user.middleware.js';
import { requireAdmin } from '../middlewares/roleAuth.middleware.js';

const router = express.Router();

router.get('/feedback-toggle', getFeedbackToggle);
router.patch('/feedback-toggle',adduserdetails,requireAdmin, toggleFeedback);

export default router;
