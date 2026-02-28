import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, default: null },
    googleId: { type: String, default: null },
    avatarSeed: { type: String, default: null }, // used for DiceBear
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

UserSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password || !candidatePassword) return false;
    const bcrypt = await import('bcryptjs');
    return bcrypt.default.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model('User', UserSchema);
