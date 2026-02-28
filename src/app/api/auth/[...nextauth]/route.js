import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Habit from '@/models/Habit';
import bcrypt from 'bcryptjs';

function generateUsername(name) {
    const base = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${base}${suffix}`;
}

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        }),
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                try {
                    await dbConnect();
                    const user = await User.findOne({ email: credentials.email.toLowerCase() });
                    if (!user || !user.password) return null;
                    const isValid = await bcrypt.compare(credentials.password, user.password);
                    if (!isValid) return null;

                    // Auto-generate username if missing
                    if (!user.username) {
                        let username = generateUsername(user.name);
                        let attempts = 0;
                        while (await User.findOne({ username }) && attempts < 10) {
                            username = generateUsername(user.name);
                            attempts++;
                        }
                        user.username = username;
                    }
                    // Auto-generate avatarSeed if missing
                    if (!user.avatarSeed) {
                        user.avatarSeed = `${user.name.toLowerCase().replace(/\s/g, '')}-${Date.now()}`;
                    }
                    await user.save();

                    return {
                        id: user._id.toString(),
                        name: user.name,
                        email: user.email,
                        username: user.username,
                        avatarSeed: user.avatarSeed,
                        image: null,
                    };
                } catch (err) {
                    console.error('[CREDENTIALS AUTH ERROR]', err);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === 'google') {
                try {
                    await dbConnect();
                    let dbUser = await User.findOne({ email: user.email });
                    if (!dbUser) {
                        let username = generateUsername(user.name);
                        let attempts = 0;
                        while (await User.findOne({ username }) && attempts < 10) {
                            username = generateUsername(user.name);
                            attempts++;
                        }
                        const avatarSeed = `${user.name.toLowerCase().replace(/\s/g, '')}-${Date.now()}`;
                        dbUser = await User.create({
                            name: user.name,
                            email: user.email,
                            googleId: user.id,
                            username,
                            avatarSeed,
                        });
                        await Habit.insertMany([
                            { userId: dbUser._id, name: 'Morning 5km Run', description: 'Run at least 5km before 9:00 AM.', streak: 0, icon: '🏃', color: 'accent-blue', history: [] },
                            { userId: dbUser._id, name: 'Mindful Meditation', description: '15 minutes of guided meditation daily.', streak: 0, icon: '🧘', color: 'accent-purple', history: [] },
                            { userId: dbUser._id, name: 'Read 20 Pages', description: 'Read at least 20 pages of a book.', streak: 0, icon: '📖', color: 'accent-green', history: [] },
                        ]);
                    } else {
                        // Backfill username/avatarSeed for existing Google users
                        let updated = false;
                        if (!dbUser.username) {
                            let username = generateUsername(dbUser.name);
                            let attempts = 0;
                            while (await User.findOne({ username }) && attempts < 10) {
                                username = generateUsername(dbUser.name);
                                attempts++;
                            }
                            dbUser.username = username;
                            updated = true;
                        }
                        if (!dbUser.avatarSeed) {
                            dbUser.avatarSeed = `${dbUser.name.toLowerCase().replace(/\s/g, '')}-${Date.now()}`;
                            updated = true;
                        }
                        if (updated) await dbUser.save();
                    }
                    user.dbId = dbUser._id.toString();
                    user.username = dbUser.username;
                    user.avatarSeed = dbUser.avatarSeed;
                } catch (err) {
                    console.error('[GOOGLE SIGNIN ERROR]', err);
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.dbId || user.id;
                token.username = user.username;
                token.avatarSeed = user.avatarSeed;
            }
            return token;
        },
        async session({ session, token }) {
            if (token?.id) {
                session.user.id = token.id;
                session.user.username = token.username;
                session.user.avatarSeed = token.avatarSeed;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: { strategy: 'jwt' },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
