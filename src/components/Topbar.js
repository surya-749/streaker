'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStreaker } from '@/context/StreakerContext';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

const AUTH_PATHS = ['/login', '/signup'];

function getAvatar(user, size = 64) {
    if (user?.image) return user.image; // Google OAuth photo
    // Use avatarSeed (from JWT session) or fall back to name
    const seed = encodeURIComponent(user?.avatarSeed || user?.name || 'user');
    return `https://api.dicebear.com/8.x/thumbs/svg?seed=${seed}&size=${size}&backgroundColor=0f1117&shapeColor=2463eb`;
}

export default function Navbar() {
    const pathname = usePathname();
    const { totalEarned, totalSpent, partnerRequests } = useStreaker();
    const { data: session } = useSession();
    const [mobileOpen, setMobileOpen] = useState(false);

    if (AUTH_PATHS.includes(pathname)) return null;

    const navItems = [
        { name: 'Home', icon: '🏠', href: '/' },
        { name: 'Analytics', icon: '📊', href: '/analytics' },
        { name: 'Profile', icon: '👤', href: '/profile' },
    ];

    const pendingCount = partnerRequests?.incoming?.length ?? 0;
    const netBalance = (totalEarned || 0) - (totalSpent || 0);

    return (
        <>
            {/* ── Desktop / Mobile top bar ── */}
            <header className="h-14 border-b flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50"
                style={{ background: 'rgba(5,5,7,0.9)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.05)' }}>

                {/* Left: logo + desktop nav */}
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-2 shrink-0 group">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all"
                            style={{ background: 'rgba(36,99,235,0.12)', border: '1px solid rgba(36,99,235,0.2)' }}
                        >⚡</div>
                        <span className="text-lg font-black text-white tracking-tighter italic uppercase">Streaker</span>
                    </Link>

                    {session && (
                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map(item => (
                                <Link key={item.href} href={item.href}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                                    style={{
                                        background: pathname === item.href ? 'rgba(255,255,255,0.07)' : 'transparent',
                                        color: pathname === item.href ? '#fff' : 'rgba(255,255,255,0.35)',
                                    }}>
                                    <span>{item.icon}</span><span>{item.name}</span>
                                </Link>
                            ))}
                        </nav>
                    )}
                </div>

                {/* Right */}
                <div className="flex items-center gap-3">
                    {session ? (
                        <>
                            {/* Net balance pill — hidden on tiny screens */}
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <span className="text-white/30 font-semibold">Net</span>
                                <span className="font-black" style={{ color: netBalance >= 0 ? '#10b981' : '#ef4444' }}>
                                    {netBalance >= 0 ? '+' : ''}₹{netBalance.toFixed(2)}
                                </span>
                            </div>

                            {/* Notification bell for partner requests */}
                            <Link href="/profile" className="relative hidden md:flex">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <span className="text-white/40 text-base">🔔</span>
                                </div>
                                {pendingCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                                        style={{ background: '#ef4444' }}>{pendingCount}</span>
                                )}
                            </Link>

                            {/* Avatar + name */}
                            <div className="flex items-center gap-2.5" style={{ borderLeft: '1px solid rgba(255,255,255,0.07)', paddingLeft: '0.75rem' }}>
                                <div className="hidden sm:block text-right">
                                    <p className="text-xs font-bold text-white leading-tight">{session.user.name}</p>
                                    <button onClick={() => signOut({ callbackUrl: '/login' })}
                                        className="text-[10px] font-semibold transition-colors"
                                        style={{ color: 'rgba(239,68,68,0.5)' }}
                                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(239,68,68,0.5)'}
                                    >Sign out</button>
                                </div>
                                <Link href="/profile">
                                    <img src={getAvatar(session.user, 64)} alt={session.user.name}
                                        className="w-8 h-8 rounded-full object-cover"
                                        style={{ border: '2px solid rgba(255,255,255,0.1)' }} />
                                </Link>
                            </div>

                            {/* Mobile hamburger */}
                            <button onClick={() => setMobileOpen(!mobileOpen)}
                                className="md:hidden w-9 h-9 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <span className="w-4 h-px bg-white/60 block" style={{ transform: mobileOpen ? 'rotate(45deg) translate(2px, 2px)' : 'none', transition: 'all 0.2s' }} />
                                <span className="w-4 h-px bg-white/60 block" style={{ opacity: mobileOpen ? 0 : 1, transition: 'all 0.2s' }} />
                                <span className="w-4 h-px bg-white/60 block" style={{ transform: mobileOpen ? 'rotate(-45deg) translate(2px, -2px)' : 'none', transition: 'all 0.2s' }} />
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link href="/login" className="px-3 py-2 text-xs font-bold text-white/40 hover:text-white uppercase tracking-wider transition-colors">Log in</Link>
                            <Link href="/signup" className="px-4 py-2 text-xs font-bold text-white rounded-xl uppercase tracking-wider transition-all"
                                style={{ background: '#2463eb' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
                                onMouseLeave={e => e.currentTarget.style.background = '#2463eb'}>
                                Sign up
                            </Link>
                        </div>
                    )}
                </div>
            </header>

            {/* ── Mobile dropdown menu ── */}
            {mobileOpen && session && (
                <div className="md:hidden fixed top-14 left-0 right-0 z-40 p-4 space-y-2"
                    style={{ background: 'rgba(5,5,7,0.97)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>
                    {navItems.map(item => (
                        <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-2xl w-full"
                            style={{
                                background: pathname === item.href ? 'rgba(36,99,235,0.12)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${pathname === item.href ? 'rgba(36,99,235,0.25)' : 'rgba(255,255,255,0.06)'}`,
                                color: pathname === item.href ? '#fff' : 'rgba(255,255,255,0.5)',
                            }}>
                            <span className="text-xl">{item.icon}</span>
                            <span className="font-bold text-sm">{item.name}</span>
                            {item.href === '/profile' && pendingCount > 0 && (
                                <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-lg" style={{ background: '#ef4444', color: '#fff' }}>{pendingCount}</span>
                            )}
                        </Link>
                    ))}
                    <div className="flex items-center justify-between pt-2 px-1">
                        <div>
                            <p className="text-xs text-white/20 uppercase tracking-widest font-semibold">Net P&L</p>
                            <p className="font-black text-lg" style={{ color: netBalance >= 0 ? '#10b981' : '#ef4444' }}>
                                {netBalance >= 0 ? '+' : ''}${netBalance.toFixed(2)}
                            </p>
                        </div>
                        <button onClick={() => signOut({ callbackUrl: '/login' })}
                            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                            Sign Out
                        </button>
                    </div>
                </div>
            )}

            {/* ── Mobile bottom nav ── */}
            {session && (
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-4 py-3 safe-area-inset-bottom"
                    style={{ background: 'rgba(5,5,7,0.95)', borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>
                    {navItems.map(item => (
                        <Link key={item.href} href={item.href}
                            className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl relative"
                            style={{ color: pathname === item.href ? '#fff' : 'rgba(255,255,255,0.25)' }}>
                            <span className="text-xl leading-none">{item.icon}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">{item.name}</span>
                            {pathname === item.href && (
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: '#2463eb' }} />
                            )}
                            {item.href === '/profile' && pendingCount > 0 && (
                                <span className="absolute -top-1 right-2 w-3.5 h-3.5 rounded-full text-[9px] font-black text-white flex items-center justify-center" style={{ background: '#ef4444' }}>{pendingCount}</span>
                            )}
                        </Link>
                    ))}
                </nav>
            )}
        </>
    );
}
