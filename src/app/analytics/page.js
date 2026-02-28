'use client';

import { useStreaker } from '@/context/StreakerContext';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const colorMap = {
    'accent-blue': { hex: '#2463eb', light: 'rgba(36,99,235,0.15)', border: 'rgba(36,99,235,0.3)' },
    'accent-purple': { hex: '#7c3aed', light: 'rgba(124,58,237,0.15)', border: 'rgba(124,58,237,0.3)' },
    'accent-green': { hex: '#10b981', light: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
    'accent-red': { hex: '#ef4444', light: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
};
const getColor = k => colorMap[k] || colorMap['accent-blue'];

// ─── Sparkline bar chart (30 columns) ────────────────────────────────────────
function Sparkline({ history = [], colorKey }) {
    const c = getColor(colorKey);
    const cells = [...Array(30).fill(null), ...history].slice(-30);
    const maxH = 28;
    return (
        <div className="flex items-end gap-[3px]" style={{ height: maxH }}>
            {cells.map((v, i) => (
                <div key={i} style={{
                    width: 6,
                    height: v === true ? maxH : v === false ? 10 : 4,
                    borderRadius: 3,
                    background: v === true ? c.hex : v === false ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.06)',
                    transition: 'height 0.3s',
                    boxShadow: v === true ? `0 0 4px ${c.hex}80` : 'none',
                    flexShrink: 0,
                }} />
            ))}
        </div>
    );
}

// ─── Donut chart using SVG ────────────────────────────────────────────────────
function DonutRing({ pct, color, size = 80, stroke = 8 }) {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        </svg>
    );
}

// ─── Week grid heatmap ────────────────────────────────────────────────────────
function WeekGrid({ history = [], colorKey }) {
    const c = getColor(colorKey);
    const cells = [...Array(49).fill(null), ...history].slice(-49); // 7 weeks × 7 days
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {cells.map((v, i) => (
                <div key={i} style={{
                    width: 12, height: 12, borderRadius: 3,
                    background: v === true ? c.hex : v === false ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.04)',
                    boxShadow: v === true ? `0 0 5px ${c.hex}60` : 'none',
                    transition: 'all 0.2s',
                }} />
            ))}
        </div>
    );
}

