'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const StreakerContext = createContext();

export const StreakerProvider = ({ children }) => {
    const { data: session } = useSession();
    const [totalEarned, setTotalEarned] = useState(0);
    const [totalSpent, setTotalSpent] = useState(0);
    const [habits, setHabits] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [partner, setPartner] = useState(null);
    const [partnerRequests, setPartnerRequests] = useState({ incoming: [], outgoing: [] });
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (session) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [session]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [userRes, habitsRes, transRes, partnerRes] = await Promise.all([
                fetch('/api/user'),
                fetch('/api/habits'),
                fetch('/api/transactions'),
                fetch('/api/partners'),
            ]);

            const [userData, habitsData, transData, partnerData] = await Promise.all([
                userRes.json(),
                habitsRes.json(),
                transRes.json(),
                partnerRes.json(),
            ]);

            if (!userData.error) {
                setUserProfile(userData);
                setTotalEarned(userData.totalEarned || 0);
                setTotalSpent(userData.totalSpent || 0);
            }
            if (!habitsData.error) setHabits(habitsData);
            if (!transData.error) setTransactions(transData);
            if (!partnerData.error) {
                setPartner(partnerData.partner);
                setPartnerRequests({ incoming: partnerData.incoming || [], outgoing: partnerData.outgoing || [] });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const markHabitStatus = async (habitId, status) => {
        try {
            const res = await fetch('/api/habits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ habitId, status }),
            });
            const updatedHabit = await res.json();
            if (!res.ok) throw new Error(updatedHabit.error);
            setHabits(prev => prev.map(h => h._id === habitId ? updatedHabit : h));
        } catch (error) {
            console.error(error.message);
        }
    };

    const confirmTransaction = async (transactionId) => {
        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactionId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setTransactions(prev => prev.map(t => t._id === transactionId ? data.transaction : t));
            if (data.totalEarned !== undefined) setTotalEarned(data.totalEarned);
            if (data.totalSpent !== undefined) setTotalSpent(data.totalSpent);
        } catch (error) {
            console.error(error.message);
        }
    };

    const sendPartnerRequest = async (username) => {
        const res = await fetch('/api/partners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }),
        });
        const data = await res.json();
        if (res.ok) await fetchData();
        return { ok: res.ok, message: data.message || data.error };
    };

    const respondToPartnerRequest = async (requestId, action) => {
        const res = await fetch(`/api/partners/${requestId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
        });
        const data = await res.json();
        if (res.ok) await fetchData();
        return { ok: res.ok, message: data.message || data.error };
    };

    const removePartner = async () => {
        const res = await fetch('/api/partners', { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) await fetchData();
        return { ok: res.ok, message: data.message || data.error };
    };

    return (
        <StreakerContext.Provider value={{
            totalEarned,
            totalSpent,
            habits,
            transactions,
            partner,
            partnerRequests,
            userProfile,
            loading,
            markHabitStatus,
            confirmTransaction,
            sendPartnerRequest,
            respondToPartnerRequest,
            removePartner,
            refreshData: fetchData,
        }}>
            {children}
        </StreakerContext.Provider>
    );
};

export const useStreaker = () => useContext(StreakerContext);
