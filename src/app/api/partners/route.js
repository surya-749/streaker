import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import PartnerRequest from '@/models/PartnerRequest';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// Serialize a lean doc's ObjectIds to strings
function serialize(doc) {
    if (!doc) return null;
    return JSON.parse(JSON.stringify(doc, (key, val) => {
        if (val && typeof val === 'object' && val._bsontype === 'ObjectId') {
            return val.toString();
        }
        return val;
    }));
}

// Search by username, email, OR name (all case-insensitive)
async function findTargetUser(query) {
    const q = query.trim().replace(/^@/, '');
    const db = mongoose.connection.db;
    return await db.collection('users').findOne({
        $or: [
            { username: { $regex: `^${q}$`, $options: 'i' } },
            { email: { $regex: `^${q}$`, $options: 'i' } },
            { name: { $regex: `^${q}$`, $options: 'i' } },
        ]
    });
}

// GET: fetch partner info + pending requests
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();

        const me = await User.findById(session.user.id)
            .populate('partnerId', 'name username avatarSeed')
            .lean();

        const incoming = await PartnerRequest.find({ toUserId: session.user.id, status: 'pending' })
            .populate('fromUserId', 'name username avatarSeed')
            .lean();

        const outgoing = await PartnerRequest.find({ fromUserId: session.user.id, status: 'pending' })
            .populate('toUserId', 'name username avatarSeed')
            .lean();

        // Serialize all ObjectIds to plain strings so React gets clean data
        return NextResponse.json({
            partner: serialize(me?.partnerId) || null,
            incoming: incoming.map(r => ({
                ...serialize(r),
                _id: r._id.toString(),  // ensure _id is always a plain string
            })),
            outgoing: outgoing.map(r => ({
                ...serialize(r),
                _id: r._id.toString(),
            })),
        });
    } catch (error) {
        console.error('[GET PARTNERS ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: send a partner request by username, email, or name
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const query = (body.username || '').trim();
        if (!query) return NextResponse.json({ error: 'Username, email, or name required' }, { status: 400 });

        const target = await findTargetUser(query);
        if (!target) {
            return NextResponse.json({
                error: `No user found matching "${query}". Try their username, email, or full name.`
            }, { status: 404 });
        }

        const targetId = target._id.toString();
        if (targetId === session.user.id) {
            return NextResponse.json({ error: 'You cannot partner with yourself' }, { status: 400 });
        }

        const me = await User.findById(session.user.id).lean();
        if (me.partnerId) return NextResponse.json({ error: 'You already have an accountability partner' }, { status: 400 });
        if (target.partnerId) return NextResponse.json({ error: 'That user already has a partner' }, { status: 400 });

        const existing = await PartnerRequest.findOne({
            $or: [
                { fromUserId: session.user.id, toUserId: targetId },
                { fromUserId: targetId, toUserId: session.user.id },
            ],
            status: 'pending',
        });
        if (existing) return NextResponse.json({ error: 'A pending request already exists between you two' }, { status: 400 });

        const request = await PartnerRequest.create({
            fromUserId: session.user.id,
            toUserId: targetId,
        });

        const displayName = target.username ? `@${target.username}` : target.name;
        return NextResponse.json({
            message: `Partner request sent to ${displayName}!`,
            request: { ...serialize(request.toObject()), _id: request._id.toString() },
        }, { status: 201 });
    } catch (error) {
        console.error('[POST PARTNER ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: remove current partner
export async function DELETE() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await dbConnect();
        const me = await User.findById(session.user.id);
        if (me?.partnerId) {
            await User.findByIdAndUpdate(me.partnerId, { partnerId: null });
            me.partnerId = null;
            await me.save();
        }
        return NextResponse.json({ message: 'Partner removed' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
