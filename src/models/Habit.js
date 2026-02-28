import mongoose from 'mongoose';

const HabitSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    streak: { type: Number, default: 0 },
    status: { type: String, enum: ['completed', 'missed', null], default: null },
    icon: { type: String, default: '⚡' },
    color: { type: String, default: 'accent-blue' },
    history: { type: [Boolean], default: [] },
}, { timestamps: true });

export default mongoose.models.Habit || mongoose.model('Habit', HabitSchema);
