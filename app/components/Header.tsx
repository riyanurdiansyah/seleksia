"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header() {
    const [userName, setUserName] = useState("Candidate");
    const [userId, setUserId] = useState("---");

    useEffect(() => {
        const storedName = sessionStorage.getItem("candidateName");
        const storedId = sessionStorage.getItem("candidateDisplayId");
        if (storedName) setUserName(storedName);
        if (storedId) setUserId(storedId);
    }, []);

    const handleLogout = () => {
        sessionStorage.clear();
        window.location.href = "/";
    };

    return (
        <header className="bg-[rgba(255,255,255,0.7)] backdrop-blur-[12px] border-b border-[var(--color-border)] sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="size-8 bg-gradient-to-br from-primary to-accent rounded-[var(--radius-xs)] flex items-center justify-center text-white shadow-[var(--shadow-sm)] group-hover:shadow-[0_4px_12px_var(--color-primary-glow)] transition-all animate-float">
                            <span className="material-symbols-outlined text-[20px]">psychology</span>
                        </div>
                        <span className="text-[var(--color-brand-navy)] text-xl font-serif font-semibold tracking-wider">
                            Psikoest
                        </span>
                    </Link>

                    {/* User Profile */}
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-sm font-medium text-[var(--color-text-main)]">
                                {userName}
                            </span>
                            <span className="text-xs text-[var(--color-text-muted)]">
                                Candidate ID: {userId}
                            </span>
                        </div>
                        <div className="w-[34px] h-[34px] bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center font-bold text-sm text-white shadow-[var(--shadow-sm)] hover:scale-105 hover:shadow-[0_4px_12px_var(--color-primary-glow)] transition-all">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center justify-center h-9 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-main)] transition-all text-sm font-medium cursor-pointer btn-press"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
