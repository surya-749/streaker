import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import PartnerRequest from '@/models/PartnerRequest';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// PATCH: accept or reject a partner request
export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized - no session' }, { status: 401 });
        }

        await dbConnect();
        const { id } = await params;
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        const { action } = body;

        if (!action || !['accept', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'action must be "accept" or "reject"' }, { status: 400 });
        }

        const partnerReq = await PartnerRequest.findById(id);
        if (!partnerReq) {
            return NextResponse.json({ error: `Request not found (id: ${id})` }, { status: 404 });
        }

        // Compare as strings
        const toId = partnerReq.toUserId.toString();
        const myId = session.user.id.toString();

        if (toId !== myId) {
            return NextResponse.json({
                error: `Not authorized. This request is for user ${toId}, but you are ${myId}`
            }, { status: 403 });
        }

        if (partnerReq.status !== 'pending') {
            return NextResponse.json({ error: `Request is already ${partnerReq.status}` }, { status: 400 });
        }

        if (action === 'accept') {
            partnerReq.status = 'accepted';
            await partnerReq.save();
            // Link both users as partners
            await User.findByIdAndUpdate(partnerReq.fromUserId, { partnerId: partnerReq.toUserId });
            await User.findByIdAndUpdate(partnerReq.toUserId, { partnerId: partnerReq.fromUserId });
            return NextResponse.json({ message: '🎉 Partner accepted! You are now accountability partners.' });
        } else {
            partnerReq.status = 'rejected';
            await partnerReq.save();
            return NextResponse.json({ message: 'Request declined.' });
        }
    } catch (error) {
        console.error('[PATCH PARTNER ERROR]', error.message, error.stack);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
