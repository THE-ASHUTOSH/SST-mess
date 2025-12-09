import User from "../models/user.model.js";
import VendorSection from "../models/vendorselectform.model.js";
import VendorFeedback from "../models/vendorfeedbackform.model.js";
import Vendor from "../models/vendor.model.js";
import Menu from "../models/menu.model.js";
import generateMenu from "../utils/generateMenu.js";
import fs from "fs";

// async function vendorSelectionFrom(req, res) {
//   const { name, room, vendor, user } = req.body;
//   try {
//     const student = user;
//     const vendormod = await Vendor.findById(vendor);
//     const vendorSection = await VendorSection.create({
//       name,
//       roomNo: room,
//       vendor: vendormod,
//       user: student,
//     });
//     res.status(200).json({ success: true, vendorSection });
//   } catch (err) {
//     res.status(400).json({ success: false, err });
//   }
// }

async function vendorFeedbackForm(req, res) {
  const { ratings, vendor, feedback, user } = req.body;
  try {
    const VendorFeedbackForm = await new VendorFeedback({
      ratings,
      vendor,
      feedback,
      user,
    }).save();
    res.status(200).json({ success: true, VendorFeedbackForm });
  } catch (err) {
    console.error("Feedback submission error:", err);
    res.status(400).json({ success: false, message: "Failed to submit feedback" });
  }
}

async function getVendors(req, res) {
  try {
    const vendors = await Vendor.find().populate("menu").lean();
    res.status(200).json({ success: true, vendor: vendors });
  } catch (err) {
    console.error("Get vendors error:", err);
    res.status(400).json({ success: false, message: "Failed to fetch vendors" });
  }
}

async function addVendor(req, res) {
  const { name, description, price, menuUrl, mealsOptions } = req.body;

  if (!name || !price) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Validate JSON parsing for mealsOptions
    let parsedMealsOptions;
    if (mealsOptions) {
      try {
        parsedMealsOptions = JSON.parse(mealsOptions);
      } catch {
        return res.status(400).json({ message: "Invalid mealsOptions format - must be valid JSON" });
      }
    }
    
    const newVendor = new Vendor({
      name,
      description,
      price,
      menuUrl,
      mealsOptions: parsedMealsOptions,
    });

    let menuId = null;
    try {
      if (req.file) {
        const menuData = generateMenu(req.file.path);
        const newMenu = new Menu({
          ...menuData,
          vendor: newVendor._id,
        });
        await newMenu.save();
        menuId = newMenu._id;
      }
    } catch (menuError) {
      console.error("Menu processing error:", menuError);
      return res.status(500).json({ message: "Error processing menu file" });
    }

    newVendor.menu = menuId;
    await newVendor.save();
    return res
      .status(201)
      .json({ message: "Vendor added successfully", vendor: newVendor });
  } catch (error) {
    console.error("Add vendor error:", error);
    return res.status(500).json({ message: "Error adding vendor" });
  } finally {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
  }
}

async function updateVendor(req, res) {
  const { id } = req.params;
  const { name, description, price, menuUrl, mealsOptions } = req.body;

  if (!name || !price) {
    return res.status(400).json({ message: "Name and price are required" });
  }

  try {
    // Validate JSON parsing for mealsOptions
    let parsedMealsOptions;
    if (mealsOptions) {
      try {
        parsedMealsOptions = JSON.parse(mealsOptions);
      } catch {
        return res.status(400).json({ message: "Invalid mealsOptions format - must be valid JSON" });
      }
    }

    let menuId = null;
    if (req.file) {
      const menuData = generateMenu(req.file.path);
      const updatedMenu = await Menu.findOneAndUpdate(
        { vendor: id },
        { ...menuData, vendor: id },
        { new: true, upsert: true }
      );
      menuId = updatedMenu._id;
    }

    const updatedVendor = await Vendor.findByIdAndUpdate(
      id,
      {
        name,
        description,
        price,
        menuUrl,
        ...(parsedMealsOptions && { mealsOptions: parsedMealsOptions }),
        ...(menuId && { menu: menuId }),
      },
      { new: true }
    );
    return res
      .status(200)
      .json({ message: "Vendor updated successfully", vendor: updatedVendor });
  } catch (error) {
    console.error("Update vendor error:", error);
    return res.status(500).json({ message: "Error updating vendor" });
  } finally {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
  }
}

async function getChoiceAnalysis(req, res) {
  try {
    let { month, year } = req.body; // month is 1-indexed

    if (month === undefined || year === undefined) {
      const today = new Date();
      month = today.getMonth() + 1; // 1-indexed
      year = today.getFullYear();
    }

    // month-1 because Date object is 0-indexed for months
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const section = await VendorSection.find({
      forMonth: {
        $gte: startDate,
        $lt: endDate,
      },
    }).populate("vendor").lean();

    res.status(200).json({ success: true, data: section });
  } catch (err) {
    res.status(400).json({ success: false, err: err.message });
  }
}

async function getFeedbackAnalysis(req, res) {
  try {
    const vendors = await Vendor.find().lean();
    const feedback = await VendorFeedback.find().populate("vendor").lean();
    const data = feedback.map((feed) => {
        if (!feed.vendor) {
            return { ...feed, vendor: null };
        }
        
        const vendor = vendors.find(
            (v) => v._id.toString() === feed.vendor._id.toString()
        );
        
        return { ...feed, vendor };
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Feedback analysis error:", err);
    res.status(400).json({ success: false, message: "Failed to fetch feedback analysis" });
  }
}

export {
  // vendorSelectionFrom,
  vendorFeedbackForm,
  getVendors,
  addVendor,
  updateVendor,
  getChoiceAnalysis,
  getFeedbackAnalysis,
};
