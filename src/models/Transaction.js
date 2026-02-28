import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['penalty', 'reward'], required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    status: { type: String, enum: ['pending', 'confirmed'], default: 'pending' },
}, { timestamps: true });

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