export default function Analytics() {
    const { data: session, status } = useSession();
    const { walletBalance, habits, transactions, loading } = useStreaker();
    const router = useRouter();
    const [activeHabit, setActiveHabit] = useState(null);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    useEffect(() => {
        if (habits.length > 0 && !activeHabit) setActiveHabit(habits[0]);
    }, [habits]);

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" style={{ borderRightColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'transparent' }} />
                </div>
                <p className="text-white/30 text-xs font-semibold uppercase tracking-widest">Crunching data...</p>
            </div>
        );
    }

    // ─── Derived stats ────────────────────────────
    const totalStreak = habits.reduce((s, h) => s + h.streak, 0);
    const avgStreak = habits.length ? Math.round(totalStreak / habits.length) : 0;
    const completedToday = habits.filter(h => h.status === 'completed').length;
    const totalDays = habits.reduce((s, h) => s + (h.history?.length ?? 0), 0);
    const totalGood = habits.reduce((s, h) => s + (h.history?.filter(Boolean).length ?? 0), 0);
    const overallRate = totalDays ? Math.round((totalGood / totalDays) * 100) : 0;

    const focus = activeHabit || habits[0] || null;
    const focusColor = focus ? getColor(focus.color) : getColor('accent-blue');
    const focusHistory = focus?.history ?? [];
    const focusRate = focusHistory.length ? Math.round((focusHistory.filter(Boolean).length / focusHistory.length) * 100) : 0;
    const focusBestStreak = focusHistory.reduce((best, v, i) => {
        if (!v) return best;
        const run = focusHistory.slice(0, i + 1).reverse().findIndex(x => !x);
        return Math.max(best, run < 0 ? i + 1 : run);
    }, 0) || focus?.streak || 0;

    const penaltyTotal = transactions.filter(t => t.type === 'penalty').reduce((s, t) => s + t.amount, 0);
    const rewardTotal = transactions.filter(t => t.type === 'reward').reduce((s, t) => s + t.amount, 0);

    return (
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

            {/* ── Page header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Analytics</h1>
                    <p className="text-white/30 text-sm mt-1">Your streak intelligence, at a glance</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold text-white/30"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
                    Live data
                </div>
            </div>

            {/* ── Top stat bar ── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { icon: '🔥', label: 'Total Streak', value: `${totalStreak}d`, color: '#ef4444' },
                    { icon: '📊', label: 'Avg Streak', value: `${avgStreak}d`, color: '#f59e0b' },
                    { icon: '✅', label: 'Overall Rate', value: `${overallRate}%`, color: '#10b981' },
                    { icon: '✓', label: 'Today', value: `${completedToday}/${habits.length}`, color: '#2463eb' },
                    { icon: '💰', label: 'Balance', value: `$${walletBalance?.toFixed(2) ?? '0.00'}`, color: '#10b981' },
                ].map((s, i) => (
                    <div key={i} className="rounded-2xl p-4 flex flex-col gap-1 transition-all hover:translate-y-[-1px]"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-base">{s.icon}</span>
                            <span className="text-[9px] text-white/20 uppercase tracking-widest font-semibold">{s.label}</span>
                        </div>
                        <p className="text-2xl font-black leading-none" style={{ color: s.color }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* ── Main grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Habit selector + detail ─────────────── */}
                <div className="lg:col-span-2 space-y-4">

                    {/* Habit selector tabs */}
                    <div className="flex gap-2 flex-wrap">
                        {habits.map(h => {
                            const c = getColor(h.color);
                            const isActive = activeHabit?._id === h._id || activeHabit?.id === h.id;
                            return (
                                <button key={h._id || h.id}
                                    onClick={() => setActiveHabit(h)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                                    style={{
                                        background: isActive ? c.light : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${isActive ? c.border : 'rgba(255,255,255,0.07)'}`,
                                        color: isActive ? c.hex : 'rgba(255,255,255,0.4)',
                                    }}>
                                    <span>{h.icon}</span>
                                    <span className="hidden sm:inline">{h.name}</span>
                                </button>
                            );
                        })}
                    </div>

                    {focus && (
                        <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${focusColor.border}` }}>
                            {/* Accent top bar */}
                            <div style={{ height: 3, background: focusColor.hex }} />

                            <div className="p-6 space-y-6">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
                                            style={{ background: focusColor.light, border: `1px solid ${focusColor.border}` }}>
                                            {focus.icon}
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black text-white">{focus.name}</h2>
                                            <p className="text-white/30 text-xs">{focus.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                                        <span style={{ filter: 'drop-shadow(0 0 5px rgba(239,68,68,0.8))' }}>🔥</span>
                                        <span className="text-white font-black text-xl">{focus.streak}</span>
                                    </div>
                                </div>

                                {/* KPIs row */}
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { label: 'Completion', value: `${focusRate}%`, color: focusColor.hex },
                                        { label: 'Best Streak', value: `${focusBestStreak}d`, color: '#ef4444' },
                                        { label: 'Total Logs', value: focusHistory.length, color: 'rgba(255,255,255,0.5)' },
                                    ].map((kpi, i) => (
                                        <div key={i} className="rounded-2xl p-4 text-center"
                                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <p className="text-[10px] text-white/20 uppercase tracking-widest font-semibold mb-2">{kpi.label}</p>
                                            <p className="text-2xl font-black" style={{ color: kpi.color }}>{kpi.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Sparkline */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs text-white/30 uppercase tracking-widest font-semibold">30-Day Activity</p>
                                        <div className="flex items-center gap-4 text-[10px] text-white/20 font-semibold">
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: focusColor.hex }} />Done</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-red-500/35" />Missed</span>
                                        </div>
                                    </div>
                                    <Sparkline history={focusHistory} colorKey={focus.color} />
                                </div>

                                {/* 7-week heatmap */}
                                <div>
                                    <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3">7-Week Heatmap</p>
                                    <WeekGrid history={focusHistory} colorKey={focus.color} />
                                </div>

                                {/* Progress bar */}
                                <div>
                                    <div className="flex justify-between text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-2">
                                        <span>Consistency Score</span>
                                        <span style={{ color: focusColor.hex }}>{focusRate}%</span>
                                    </div>
                                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                        <div className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${focusRate}%`, background: focusColor.hex, boxShadow: `0 0 8px ${focusColor.hex}80` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* All-habits comparison */}
                    {habits.length > 1 && (
                        <div className="rounded-3xl p-6 space-y-4"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <h2 className="text-sm font-bold text-white">Habit Comparison</h2>
                            <div className="space-y-3">
                                {[...habits].sort((a, b) => b.streak - a.streak).map(h => {
                                    const c = getColor(h.color);
                                    const pct = h.history?.length ? Math.round((h.history.filter(Boolean).length / h.history.length) * 100) : 0;
                                    return (
                                        <div key={h._id || h.id} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-2 text-white/60 font-medium">
                                                    <span>{h.icon}</span>{h.name}
                                                </span>
                                                <span className="font-bold" style={{ color: c.hex }}>{pct}%</span>
                                            </div>
                                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                                <div className="h-full rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%`, background: c.hex, boxShadow: `0 0 6px ${c.hex}60` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right sidebar ──────────────────────────── */}
                <div className="space-y-4">

                    {/* Donut rings */}
                    <div className="rounded-3xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <h2 className="text-sm font-bold text-white mb-5">Completion Rings</h2>
                        <div className="flex flex-col gap-5">
                            {habits.map(h => {
                                const c = getColor(h.color);
                                const pct = h.history?.length ? Math.round((h.history.filter(Boolean).length / h.history.length) * 100) : 0;
                                return (
                                    <div key={h._id || h.id} className="flex items-center gap-4">
                                        <div className="relative shrink-0">
                                            <DonutRing pct={pct} color={c.hex} size={52} stroke={6} />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-sm">{h.icon}</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-white truncate">{h.name}</p>
                                            <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mt-0.5">🔥 {h.streak}-day streak</p>
                                        </div>
                                        <span className="text-sm font-black" style={{ color: c.hex }}>{pct}%</span>
                                    </div>
                                );
                            })}
                            {habits.length === 0 && (
                                <p className="text-white/20 text-xs text-center py-4">No habits yet</p>
                            )}
                        </div>
                    </div>

                    {/* Financial summary */}
                    <div className="rounded-3xl p-6 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <h2 className="text-sm font-bold text-white">Financial Summary</h2>
                        <div className="space-y-3">
                            {[
                                { label: 'Penalties paid', value: `-$${penaltyTotal.toFixed(2)}`, color: '#ef4444', icon: '💸' },
                                { label: 'Rewards earned', value: `+$${rewardTotal.toFixed(2)}`, color: '#10b981', icon: '🎁' },
                                { label: 'Net P&L', value: `${rewardTotal - penaltyTotal >= 0 ? '+' : ''}$${(rewardTotal - penaltyTotal).toFixed(2)}`, color: rewardTotal - penaltyTotal >= 0 ? '#10b981' : '#ef4444', icon: '📊' },
                            ].map((row, i) => (
                                <div key={i} className="flex items-center justify-between py-2"
                                    style={{ borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                    <span className="flex items-center gap-2 text-xs text-white/40 font-medium">
                                        <span>{row.icon}</span>{row.label}
                                    </span>
                                    <span className="text-sm font-black" style={{ color: row.color }}>{row.value}</span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <span className="text-xs text-white/30 font-semibold uppercase tracking-widest">Current Balance</span>
                            <span className="text-lg font-black text-green-400">${walletBalance?.toFixed(2) ?? '0.00'}</span>
                        </div>
                    </div>

                    {/* Insight card */}
                    <div className="rounded-3xl p-5 space-y-3"
                        style={{ background: 'rgba(36,99,235,0.05)', border: '1px solid rgba(36,99,235,0.15)' }}>
                        <div className="flex items-center gap-2">
                            <span>🧠</span>
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Insight</h3>
                        </div>
                        <p className="text-white/40 text-xs leading-relaxed">
                            {overallRate >= 70
                                ? `Outstanding! You're in the top tier with a ${overallRate}% completion rate. Keep compounding your habits.`
                                : overallRate >= 40
                                    ? `Good progress. You're at ${overallRate}% overall — focus on your weakest habit to break through.`
                                    : `Every streak starts at 1. Your current rate is ${overallRate}%. Small wins compound into big changes.`}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
