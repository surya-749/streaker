'use client';

import { useStreaker } from '@/context/StreakerContext';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const colorMap = {
  'accent-blue': { hex: '#2463eb', bg: 'rgba(36,99,235,0.13)', border: 'rgba(36,99,235,0.28)' },
  'accent-purple': { hex: '#7c3aed', bg: 'rgba(124,58,237,0.13)', border: 'rgba(124,58,237,0.28)' },
  'accent-green': { hex: '#10b981', bg: 'rgba(16,185,129,0.13)', border: 'rgba(16,185,129,0.28)' },
  'accent-red': { hex: '#ef4444', bg: 'rgba(239,68,68,0.13)', border: 'rgba(239,68,68,0.28)' },
};
const getC = k => colorMap[k] || colorMap['accent-blue'];

function MiniHeatmap({ history = [], colorKey }) {
  const c = getC(colorKey);
  const cells = [...Array(14).fill(null), ...history].slice(-14);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
      {cells.map((v, i) => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: 3,
          background: v === true ? c.hex : v === false ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.05)',
          boxShadow: v === true ? `0 0 4px ${c.hex}80` : 'none'
        }} />
      ))}
    </div>
  );
}

function HabitCard({ habit }) {
  const { markHabitStatus } = useStreaker();
  const c = getC(habit.color);
  const done = habit.status === 'completed';
  const missed = habit.status === 'missed';
  const pct = habit.history?.length ? Math.round((habit.history.filter(Boolean).length / habit.history.length) * 100) : 0;

  return (
    <div className="flex flex-col rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: 'rgba(255,255,255,0.02)', border: `1px solid ${done ? c.border : 'rgba(255,255,255,0.06)'}`,
        boxShadow: done ? `0 0 30px ${c.bg}` : '0 4px 20px rgba(0,0,0,0.25)'
      }}>
      <div style={{ height: 3, background: done ? c.hex : 'rgba(255,255,255,0.05)', transition: 'background 0.4s' }} />
      <div className="p-5 flex flex-col gap-4 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
              style={{ background: done ? c.bg : 'rgba(255,255,255,0.05)', border: `1px solid ${done ? c.border : 'rgba(255,255,255,0.08)'}` }}>
              {habit.icon}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-sm leading-tight truncate">{habit.name}</h3>
              <p className="text-white/30 text-xs mt-0.5 line-clamp-2">{habit.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl shrink-0"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <span className="text-base" style={{ filter: 'drop-shadow(0 0 5px rgba(239,68,68,0.7))' }}>🔥</span>
            <span className="text-white font-black text-sm">{habit.streak}</span>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] text-white/20 uppercase tracking-widest font-semibold mb-1.5">14-Day</p>
            <MiniHeatmap history={habit.history} colorKey={habit.color} />
          </div>
          <div className="text-right">
            <p className="text-[9px] text-white/20 uppercase tracking-widest font-semibold mb-1">Rate</p>
            <p className="text-lg font-black" style={{ color: done ? c.hex : 'rgba(255,255,255,0.3)' }}>{pct}%</p>
          </div>
        </div>

        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: c.hex, boxShadow: `0 0 6px ${c.hex}80` }} />
        </div>

        {!done && !missed ? (
          <div className="flex gap-2">
            <button onClick={() => markHabitStatus(habit._id, 'completed')}
              className="flex-1 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
              style={{ background: c.bg, color: c.hex, border: `1px solid ${c.border}` }}
              onMouseEnter={e => { e.currentTarget.style.background = c.hex; e.currentTarget.style.color = '#000'; }}
              onMouseLeave={e => { e.currentTarget.style.background = c.bg; e.currentTarget.style.color = c.hex; }}>
              ✓ Done
            </button>
            <button onClick={() => markHabitStatus(habit._id, 'missed')}
              className="flex-1 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
              style={{ background: 'rgba(239,68,68,0.07)', color: 'rgba(239,68,68,0.45)', border: '1px solid rgba(239,68,68,0.12)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; e.currentTarget.style.color = 'rgba(239,68,68,0.45)'; }}>
              ✕ Miss
            </button>
          </div>
        ) : (
          <div className="py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider text-center"
            style={{
              background: done ? c.bg : 'rgba(239,68,68,0.1)', color: done ? c.hex : '#ef4444',
              border: `1px solid ${done ? c.border : 'rgba(239,68,68,0.2)'}`
            }}>
            {done ? `✓ Done · ${habit.streak}-day streak 🔥` : '✕ Missed today'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const { totalEarned, totalSpent, habits, transactions, partner, loading, confirmTransaction } = useStreaker();
  const router = useRouter();
  const [dateStr, setDateStr] = useState('');

  useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);
  useEffect(() => {
    setDateStr(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
  }, []);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4" style={{ borderColor: 'rgba(255,255,255,0.05)' }} />
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" style={{ borderRightColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'transparent' }} />
        </div>
        <p className="text-white/25 text-xs font-semibold uppercase tracking-widest">Syncing streaks...</p>
      </div>
    );
  }

  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const completedToday = habits.filter(h => h.status === 'completed').length;
  const totalStreak = habits.reduce((s, h) => s + h.streak, 0);
  const pendingTx = transactions.filter(t => t.status === 'pending').length;
  const netPL = (totalEarned || 0) - (totalSpent || 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-white/25 text-xs font-medium">{dateStr}</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
            {greeting}, <span style={{ color: '#60a5fa' }}>{session?.user?.name?.split(' ')[0] ?? 'friend'}</span> 👋
          </h1>
          <p className="text-white/30 text-sm mt-1">
            {completedToday === habits.length && habits.length > 0 ? '🎉 All habits complete!' : `${completedToday}/${habits.length} done today`}
          </p>
        </div>
        {partner && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl self-start sm:self-auto"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <img src={`https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(partner.name)}&backgroundColor=7c3aed`}
              className="w-8 h-8 rounded-full" alt={partner.name} />
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Partner</p>
              <p className="text-sm font-bold text-white">{partner.name}</p>
            </div>
            <span className="w-2 h-2 rounded-full ml-1" style={{ background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
          </div>
        )}
      </div>

      {/* Stat bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: '🔥', label: 'Total Streak', value: `${totalStreak}d`, color: '#ef4444' },
          { icon: '💸', label: 'Spent', value: `$${(totalSpent || 0).toFixed(2)}`, color: '#ef4444' },
          { icon: '💰', label: 'Earned', value: `$${(totalEarned || 0).toFixed(2)}`, color: '#10b981' },
          { icon: '📊', label: 'Net P&L', value: `${netPL >= 0 ? '+' : ''}$${netPL.toFixed(2)}`, color: netPL >= 0 ? '#10b981' : '#ef4444' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl p-4 flex flex-col gap-1 transition-all hover:-translate-y-0.5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between">
              <span className="text-lg">{s.icon}</span>
              <span className="text-[9px] text-white/20 uppercase tracking-widest font-semibold">{s.label}</span>
            </div>
            <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Habits */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Your Habits</h2>
            <span className="text-[10px] text-white/25 uppercase tracking-widest font-semibold">Today</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {habits.map(habit => <HabitCard key={habit._id || habit.id} habit={habit} />)}
            <button className="flex flex-col items-center justify-center gap-3 rounded-3xl p-8 group transition-all"
              style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(36,99,235,0.3)'; e.currentTarget.style.background = 'rgba(36,99,235,0.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.01)'; }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-thin text-white/15 transition-colors group-hover:text-blue-400"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>+</div>
              <p className="text-white/20 text-xs font-semibold uppercase tracking-widest group-hover:text-white/40 transition-colors">Add Habit</p>
            </button>
          </div>
        </div>

        {/* Ledger */}
        <div className="space-y-4">
          <div className="rounded-3xl p-5 space-y-4"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Ledger</h2>
              {pendingTx > 0 && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider"
                  style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                  {pendingTx} pending
                </span>
              )}
            </div>
            <div className="space-y-2.5">
              {transactions.map(t => (
                <div key={t._id} className="rounded-2xl p-3.5 space-y-2.5 transition-opacity"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', opacity: t.status === 'confirmed' ? 0.35 : 1 }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold truncate">{t.reason}</p>
                      <p className="text-sm font-semibold text-white truncate mt-0.5">{t.from || '—'}</p>
                    </div>
                    <span className="text-sm font-black shrink-0" style={{ color: t.type === 'penalty' ? '#ef4444' : '#10b981' }}>
                      {t.type === 'penalty' ? '−' : '+'}${t.amount?.toFixed(2)}
                    </span>
                  </div>
                  {t.status === 'pending' && (
                    <button onClick={() => confirmTransaction(t._id)}
                      className="w-full py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98]"
                      style={{ background: 'rgba(36,99,235,0.1)', color: '#2463eb', border: '1px solid rgba(36,99,235,0.2)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#2463eb'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(36,99,235,0.1)'; e.currentTarget.style.color = '#2463eb'; }}>
                      Confirm →
                    </button>
                  )}
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="py-10 flex flex-col items-center gap-2">
                  <span className="text-3xl">🎯</span>
                  <p className="text-white/20 text-xs font-semibold">No transactions yet</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-[10px] text-white/25 font-semibold uppercase tracking-widest">Net P&L</span>
              <span className="text-base font-black" style={{ color: netPL >= 0 ? '#10b981' : '#ef4444' }}>
                {netPL >= 0 ? '+' : ''}${netPL.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="rounded-3xl p-4" style={{ background: 'rgba(36,99,235,0.05)', border: '1px solid rgba(36,99,235,0.12)' }}>
            <div className="flex items-center gap-2 mb-2"><span>💡</span><h3 className="text-xs font-bold text-white uppercase tracking-widest">Daily Tip</h3></div>
            <p className="text-white/35 text-xs leading-relaxed">Consistency beats intensity. A 1% improvement every day leads to 37× growth in a year.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
