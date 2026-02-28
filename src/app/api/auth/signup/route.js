import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Habit from '@/models/Habit';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function generateUsername(name) {
    const base = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${base}${suffix}`;
}

export async function POST(request) {
    try {
        await dbConnect();
        const body = await request.json();
        const { name, email, password } = body;

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate unique username
        let username = generateUsername(name);
        let attempts = 0;
        while (await User.findOne({ username }) && attempts < 10) {
            username = generateUsername(name);
            attempts++;
        }

        const avatarSeed = `${name.toLowerCase().replace(/\s/g, '')}-${Date.now()}`;

        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase(),
            password: hashedPassword,
            username,
            avatarSeed,
        });

        // Create 3 default habits
        await Habit.insertMany([
            { userId: user._id, name: 'Morning 5km Run', description: 'Run at least 5km before 9:00 AM.', streak: 0, icon: '🏃', color: 'accent-blue', history: [] },
            { userId: user._id, name: 'Mindful Meditation', description: '15 minutes of guided meditation daily.', streak: 0, icon: '🧘', color: 'accent-purple', history: [] },
            { userId: user._id, name: 'Read 20 Pages', description: 'Read at least 20 pages of a book daily.', streak: 0, icon: '📖', color: 'accent-green', history: [] },
        ]);

        return NextResponse.json({ message: 'Account created successfully!', username }, { status: 201 });
    } catch (error) {
        console.error('[SIGNUP ERROR]', error.message, error.stack);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
