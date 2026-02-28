import dbConnect from '@/lib/mongodb';
import Habit from '@/models/Habit';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PENALTY_AMOUNT = 50;

const VALID_COLORS = ['accent-blue', 'accent-purple', 'accent-green', 'accent-red'];

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await dbConnect();
        const habits = await Habit.find({ userId: session.user.id }).lean();
        return NextResponse.json(habits);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await dbConnect();

        const body = await req.json();

        // ── Route A: Mark habit status ──
        if (body.habitId && body.status) {
            const { habitId, status } = body;
            const habit = await Habit.findOne({ _id: habitId, userId: session.user.id });
            if (!habit) return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
            if (habit.status) return NextResponse.json({ error: 'Already marked for today' }, { status: 400 });

            if (status === 'completed') {
                habit.streak += 1;
                habit.history.push(true);
            } else if (status === 'missed') {
                habit.streak = 0;
                habit.history.push(false);
            }
            habit.status = status;
            await habit.save();

            if (status === 'missed') {
                const user = await User.findById(session.user.id).lean();
                const userName = user?.name || 'User';
                await Transaction.create({
                    userId: session.user.id,
                    type: 'penalty',
                    amount: PENALTY_AMOUNT,
                    reason: `Missed habit: ${habit.name}`,
                    from: userName,
                    to: 'Accountability Partner',
                    status: 'pending',
                });
                if (user?.partnerId) {
                    await Transaction.create({
                        userId: user.partnerId.toString(),
                        type: 'reward',
                        amount: PENALTY_AMOUNT,
                        reason: `${userName} missed: ${habit.name}`,
                        from: userName,
                        to: 'You',
                        status: 'pending',
                    });
                }
            }
            return NextResponse.json(habit);
        }

        // ── Route B: Create new habit ──
        const { name, description, icon, color } = body;
        if (!name) return NextResponse.json({ error: 'Habit name is required' }, { status: 400 });

        // Check user has a partner
        const user = await User.findById(session.user.id).lean();
        if (!user?.partnerId) {
            return NextResponse.json({ error: 'You need an accountability partner to add habits' }, { status: 403 });
        }

        const habit = await Habit.create({
            userId: session.user.id,
            name: name.trim(),
            description: description?.trim() || '',
            icon: icon || '🎯',
            color: VALID_COLORS.includes(color) ? color : 'accent-blue',
            streak: 0,
            history: [],
        });

        return NextResponse.json(habit, { status: 201 });
    } catch (error) {
        console.error('[POST HABIT ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await dbConnect();
        const { habitId } = await req.json();
        const result = await Habit.findOneAndDelete({ _id: habitId, userId: session.user.id });
        if (!result) return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
        return NextResponse.json({ message: 'Habit deleted' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
