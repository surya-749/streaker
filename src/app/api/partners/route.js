import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import PartnerRequest from '@/models/PartnerRequest';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Helper: find a user by username OR email (case-insensitive)
async function findTargetUser(query) {
    const q = query.toLowerCase().trim().replace(/^@/, ''); // strip leading @
    // Try username first, then email
    return await User.findOne({
        $or: [
            { username: q },
            { email: q },
        ]
    }).lean();
}

// GET: fetch my partner info + pending incoming requests
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const me = await User.findById(session.user.id).populate('partnerId', 'name username avatarSeed').lean();

        const incoming = await PartnerRequest.find({ toUserId: session.user.id, status: 'pending' })
            .populate('fromUserId', 'name username avatarSeed')
            .lean();

        const outgoing = await PartnerRequest.find({ fromUserId: session.user.id, status: 'pending' })
            .populate('toUserId', 'name username avatarSeed')
            .lean();

        return NextResponse.json({
            partner: me?.partnerId || null,
            incoming,
            outgoing,
        });
    } catch (error) {
        console.error('[GET PARTNERS ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: send a partner request by username OR email
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const query = (body.username || '').trim();
        if (!query) return NextResponse.json({ error: 'Username or email required' }, { status: 400 });

        const target = await findTargetUser(query);
        if (!target) {
            return NextResponse.json({ error: `No user found with username/email "${query}". Ask them to sign up first!` }, { status: 404 });
        }
        if (target._id.toString() === session.user.id) {
            return NextResponse.json({ error: 'You cannot partner with yourself' }, { status: 400 });
        }

        const me = await User.findById(session.user.id).lean();
        if (me.partnerId) return NextResponse.json({ error: 'You already have an accountability partner' }, { status: 400 });
        if (target.partnerId) return NextResponse.json({ error: `That user already has a partner` }, { status: 400 });

        // Check duplicate pending
        const existing = await PartnerRequest.findOne({
            $or: [
                { fromUserId: session.user.id, toUserId: target._id },
                { fromUserId: target._id, toUserId: session.user.id },
            ],
            status: 'pending',
        });
        if (existing) return NextResponse.json({ error: 'A pending request already exists between you two' }, { status: 400 });

        const request = await PartnerRequest.create({
            fromUserId: session.user.id,
            toUserId: target._id,
        });
        await request.populate('toUserId', 'name username avatarSeed');

        const displayName = target.username ? `@${target.username}` : target.name;
        return NextResponse.json({ message: `Partner request sent to ${displayName}!`, request }, { status: 201 });
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
        if (me.partnerId) {
            await User.findByIdAndUpdate(me.partnerId, { partnerId: null });
            me.partnerId = null;
            await me.save();
        }
        return NextResponse.json({ message: 'Partner removed' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
