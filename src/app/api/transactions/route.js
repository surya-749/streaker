import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export async function GET() {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactions = await Transaction.find({ userId: session.user.id }).sort({ createdAt: -1 });
    return NextResponse.json(transactions);
}

export async function POST(req) {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId } = await req.json();
    const transaction = await Transaction.findOne({ _id: transactionId, userId: session.user.id });

    if (!transaction) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.status === 'confirmed') {
        return NextResponse.json({ error: 'Already confirmed' }, { status: 400 });
    }

    const user = await User.findById(session.user.id);

    if (transaction.type === 'reward') {
        user.walletBalance += transaction.amount;
    } else if (transaction.type === 'penalty') {
        // Already deducted if it was a penalty upon markMissed logic, 
        // but typically confirmation just moves it to confirmed status.
        // For this demo, let's just confirm it.
    }

    transaction.status = 'confirmed';
    await transaction.save();
    await user.save();

    return NextResponse.json({ transaction, walletBalance: user.walletBalance });
}
