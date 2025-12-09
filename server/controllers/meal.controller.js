import { now } from "mongoose";
import Meal from "../models/meal.model.js";
import User from "../models/user.model.js";
import Vendor from "../models/vendor.model.js";
import VendorSelection from "../models/vendorselectform.model.js";
import jwt from "jsonwebtoken";

function returnMealTypeByHour() {
  const nowtime = new Date();
  const istTime = new Date(nowtime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const indianHours = istTime.getHours();
  
  if (indianHours >= 7 && indianHours < 10) {
    return "breakfast";
  } else if (indianHours >= 12 && indianHours < 15) {
    return "lunch";
  } else if (indianHours >= 19 && indianHours < 22) {
    return "dinner";
  } else {
    // Return null for invalid meal time - callers should handle this
    return null;
  }
}


export const generateQR = async (req, res) => {
  try {
    const userId = req.user._id;
    const nowtime = new Date();
    const istTime = new Date(nowtime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));


    const month = now().getMonth();
    const year = now().getFullYear(); 
    const hours = now().getHours();

    const indianHours = istTime.getHours();
    let mealType;
    if(indianHours >=7 && indianHours <10){
      mealType = "breakfast";
    }else if(indianHours >=12 && indianHours <15){
      mealType = "lunch";
    }else if(indianHours >=19 && indianHours <22){
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
    console.log("qr generated for " + req.user.name + " for vendor " + selection.vendor.name);
    if(selection.vendor.mealsOptions && !selection.vendor.mealsOptions[mealType]==true){
      return res
        .status(403)
        .json({ message: `Vendor does not offer ${mealType}.` });
    }

    

    const startOfDay = new Date(now().getFullYear(), now().getMonth(), now().getDate());
    const endOfDay = new Date(now().getFullYear(), now().getMonth(), now().getDate() + 1);
    const date = new Date();
    const currentMeal = await Meal.findOne({
      forUser: userId,
      mealType,
      date: { $gte: startOfDay, $lt: endOfDay },
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
    const nowtime = new Date();
    const istTime = new Date(nowtime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

    const hours = now().getHours();
    const indianHours = istTime.getHours();
    let mealType;
    if(indianHours >=7 && indianHours <10){
      mealType = "breakfast";
    }else if(indianHours >=12 && indianHours <15){
      mealType = "lunch";
    }else if(indianHours >=19 && indianHours <22){
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
    const byUserId = req.user._id;
    
    const { token, vendorId } = req.body;
    const nowtime = new Date();
    const istTime = new Date(nowtime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const forUserId = decoded.userId;
    const userVendorId = decoded.vendorId;

    // const userVendor = await Vendor.findById(userVendorId);
    // console.log("Decoded vendorId:", userVendorId);
    // console.log("Provided vendorId:", vendorId);

    const isVendorAuthorized = Array.isArray(vendorId)
      ? vendorId.includes(userVendorId.toString())
      : userVendorId.toString() === vendorId.toString();
      console.log("info",vendorId, userVendorId, isVendorAuthorized);

    if (!isVendorAuthorized) {
      return res.status(403).json({ message: "This student is not assigned to your vendor." });
    }

    // const hours = now().getHours();
    const indianHours = istTime.getHours();
    let mealType;
    if(indianHours >=7 && indianHours <10){
      mealType = "breakfast";
    }else if(indianHours >=12 && indianHours <15){
      mealType = "lunch";
    }else if(indianHours >=19 && indianHours <22){
      mealType = "dinner";
    }else{
      return res.status(403).json({ message: "Wrong meal time." });
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
      byUser: byUserId,
      mealType,
    });

    await meal.save();
    
    const foruser = await User.findById(forUserId);
    console.log("meal verified for", foruser["name"]);

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
