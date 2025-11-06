import Vendor from "../models/vendor.model.js";

async function addVendor(req, res) {
  const { name, description, price, menu } = req.body;

  if (!name || !price || !menu) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const newVendor = new Vendor({ name, description, price, menu });
    await newVendor.save();
    return res
      .status(201)
      .json({ message: "Vendor added successfully", vendor: newVendor });
  } catch (error) {
    return res.status(500).json({ message: "Error adding vendor", error });
  }
}

async function updateVendor(req, res) {
  const { id } = req.params;
  const { name, description, price, menu } = req.body;

  if (!name || !price || !menu) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const updatedVendor = await Vendor.findByIdAndUpdate(
      id,
      { name, description, price, menu },
      { new: true }
    );
    return res
      .status(200)
      .json({ message: "Vendor updated successfully", vendor: updatedVendor });
  } catch (error) {
    return res.status(500).json({ message: "Error updating vendor", error });
  }
}
