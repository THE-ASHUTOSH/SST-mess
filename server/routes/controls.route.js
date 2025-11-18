import express from 'express';
import { getFeedbackToggle, toggleFeedback } from '../controllers/controls.controller.js';

const router = express.Router();

router.get('/feedback-toggle', getFeedbackToggle);
router.patch('/feedback-toggle', toggleFeedback);

export default router;
