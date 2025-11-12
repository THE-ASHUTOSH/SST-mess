import mongoose from 'mongoose';

const mealSchema = new mongoose.Schema({
    breakfast: [{ type: String, trim: true }],
    lunch: [{ type: String, trim: true }],
    dinner: [{ type: String, trim: true }]
}, { _id: false });

const menuSchema = new mongoose.Schema({
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true,
        unique: true
    },
    monday: mealSchema,
    tuesday: mealSchema,
    wednesday: mealSchema,
    thursday: mealSchema,
    friday: mealSchema,
    saturday: mealSchema,
    sunday: mealSchema
}, { timestamps: true });

const Menu = mongoose.model('Menu', menuSchema);

export default Menu;
