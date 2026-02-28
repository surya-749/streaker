import dbConnect from '@/lib/mongodb';
import Habit from '@/models/Habit';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const { habitId, status } = await req.json();
        const habit = await Habit.findOne({ _id: habitId, userId: session.user.id });

        if (!habit) {
            return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
        }

        if (habit.status) {
            return NextResponse.json({ error: 'Already marked for today' }, { status: 400 });
        }

        if (status === 'completed') {
            habit.streak += 1;
        } else if (status === 'missed') {
            habit.streak = 0;
        }

        habit.status = status;
        habit.history.push(status === 'completed');
        await habit.save();

        return NextResponse.json(habit);
    } catch (error) {
        console.error('[POST HABIT ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
