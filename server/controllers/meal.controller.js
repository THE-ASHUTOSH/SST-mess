import Meal from "../models/meal.model.js";
import User from "../models/user.model.js";
import VendorSelection from "../models/vendorselectform.model.js";
import jwt from "jsonwebtoken";

export const generateQR = async (req, res) => {
  try {
    const userId = req.user._id;

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const selection = await VendorSelection.findOne({
      user: userId,
      date: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    });


    if (!selection) {
      return res
        .status(403)
        .json({ message: "Mess not opted in for this month." });
    }

    const lastMeal = await Meal.findOne({ user: userId }).sort({
      createdAt: -1,
    });



    if (lastMeal) {
      const now = new Date();
      const diff = now.getTime() - lastMeal.createdAt.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));

      if (hours < 3) {
        return res
          .status(403)
          .json({ message: "You can only take one meal every 3 hours." });
      }
    }

    const token = jwt.sign({ userId, vendor: selection.vendor}, process.env.JWT_SECRET_KEY, {
      expiresIn: "15m",
    });
    res.status(200).json({ token });
  } catch (error) {
    console.error("Error generating QR code:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMealStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const meal = await Meal.findOne({
      user: userId,
      createdAt: { $gte: fiveMinutesAgo },
    });

    if (meal) {
      return res.status(200).json({ status: "scanned" });
    }

    return res.status(200).json({ status: "not_scanned" });
  } catch (error) {
    console.error("Error getting meal status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyQR = async (req, res) => {
  try {
    const { token, vendorId } = req.body;
    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const userId = decoded.userId;
    const userVendor = decoded.vendor;

    if (userVendor.toString() !== vendorId) {
      return res.status(403).json({ message: "This student is not assigned to your vendor." });
    }

    const lastMeal = await Meal.findOne({ user: userId }).sort({
      createdAt: -1,
    });

    if (lastMeal) {
      const now = new Date();
      const diff = now.getTime() - lastMeal.createdAt.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));

      if (hours < 3) {
        return res
          .status(403)
          .json({
            message: "User has already taken a meal in the last 3 hours.",
          });
      }
    }



    const meal = new Meal({ user: userId });
    await meal.save();

    const user = await User.findById(userId);

    res
      .status(200)
      .json({ message: "Meal verified successfully.", user: user.name });
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
