import { now } from "mongoose";
import Meal from "../models/meal.model.js";
import User from "../models/user.model.js";
import Vendor from "../models/vendor.model.js";
import VendorSelection from "../models/vendorselectform.model.js";
import jwt from "jsonwebtoken";

export const generateQR = async (req, res) => {
  try {
    const userId = req.user._id;

    const month = now().getMonth();
    const year = now().getFullYear(); 

    const hours = now().getHours();
    let mealType;
    if(hours >=7 && hours <10){
      mealType = "breakfast";
    }else if(hours >=12 && hours <15){
      mealType = "lunch";
    }else if(hours >=19 && hours <22){
      mealType = "dinner";
    }else{
      return res.status(403).json({ message: "Wrong meal time." });
    }

    const selection = await VendorSelection.findOne({
      user: userId,
      forMonth: { $gte: new Date(year, month, 1), $lt: new Date(year, month + 1, 1) },
    });


    if (!selection) {
      return res
        .status(403)
        .json({ message: "Mess not opted in for this month." });
    }

    await selection.populate("vendor");
    console.log(selection.vendor.mealsOptions);
    if(selection.vendor.mealsOptions && !selection.vendor.mealsOptions[mealType]==true){
      return res
        .status(403)
        .json({ message: `Vendor does not offer ${mealType}.` });
    }

    

    // const startOfDay = new Date(now().getFullYear(), now().getMonth(), now().getDate());
    // const endOfDay = new Date(now().getFullYear(), now().getMonth(), now().getDate() + 1);
    const date = new Date();
    const currentMeal = await Meal.findOne({
      forUser: userId,
      mealType,
      date: date,
    });


    if (currentMeal) {
      return res
        .status(403)
        .json({ message: "You have already scanned for this meal." });
    }

    const token = jwt.sign({ userId, vendorId: selection.vendor._id}, process.env.JWT_SECRET_KEY, {
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

    const hours = now().getHours();
    let mealType;
    if(hours >=7 && hours <10){
      mealType = "breakfast";
    }else if(hours >=12 && hours <15){
      mealType = "lunch";
    }else if(hours >=19 && hours <22){
      mealType = "dinner";
    }else{
      return res.status(403).json({ message: "Wrong meal time." });
    }
    

    const startOfDay = new Date(now().getFullYear(), now().getMonth(), now().getDate());
    const endOfDay = new Date(now().getFullYear(), now().getMonth(), now().getDate() + 1);


    const meal = await Meal.findOne({
      forUser: userId,
      mealType,
      date: { $gte: startOfDay, $lt: endOfDay },
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
    const byUser = req.user._id;
    const { token, vendorId } = req.body;
    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const forUserId = decoded.userId;
    const userVendorId = decoded.vendorId;

    const userVendor = await Vendor.findById(userVendorId);
    console.log("Decoded vendorId:", userVendorId);
    console.log("Provided vendorId:", vendorId);

    if (userVendorId.toString() !== vendorId.toString()) {
      return res.status(403).json({ message: "This student is not assigned to your vendor." });
    }

    const hours = now().getHours();
    let mealType;
    if(hours >=7 && hours <10){
      mealType = "breakfast";
    }else if(hours >=12 && hours <15){
      mealType = "lunch";
    }else if(hours >=19 && hours <22){
      mealType = "dinner";
    }else{
      return res.status(403).json({ message: "Wrong meal time" });
    }

    const startOfDay = new Date(now().getFullYear(), now().getMonth(), now().getDate());
    const endOfDay = new Date(now().getFullYear(), now().getMonth(), now().getDate() + 1);

    const existingMeal = await Meal.findOne({
      forUser: forUserId,
      mealType,
      date: { $gte: startOfDay, $lt: endOfDay },
    });

    if (existingMeal) {
      return res
        .status(403)
        .json({ message: `User has already taken ${mealType} today.` });
    }

    const meal = new Meal({
      forUser: forUserId,
      byUser,
      mealType,
    });

    await meal.save();
    
    const foruser = await User.findById(forUserId);

    res
      .status(200)
      .json({ message: "Meal verified successfully.", user: foruser });
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
