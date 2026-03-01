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

function getTodayStr() {
    return new Date().toISOString().slice(0, 10); // "2026-03-01"
}
function getYesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
}
function isToday(date) {
    return new Date(date).toISOString().slice(0, 10) === getTodayStr();
}
// Returns all date strings from startStr (exclusive) to endStr (inclusive)
function getDaysBetween(startStr, endStr) {
    const days = [];
    const cur = new Date(startStr + 'T00:00:00Z');
    const end = new Date(endStr + 'T00:00:00Z');
    cur.setUTCDate(cur.getUTCDate() + 1);
    while (cur <= end) {
        days.push(cur.toISOString().slice(0, 10));
        cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return days;
}

// ── GET: list habits, auto-penalize unmarked habits from yesterday ──────────
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await dbConnect();

        const habits = await Habit.find({ userId: session.user.id });
        const todayStr = getTodayStr();
        const yesterdayStr = getYesterdayStr();
        const user = await User.findById(session.user.id).lean();
        const userName = user?.name || 'User';

        const result = [];

        for (const habit of habits) {
            // Backfill all missed days from lastPenaltyDate (or creation date) up to yesterday
            const habitCreatedDateStr = habit.createdAt.toISOString().slice(0, 10);
            const lastProcessedStr = habit.lastPenaltyDate || habitCreatedDateStr;

            if (lastProcessedStr < yesterdayStr) {
                const daysToProcess = getDaysBetween(lastProcessedStr, yesterdayStr);
                let needsSave = false;

                for (const dateStr of daysToProcess) {
                    // Skip days the user already manually marked (already pushed to history)
                    if (dateStr === habit.lastMarkedDate) continue;

                    // Missed day: record false in history and reset streak
                    habit.history.push(false);
                    habit.streak = 0;

                    // Issue penalty transaction
                    await Transaction.create({
                        userId: session.user.id,
                        type: 'penalty',
                        amount: PENALTY_AMOUNT,
                        reason: `Auto-penalty: missed ${habit.name} (${dateStr})`,
                        from: userName,
                        to: 'Accountability Partner',
                        status: 'pending',
                    });
                    if (user?.partnerId) {
                        await Transaction.create({
                            userId: user.partnerId.toString(),
                            type: 'reward',
                            amount: PENALTY_AMOUNT,
                            reason: `${userName} missed: ${habit.name} (${dateStr})`,
                            from: userName,
                            to: 'You',
                            status: 'pending',
                        });
                    }
                    needsSave = true;
                }

                if (needsSave) {
                    habit.lastPenaltyDate = yesterdayStr;
                    await habit.save();
                }
            }

            // Mask today's status if it was set on a previous day (daily reset)
            result.push({
                ...habit.toObject(),
                _id: habit._id.toString(),
                status: habit.status && isToday(habit.updatedAt) ? habit.status : null,
            });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('[GET HABITS ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ── POST: create habit OR mark habit status ────────────────────────────────
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

            const todayStr = getTodayStr();
            // Only block if already marked TODAY
            if (habit.lastMarkedDate === todayStr) {
                return NextResponse.json({ error: 'Already marked for today' }, { status: 400 });
            }

            if (status === 'completed') {
                habit.streak += 1;
                habit.history.push(true);
            } else if (status === 'missed') {
                habit.streak = 0;
                habit.history.push(false);
            }
            habit.status = status;
            habit.lastMarkedDate = todayStr;
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
            return NextResponse.json({ ...habit.toObject(), _id: habit._id.toString() });
        }

        // ── Route B: Create new habit (requires partner) ──
        const { name, description, icon, color } = body;
        if (!name) return NextResponse.json({ error: 'Habit name is required' }, { status: 400 });

        const user = await User.findById(session.user.id).lean();
        if (!user?.partnerId) {
            return NextResponse.json({ error: 'You need an accountability partner to add habits' }, { status: 403 });
        }

        // Create habit for current user only (individual, not shared)
        const habit = await Habit.create({
            userId: session.user.id,
            name: name.trim(),
            description: description?.trim() || '',
            icon: icon || '🎯',
            color: VALID_COLORS.includes(color) ? color : 'accent-blue',
            streak: 0,
            history: [],
        });

        return NextResponse.json({ ...habit.toObject(), _id: habit._id.toString() }, { status: 201 });
    } catch (error) {
        console.error('[POST HABIT ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ── DELETE: immediate individual delete ────────────────────────────────────
export async function DELETE(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await dbConnect();
        const { habitId } = await req.json();
        const result = await Habit.findOneAndDelete({ _id: habitId, userId: session.user.id });
        if (!result) return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
        return NextResponse.json({ message: 'Habit deleted', deleted: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
