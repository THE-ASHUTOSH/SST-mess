import Meal from "../models/meal.model.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

export const generateQR = async (req, res) => {
  try {
    const userId = req.user._id;
    const lastMeal = await Meal.findOne({ user: userId }).sort({ createdAt: -1 });

    if (lastMeal) {
      const now = new Date();
      const diff = now.getTime() - lastMeal.createdAt.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));

      if (hours < 3) {
        return res.status(403).json({ message: "You can only take one meal every 3 hours." });
      }
    }

    const token = jwt.sign({ userId }, process.env.JWT_SECRET_KEY, { expiresIn: "15m" });
    res.status(200).json({ token });
  } catch (error) {
    console.error("Error generating QR code:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyQR = async (req, res) => {
  try {
    const { token } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const userId = decoded.userId;

    const lastMeal = await Meal.findOne({ user: userId }).sort({ createdAt: -1 });

    if (lastMeal) {
      const now = new Date();
      const diff = now.getTime() - lastMeal.createdAt.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));

      if (hours < 3) {
        return res.status(403).json({ message: "User has already taken a meal in the last 3 hours." });
      }
    }

    const meal = new Meal({ user: userId });
    await meal.save();

    const user = await User.findById(userId);

    res.status(200).json({ message: "Meal verified successfully.", user: user.name });
  } catch (error) {
    console.error("Error verifying QR code:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid QR code." });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "QR code has expired." });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};
