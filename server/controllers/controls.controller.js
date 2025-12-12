import Control from '../models/control.model.js';

const getFeedbackToggle = async (req, res) => {
    try {
        const feedbackToggle = await Control.findOne({ name: 'feedbackToggle' });
        if (!feedbackToggle) {
            // If the toggle doesn't exist, create it with a default value of false
            const newToggle = new Control({ name: 'feedbackToggle', enabled: false });
            await newToggle.save();
            return res.status(200).json({ enabled: newToggle.enabled });
        }
        res.status(200).json({ enabled: feedbackToggle.enabled });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching feedback toggle', error });
    }
};

const toggleFeedback = async (req, res) => {
    try {
        let feedbackToggle = await Control.findOne({ name: 'feedbackToggle' });

        if (feedbackToggle) {
            // Toggle if exists
            feedbackToggle.enabled = !feedbackToggle.enabled;
        } else {
            // Create with true if it doesn't exist
            feedbackToggle = new Control({ name: 'feedbackToggle', enabled: true });
        }

        await feedbackToggle.save();
        console.log(`Feedback toggle set to ${feedbackToggle.enabled} by ${req.user.email}`);
        res.status(200).json({ enabled: feedbackToggle.enabled });
    } catch (error) {
        res.status(500).json({ message: 'Error toggling feedback toggle', error });
    }
};

export { getFeedbackToggle, toggleFeedback };
