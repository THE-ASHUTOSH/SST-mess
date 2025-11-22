import mongoose from "mongoose";

const mealSchema = new mongoose.Schema({
  forUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  byUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  mealType: {
    type: String,
    enum: ["breakfast", "lunch", "dinner"],
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
});

const Meal = mongoose.model("Meal", mealSchema);

export default Meal;
