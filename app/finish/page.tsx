"use client";

import { useEffect, useState, useCallback } from "react";
import Header from "../components/Header";
import AuthGuard from "../components/AuthGuard";

interface NextAssignmentData {
    hasNext: boolean;
    assignment?: {
        id: string;
        test: {
            id: string;
            displayId: string;
            name: string;
            category: string;
        };
    };
    currentNumber?: number;
    totalAssignments: number;
    completedAssignments: number;
}

export default function FinishPage() {
    const [showContent, setShowContent] = useState(false);
    const [nextData, setNextData] = useState<NextAssignmentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [countdown, setCountdown] = useState(15); // 15 second countdown before next test

    // Complete current assignment & check next
    const checkNextTest = useCallback(async () => {
        try {
            // The exam submit API already marks the assignment as completed,
            // so we just need to clean up and check for the next test
            localStorage.removeItem("currentAssignmentId");

            // Check if there is a next assignment
            const candidateId = localStorage.getItem("candidateId");
            if (candidateId) {
                const res = await fetch(`/api/assignments/next?candidateId=${candidateId}`);
                if (res.ok) {
                    const data = await res.json();
                    setNextData(data);
                }
            } else {
                // No candidateId stored, show as all done
                setNextData({ hasNext: false, totalAssignments: 0, completedAssignments: 0 });
            }
        } catch (err) {
            console.error("Error checking next test:", err);
            setNextData({ hasNext: false, totalAssignments: 0, completedAssignments: 0 });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setShowContent(true), 300);
        checkNextTest();
        return () => clearTimeout(timer);
    }, [checkNextTest]);

    // Countdown timer for auto-redirect to next test
    useEffect(() => {
        if (!nextData?.hasNext || loading) return;

        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    // Auto redirect to test selection
                    window.location.href = "/instructions";
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [nextData, loading]);

    const goToNextTest = () => {
        window.location.href = "/instructions";
    };

    const completedCount = nextData?.completedAssignments ?? 0;
    const totalCount = nextData?.totalAssignments ?? 0;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <AuthGuard allowedRoles={["user"]}>
            <div className="flex flex-col min-h-screen">
                <Header />

                <main className="flex-grow flex items-center justify-center px-4 py-12">
                    <div
                        className={`w-full max-w-lg text-center space-y-6 transition-all duration-700 ${showContent
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-8"
                            }`}
                    >
                        {/* Success Icon */}
                        <div className="relative mx-auto w-24 h-24">
                            <div className="absolute inset-0 bg-[var(--color-success)]/20 rounded-full animate-ping" />
                            <div className="relative size-24 bg-[var(--color-success-light)] rounded-full flex items-center justify-center shadow-[0_0_30px_var(--color-success-glow)]">
                                <span className="material-symbols-outlined text-[var(--color-success)] text-5xl">
                                    check_circle
                                </span>
                            </div>
                        </div>

                        {/* Heading */}
                        <div>
                            <h1 className="text-3xl font-bold text-[var(--color-text-main)] tracking-tight">
                                Test Completed!
                            </h1>
                            <p className="mt-2 text-[var(--color-text-sub)]">
                                Your test has been successfully submitted and recorded.
                            </p>
                        </div>

                        {/* Progress Bar — shows overall battery progress */}
                        {totalCount > 1 && (
                            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] shadow-[var(--shadow-card)] border border-[var(--color-border)] p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold text-[var(--color-text-sub)]">
                                        Battery Progress
                                    </span>
                                    <span className="text-sm font-bold text-brand-teal">
                                        {completedCount} / {totalCount} Tests
                                    </span>
                                </div>
                                <div className="w-full h-3 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-brand-teal rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2 text-[10px] text-[var(--color-text-muted)]">
                                    {Array.from({ length: totalCount }, (_, i) => (
                                        <div key={i} className="flex flex-col items-center gap-1">
                                            <div
                                                className={`size-5 rounded-full flex items-center justify-center text-[9px] font-bold ${i < completedCount
                                                    ? "bg-[var(--color-success-light)] text-[var(--color-success)]"
                                                    : i === completedCount && nextData?.hasNext
                                                        ? "bg-[var(--color-primary-light)] text-primary ring-2 ring-primary/20"
                                                        : "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"
                                                    }`}
                                            >
                                                {i < completedCount ? (
                                                    <span className="material-symbols-outlined text-[12px]">check</span>
                                                ) : (
                                                    i + 1
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Summary Card */}
                        <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] shadow-[var(--shadow-card)] border border-[var(--color-border)] p-6 text-left">
                            <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
                                Test Summary
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { label: "Status", value: "Submitted ✓", icon: "verified" },
                                    { label: "Submitted At", value: new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }), icon: "event" },
                                    ...(totalCount > 1
                                        ? [{ label: "Tests Completed", value: `${completedCount} of ${totalCount}`, icon: "assignment_turned_in" }]
                                        : []),
                                ].map((item) => (
                                    <div
                                        key={item.label}
                                        className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0"
                                    >
                                        <div className="flex items-center gap-2 text-sm text-[var(--color-text-sub)]">
                                            <span className="material-symbols-outlined text-base text-[var(--color-text-muted)]">
                                                {item.icon}
                                            </span>
                                            {item.label}
                                        </div>
                                        <span className="text-sm font-semibold text-[var(--color-text-main)]">
                                            {item.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Next Test Section OR All Done */}
                        {loading ? (
                            <div className="flex items-center justify-center gap-2 py-4">
                                <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm text-[var(--color-text-sub)]">Checking next test...</span>
                            </div>
                        ) : nextData?.hasNext ? (
                            /* === NEXT TEST AVAILABLE === */
                            <div className="bg-[var(--color-primary-light)] border border-[var(--color-border-accent)] rounded-[var(--radius-md)] p-6 space-y-4 animate-fade-in">
                                <div className="flex items-center justify-center gap-2 text-primary">
                                    <span className="material-symbols-outlined text-2xl">arrow_circle_right</span>
                                    <h3 className="text-lg font-bold">Next Test Ready</h3>
                                </div>

                                <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-sm)] p-4 border border-[var(--color-border)]">
                                    <p className="text-sm font-semibold text-[var(--color-text-main)]">
                                        {nextData.assignment?.test.name}
                                    </p>
                                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                        {nextData.assignment?.test.displayId} • {nextData.assignment?.test.category}
                                    </p>
                                </div>

                                <p className="text-sm text-[var(--color-text-sub)]">
                                    Auto-starting in <span className="font-bold text-primary text-lg">{countdown}</span> seconds
                                </p>

                                <div className="w-full h-1.5 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-brand-teal rounded-full transition-all duration-1000 ease-linear"
                                        style={{ width: `${((15 - countdown) / 15) * 100}%` }}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={goToNextTest}
                                        className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[var(--radius-md)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] cursor-pointer btn-press btn-shine"
                                    >
                                        <span className="material-symbols-outlined text-sm">play_arrow</span>
                                        Start Next Test Now
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* === ALL TESTS COMPLETED === */
                            <>
                                <div className="bg-[var(--color-success-light)] border border-[var(--color-success)]/20 p-4 rounded-[var(--radius-sm)] flex gap-3 text-left animate-fade-in">
                                    <span className="material-symbols-outlined text-[var(--color-success)] flex-shrink-0">
                                        celebration
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--color-success)]">
                                            {totalCount > 1 ? "All Tests Completed!" : "Test Completed!"}
                                        </p>
                                        <p className="text-sm text-[var(--color-text-sub)] mt-1">
                                            Your results will be processed and reviewed by the administrator.
                                            You will be notified when the results are available.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        localStorage.clear();
                                        window.location.href = "/login";
                                    }}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-md)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] cursor-pointer btn-press btn-shine"
                                >
                                    <span className="material-symbols-outlined text-sm">logout</span>
                                    Log Out
                                </button>
                            </>
                        )}
                    </div>
                </main>
            </div>
        </AuthGuard>
    );
}
