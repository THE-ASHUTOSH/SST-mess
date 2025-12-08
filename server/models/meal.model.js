import { text } from "body-parser";
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
    default: Date.now,
  },
});

mealSchema.index({ forUser: 1, mealType: "text", date: -1 }, { unique: true });

const Meal = mongoose.model("Meal", mealSchema);

export default Meal;
