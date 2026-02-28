import dbConnect from '@/lib/mongodb';
import Habit from '@/models/Habit';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PENALTY_AMOUNT = 50; // $50 penalty per missed habit

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await dbConnect();
        const habits = await Habit.find({ userId: session.user.id }).lean();
        return NextResponse.json(habits);
    } catch (error) {
        console.error('[GET HABITS ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const { habitId, status } = await req.json();
        const habit = await Habit.findOne({ _id: habitId, userId: session.user.id });

        if (!habit) return NextResponse.json({ error: 'Habit not found' }, { status: 404 });

        // Prevent marking the same habit twice in one day
        if (habit.status) return NextResponse.json({ error: 'Already marked for today' }, { status: 400 });

        // Update streak and history
        if (status === 'completed') {
            habit.streak += 1;
            habit.history.push(true);
        } else if (status === 'missed') {
            habit.streak = 0;
            habit.history.push(false);
        }

        // Always set the status so it can't be re-marked
        habit.status = status;
        await habit.save();

        // On miss → create penalty transactions
        if (status === 'missed') {
            const user = await User.findById(session.user.id).lean();
            const userName = user?.name || 'User';

            // 1. Transaction for the person who MISSED (they owe money - debit)
            await Transaction.create({
                userId: session.user.id,
                type: 'penalty',
                amount: PENALTY_AMOUNT,
                reason: `Missed habit: ${habit.name}`,
                from: userName,
                to: 'Accountability Partner',
                status: 'pending',
            });

            // 2. Transaction for the PARTNER (they RECEIVE money - shown as incoming)
            if (user?.partnerId) {
                const partnerIdStr = user.partnerId.toString();
                await Transaction.create({
                    userId: partnerIdStr,       // ← partner's ID so it appears in THEIR ledger
                    type: 'reward',             // partner earns the penalty money
                    amount: PENALTY_AMOUNT,
                    reason: `${userName} missed: ${habit.name}`,
                    from: userName,
                    to: 'You',
                    status: 'pending',
                });
            }
        }

        return NextResponse.json(habit);
    } catch (error) {
        console.error('[POST HABIT ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
