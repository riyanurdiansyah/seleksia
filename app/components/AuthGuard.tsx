"use client";

import { useEffect, useState } from "react";

interface AuthGuardProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

/**
 * AuthGuard — protects pages that require a valid session.
 * 
 * - If no `candidateId` in localStorage → redirect to login
 * - If `allowedRoles` is specified, checks `candidateRole` in localStorage
 * - Shows a loading spinner while checking
 */
export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
    const [status, setStatus] = useState<"loading" | "authorized" | "unauthorized">("loading");

    useEffect(() => {
        const candidateId = localStorage.getItem("candidateId");
        const candidateRole = localStorage.getItem("candidateRole");

        if (!candidateId) {
            // No session — redirect to login
            window.location.href = "/login";
            return;
        }

        // Check role if specified
        if (allowedRoles && allowedRoles.length > 0) {
            if (!candidateRole || !allowedRoles.includes(candidateRole)) {
                setStatus("unauthorized");
                return;
            }
        }

        setStatus("authorized");
    }, [allowedRoles]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)]">
                <div className="text-center space-y-3 animate-fade-in">
                    <div className="w-8 h-8 border-2 border-[var(--color-primary-light)] border-t-primary rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-[var(--color-text-muted)]">Verifying session...</p>
                </div>
            </div>
        );
    }

    if (status === "unauthorized") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)]">
                <div className="text-center space-y-4 animate-slide-in-up max-w-md mx-4">
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-8">
                        <div className="w-16 h-16 bg-[var(--color-danger-light)] rounded-[20px] flex items-center justify-center mx-auto mb-5">
                            <span className="material-symbols-outlined text-danger text-4xl">lock</span>
                        </div>
                        <h2 className="text-xl font-[800] bg-gradient-to-r from-danger to-[#e05a4e] bg-clip-text text-transparent mb-3 tracking-[-0.5px]">Access Denied</h2>
                        <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
                            You don&apos;t have permission to access this page.
                        </p>
                        <div className="flex gap-3 justify-center pt-5">
                            <button
                                onClick={() => {
                                    localStorage.clear();
                                    window.location.href = "/login";
                                }}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] active:translate-y-0 transition-all cursor-pointer btn-press btn-shine"
                            >
                                <span className="material-symbols-outlined text-sm">arrow_back</span>
                                Back to Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
