import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await dbConnect();
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const transactions = await Transaction.find({ userId: session.user.id }).sort({ createdAt: -1 }).lean();
        return NextResponse.json(transactions);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { transactionId } = await req.json();
        const transaction = await Transaction.findOne({ _id: transactionId, userId: session.user.id });

        if (!transaction) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        if (transaction.status === 'confirmed') return NextResponse.json({ error: 'Already confirmed' }, { status: 400 });

        transaction.status = 'confirmed';
        await transaction.save();

        // Update user totals
        const user = await User.findById(session.user.id);
        if (transaction.type === 'penalty') {
            user.totalSpent = (user.totalSpent || 0) + transaction.amount;
        } else if (transaction.type === 'reward') {
            user.totalEarned = (user.totalEarned || 0) + transaction.amount;
        }
        await user.save();

        return NextResponse.json({
            transaction,
            totalEarned: user.totalEarned || 0,
            totalSpent: user.totalSpent || 0,
        });
    } catch (error) {
        console.error('[POST TRANSACTION ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
