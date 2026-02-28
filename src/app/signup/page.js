'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const router = useRouter();

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (form.password !== form.confirm) {
            setError('Passwords do not match.');
            return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), password: form.password }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            setSuccess(`Account created! Your username: @${data.username}. Signing you in...`);
            // Auto sign-in after registration
            const signInResult = await signIn('credentials', {
                redirect: false,
                email: form.email.trim(),
                password: form.password,
            });
            if (signInResult?.ok) {
                router.push('/');
            } else {
                router.push('/login');
            }
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        await signIn('google', { callbackUrl: '/' });
    };

    return (
        <div className="min-h-screen bg-[#050507] flex items-center justify-center px-4 py-10 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-10">
                    <Link href="/" className="inline-flex items-center gap-3 group">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl group-hover:bg-purple-500/20 transition-all">🔥</div>
                        <span className="text-3xl font-black text-white tracking-tighter italic uppercase">Streaker</span>
                    </Link>
                    <p className="text-white/30 text-xs font-semibold mt-3 tracking-widest uppercase">Start your streak today</p>
                </div>

                <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-8 backdrop-blur-sm shadow-2xl">
                    <h1 className="text-2xl font-black text-white italic uppercase tracking-tight mb-1">Create account</h1>
                    <p className="text-white/30 text-sm mb-8">Join thousands building better habits</p>

                    {error && (
                        <div className="mb-5 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-sm font-medium">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-5 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-2xl text-sm font-medium flex items-center gap-2">
                            <span className="text-lg">✓</span> {success}
                        </div>
                    )}

                    {/* Google Sign Up */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={googleLoading || loading}
                        className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white text-gray-800 font-semibold rounded-2xl hover:bg-gray-100 transition-all active:scale-[0.98] disabled:opacity-60 mb-6 shadow-sm"
                    >
                        {googleLoading ? (
                            <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin"></div>
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        <span>{googleLoading ? 'Redirecting...' : 'Sign up with Google'}</span>
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 h-px bg-white/8"></div>
                        <span className="text-white/20 text-xs font-semibold uppercase tracking-widest">or</span>
                        <div className="flex-1 h-px bg-white/8"></div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Full Name</label>
                            <input
                                type="text" name="name" required
                                value={form.name} onChange={handleChange}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-sm font-medium placeholder-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all"
                                placeholder="Alex Chen"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Email</label>
                            <input
                                type="email" name="email" required
                                value={form.email} onChange={handleChange}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-sm font-medium placeholder-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Password</label>
                            <input
                                type="password" name="password" required
                                value={form.password} onChange={handleChange}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-sm font-medium placeholder-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all"
                                placeholder="Min. 6 characters"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Confirm Password</label>
                            <input
                                type="password" name="confirm" required
                                value={form.confirm} onChange={handleChange}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-sm font-medium placeholder-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all"
                                placeholder="Re-enter password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || googleLoading}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-3.5 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-60 uppercase tracking-widest text-sm mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span>
                                    Creating account...
                                </span>
                            ) : 'Create Account'}
                        </button>
                    </form>

                    <p className="text-center text-white/30 text-sm mt-6">
                        Already a member?{' '}
                        <Link href="/login" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
