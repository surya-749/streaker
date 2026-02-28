import mongoose from 'mongoose';

const PartnerRequestSchema = new mongoose.Schema({
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending',
    },
}, { timestamps: true });

// One pending request per pair
PartnerRequestSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });

export default mongoose.models.PartnerRequest || mongoose.model('PartnerRequest', PartnerRequestSchema);
