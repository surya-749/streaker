'use client';

import { useStreaker } from '@/context/StreakerContext';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const colorMap = {
    'accent-blue': { hex: '#2463eb', bg: 'rgba(36,99,235,0.12)', border: 'rgba(36,99,235,0.25)' },
    'accent-purple': { hex: '#7c3aed', bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.25)' },
    'accent-green': { hex: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
    'accent-red': { hex: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' },
};
const getC = k => colorMap[k] || colorMap['accent-blue'];

function getAvatarUrl(seed, size = 80) {
    return `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(seed || 'default')}&size=${size}&backgroundColor=0f1117&shapeColor=2463eb`;
}

function MiniHeatmap({ history = [], colorKey }) {
    const c = getC(colorKey);
    const cells = [...Array(28).fill(null), ...history].slice(-28);
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
            {cells.map((v, i) => (
                <div key={i} style={{
                    width: 10, height: 10, borderRadius: 3,
                    background: v === true ? c.hex : v === false ? 'rgba(239,68,68,0.28)' : 'rgba(255,255,255,0.04)',
                    boxShadow: v === true ? `0 0 4px ${c.hex}70` : 'none'
                }} />
            ))}
        </div>
    );
}

export default function Profile() {
    const { data: session, status } = useSession();
    const { totalEarned, totalSpent, habits, transactions, partner, partnerRequests,
        userProfile, loading, sendPartnerRequest, respondToPartnerRequest, removePartner } = useStreaker();
    const router = useRouter();

    const [partnerInput, setPartnerInput] = useState('');
    const [partnerMsg, setPartnerMsg] = useState(null); // { ok, text }
    const [partnerLoading, setPartnerLoading] = useState(false);

    useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
                <div className="relative w-14 h-14">
                    <div className="absolute inset-0 rounded-full border-4" style={{ borderColor: 'rgba(255,255,255,0.05)' }} />
                    <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 animate-spin"
                        style={{ borderRightColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'transparent' }} />
                </div>
                <p className="text-white/25 text-xs font-semibold uppercase tracking-widest">Loading profile...</p>
            </div>
        );
    }

    const name = session?.user?.name || 'Streaker';
    const avatarSeed = userProfile?.avatarSeed || session?.user?.name || 'default';
    const totalStreak = habits.reduce((s, h) => s + h.streak, 0);
    const bestHabit = habits.reduce((b, h) => (!b || h.streak > b.streak) ? h : b, null);
    const netPL = (totalEarned || 0) - (totalSpent || 0);

    const handleSendRequest = async (e) => {
        e.preventDefault();
        if (!partnerInput.trim()) return;
        setPartnerLoading(true);
        setPartnerMsg(null);
        const res = await sendPartnerRequest(partnerInput);
        setPartnerMsg({ ok: res.ok, text: res.message });
        setPartnerLoading(false);
        if (res.ok) setPartnerInput('');
    };

    const handleRespond = async (reqId, action) => {
        setPartnerLoading(true);
        const res = await respondToPartnerRequest(reqId, action);
        setPartnerMsg({ ok: res.ok, text: res.message });
        setPartnerLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8 space-y-5">

            {/* ── Hero card ── */}
            <div className="relative rounded-3xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(124,58,237,0.07)', filter: 'blur(80px)', pointerEvents: 'none' }} />
                <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">

                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden"
                            style={{ border: '3px solid rgba(255,255,255,0.1)', background: '#0f1117' }}>
                            {session?.user?.image
                                ? <img src={session.user.image} alt={name} className="w-full h-full object-cover" />
                                : <img src={getAvatarUrl(avatarSeed, 200)} alt={name} className="w-full h-full object-cover" />
                            }
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2"
                            style={{ background: '#10b981', borderColor: '#050507' }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center sm:text-left space-y-3 min-w-0">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{name}</h1>
                            {userProfile?.username && (
                                <p className="text-white/30 text-sm font-semibold mt-0.5">@{userProfile.username}</p>
                            )}
                            <p className="text-white/20 text-xs mt-1">{session?.user?.email}</p>
                        </div>
                        {/* Badges */}
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                                style={{ background: 'rgba(239,68,68,0.1)', color: 'rgba(239,68,68,0.9)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                🔥 {totalStreak}d streak
                            </span>
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                                style={{ background: netPL >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: netPL >= 0 ? '#10b981' : '#ef4444', border: `1px solid ${netPL >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                                📊 {netPL >= 0 ? '+' : ''}${netPL.toFixed(2)} net
                            </span>
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                                style={{ background: 'rgba(36,99,235,0.1)', color: '#60a5fa', border: '1px solid rgba(36,99,235,0.2)' }}>
                                🎯 {habits.length} habits
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Stats row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { icon: '💸', label: 'Spent', value: `$${(totalSpent || 0).toFixed(2)}`, color: '#ef4444' },
                    { icon: '💰', label: 'Earned', value: `$${(totalEarned || 0).toFixed(2)}`, color: '#10b981' },
                    { icon: '🔥', label: 'Best Streak', value: `${bestHabit?.streak ?? 0}d`, color: '#f59e0b' },
                    { icon: '✓', label: 'Habits', value: habits.length, color: '#2463eb' },
                ].map((s, i) => (
                    <div key={i} className="rounded-2xl p-4 transition-all hover:-translate-y-0.5"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xl">{s.icon}</span>
                            <span className="text-[9px] text-white/20 uppercase tracking-widest font-semibold">{s.label}</span>
                        </div>
                        <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Main grid: Partner + Habits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* ── Partner section ── */}
                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-white">Accountability Partner</h2>

                    {/* Current partner */}
                    {partner ? (
                        <div className="rounded-3xl p-5 space-y-4"
                            style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0"
                                    style={{ border: '2px solid rgba(16,185,129,0.3)', background: '#0f1117' }}>
                                    <img src={getAvatarUrl(partner.avatarSeed || partner.name, 100)} alt={partner.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-white">{partner.name}</p>
                                    {partner.username && <p className="text-xs text-white/40 font-semibold">@{partner.username}</p>}
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 5px #10b981' }} />
                                        <span className="text-xs text-green-400 font-semibold">Active partner</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={removePartner}
                                className="w-full py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all"
                                style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}>
                                Remove Partner
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Send request */}
                            <div className="rounded-3xl p-5 space-y-4"
                                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <div>
                                    <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-1">Add Partner</h3>
                                    <p className="text-white/30 text-xs">Enter their @username to send a request</p>
                                </div>
                                <form onSubmit={handleSendRequest} className="flex gap-2">
                                    <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <span className="text-white/30 text-sm font-bold shrink-0">@</span>
                                        <input type="text" value={partnerInput} onChange={e => setPartnerInput(e.target.value)}
                                            placeholder="username"
                                            className="flex-1 bg-transparent text-white text-sm font-medium placeholder-white/20 outline-none" />
                                    </div>
                                    <button type="submit" disabled={partnerLoading || !partnerInput.trim()}
                                        className="px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shrink-0 disabled:opacity-40"
                                        style={{ background: '#2463eb', color: '#fff' }}>
                                        {partnerLoading ? '...' : 'Send →'}
                                    </button>
                                </form>
                                {partnerMsg && (
                                    <p className="text-xs font-semibold px-3 py-2 rounded-xl"
                                        style={{
                                            background: partnerMsg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                            color: partnerMsg.ok ? '#10b981' : '#ef4444',
                                            border: `1px solid ${partnerMsg.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
                                        }}>
                                        {partnerMsg.text}
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    {/* Incoming requests */}
                    {(partnerRequests?.incoming?.length ?? 0) > 0 && (
                        <div className="rounded-3xl p-5 space-y-3"
                            style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.2)' }}>
                            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#f59e0b' }}>
                                🔔 Incoming Requests ({partnerRequests.incoming.length})
                            </h3>
                            {partnerRequests.incoming.map(req => (
                                <div key={req._id} className="flex items-center gap-3 p-3 rounded-2xl"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0"
                                        style={{ border: '1px solid rgba(255,255,255,0.1)', background: '#0f1117' }}>
                                        <img src={getAvatarUrl(req.fromUserId?.avatarSeed || req.fromUserId?.name, 80)} alt={req.fromUserId?.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{req.fromUserId?.name}</p>
                                        {req.fromUserId?.username && <p className="text-[10px] text-white/30">@{req.fromUserId.username}</p>}
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => handleRespond(req._id, 'accept')} disabled={partnerLoading}
                                            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                                            style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.3)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.15)'}>
                                            ✓
                                        </button>
                                        <button onClick={() => handleRespond(req._id, 'reject')} disabled={partnerLoading}
                                            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                                            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}>
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Outgoing requests */}
                    {(partnerRequests?.outgoing?.length ?? 0) > 0 && (
                        <div className="rounded-3xl p-5 space-y-3"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Pending Sent</h3>
                            {partnerRequests.outgoing.map(req => (
                                <div key={req._id} className="flex items-center gap-3 p-3 rounded-2xl"
                                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0" style={{ background: '#0f1117' }}>
                                        <img src={getAvatarUrl(req.toUserId?.avatarSeed || req.toUserId?.name, 72)} alt={req.toUserId?.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">{req.toUserId?.name}</p>
                                        {req.toUserId?.username && <p className="text-[10px] text-white/30">@{req.toUserId.username}</p>}
                                    </div>
                                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-lg"
                                        style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                                        Pending
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Habit overview ── */}
                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-white">Habit Overview</h2>
                    <div className="rounded-3xl overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {habits.map((h, i) => {
                            const c = getC(h.color);
                            const pct = h.history?.length ? Math.round((h.history.filter(Boolean).length / h.history.length) * 100) : 0;
                            return (
                                <div key={h._id || h.id} className="px-5 py-4 space-y-3"
                                    style={{ borderBottom: i < habits.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                                            style={{ background: c.bg, border: `1px solid ${c.border}` }}>{h.icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold text-white truncate">{h.name}</p>
                                                <span className="flex items-center gap-1 shrink-0 ml-2">
                                                    <span className="text-sm" style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.6))' }}>🔥</span>
                                                    <span className="text-sm font-black text-white">{h.streak}</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c.hex }} />
                                                </div>
                                                <span className="text-[10px] font-black shrink-0" style={{ color: c.hex }}>{pct}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <MiniHeatmap history={h.history} colorKey={h.color} />
                                </div>
                            );
                        })}
                        {habits.length === 0 && (
                            <div className="py-12 flex flex-col items-center gap-3">
                                <span className="text-4xl">🌱</span>
                                <p className="text-white/20 text-sm font-semibold">No habits tracked yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
