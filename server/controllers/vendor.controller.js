import User from "../models/user.model.js";
import VendorSection from "../models/vendorselectform.model.js";
import VendorFeedback from "../models/vendorfeedbackform.model.js";
import Vendor from "../models/vendor.model.js";
import Menu from "../models/menu.model.js";
import generateMenu from "../utils/generateMenu.js";
async function vendorSelectionFrom(req, res) {
  const { name, room, vendor, user } = req.body;
  try {
    const student = user;
    const vendormod = await Vendor.findById(vendor);
    const vendorSection = await VendorSection.create({
      name,
      roomNo: room,
      vendor: vendormod,
      user: student,
    });
    res.status(200).json({ success: true, vendorSection });
  } catch (err) {
    res.status(400).json({ success: false, err });
  }
}

async function vendorFeedbackForm(req, res) {
  const { rating, vendor, feedback, user } = req.body;
  // console.log(vendor)
  try {
    const VendorFeedbackForm = await new VendorFeedback({
      rating,
      vendor,
      feedback,
      user,
    }).save();
    res.status(200).json({ success: true, VendorFeedbackForm });
  } catch (err) {
    res.status(400).json({ success: false, err });
  }
  // console.log({rating, vendor, feedback,user});
}

async function getVendors(req, res) {
  try {
    const vendors = await Vendor.find().populate("menu").lean();
    res.status(200).json({ success: true, vendor: vendors });
  } catch (err) {
    res.status(400).json({ success: false, err });
  }
}

async function addVendor(req, res) {
  const { name, description, price, menuUrl } = req.body;

  if (!name || !price || (!menuUrl && !req.file)) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const newVendor = new Vendor({
      name,
      description,
      price,
      menuUrl,
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
      return res
        .status(500)
        .json({ message: "Error processing menu file", menuError });
    }

    newVendor.menu = menuId;
    await newVendor.save();
    return res
      .status(201)
      .json({ message: "Vendor added successfully", vendor: newVendor });
  } catch (error) {
    return res.status(500).json({ message: "Error adding vendor", error });
  }finally{
    fs.unlinkSync(req.file.path);
  }
}

async function updateVendor(req, res) {
  const { id } = req.params;
  const { name, description, price, menuUrl } = req.body;

  if (!name || !price) {
    return res.status(400).json({ message: "Name and price are required" });
  }

  try {
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
        ...(menuId && { menu: menuId }),
      },
      { new: true }
    );
    return res
      .status(200)
      .json({ message: "Vendor updated successfully", vendor: updatedVendor });
  } catch (error) {
    return res.status(500).json({ message: "Error updating vendor", error });
  } finally {
    fs.unlinkSync(req.file.path);
  }
}

async function getChoiceAnalysis(req, res) {
  // Implementation for choice analysis
  try {
    const vendors = await Vendor.find().lean();
    const section = await VendorSection.find().populate("vendor").lean();
    const data = section.map((select) => {
      const vendor = vendors.find(
        (v) => v._id.toString() === select.vendor._id.toString()
      );
      return { ...select, vendor };
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, err });
  }
}

async function getFeedbackAnalysis(req, res) {
  // Implementation for feedback analysis
  try {
    const vendors = await Vendor.find().lean();
    const feedback = await VendorFeedback.find().populate("vendor").lean();
    const data = feedback.map((feed) => {
        if (!feed.vendor) {
            return { ...feed, vendor: null }; // or handle differently if needed
        }
        
        const vendor = vendors.find(
            (v) => v._id.toString() === feed.vendor._id.toString()
        );
        
        return { ...feed, vendor };
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, err });
  }
}

export {
  vendorSelectionFrom,
  vendorFeedbackForm,
  getVendors,
  addVendor,
  updateVendor,
  getChoiceAnalysis,
  getFeedbackAnalysis,
};
