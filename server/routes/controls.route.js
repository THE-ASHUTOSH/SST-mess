import express from 'express';
import { getFeedbackToggle, toggleFeedback } from '../controllers/controls.controller.js';
import { requireAdmin } from '../middlewares/roleAuth.middleware.js';

const router = express.Router();

router.get('/feedback-toggle', getFeedbackToggle);
router.patch('/feedback-toggle', requireAdmin, toggleFeedback);

export default router;

