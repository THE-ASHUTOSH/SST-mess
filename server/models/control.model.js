import mongoose from "mongoose";

const controlSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    enabled: {
        type: Boolean,
        default: false
    }
});

const Control = mongoose.model('Control', controlSchema);

export default Control;
