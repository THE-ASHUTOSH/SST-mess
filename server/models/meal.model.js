import mongoose from "mongoose";

const mealSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 10800, // 3 hours in seconds
  },
});

const Meal = mongoose.model("Meal", mealSchema);

export default Meal;
