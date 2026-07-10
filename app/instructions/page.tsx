"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "../components/Header";
import Stepper from "../components/Stepper";
import FooterLinks from "../components/FooterLinks";
import AuthGuard from "../components/AuthGuard";

const defaultRules = [
    "This examination is strictly timed. Once started, the timer cannot be paused.",
    "Your camera must remain active throughout the entire examination.",
    "Switching tabs or minimizing the browser will trigger a warning. Repeated violations may result in automatic disqualification.",
    "Right-clicking, copying, and pasting are disabled during the exam.",
    "Your answers are automatically saved each time you select an option.",
    "If the timer reaches zero, your exam will be automatically submitted.",
    "Random snapshots will be taken during the exam for verification purposes.",
    "Only one face should be visible in the camera frame at all times.",
];

interface Instruction {
    id: string;
    type: "general" | "specific";
    content: string;
}

interface TestInfo {
    id: string;
    displayId: string;
    name: string;
    category: string;
    duration: number;
    instructions: Instruction[];
}

interface Assignment {
    id: string;
    status: string;
    test: TestInfo;
}

export default function InstructionsPage() {
    const [agreed, setAgreed] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [generalInstructions, setGeneralInstructions] = useState<Instruction[]>([]);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPendingAssignments = async () => {
            const candidateId = localStorage.getItem("candidateId");
            if (!candidateId) return;

            try {
                const res = await fetch(`/api/assignments/pending?candidateId=${candidateId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.assignments && data.assignments.length > 0) {
                        setAssignments(data.assignments);
                        setSelectedAssignmentId(data.assignments[0].id);
                    }
                    if (data.generalInstructions) {
                        setGeneralInstructions(data.generalInstructions);
                    }
                }
            } catch (err) {
                console.error("Failed to load pending assignments:", err);
            } finally {
                setLoading(false);
            }
        };

        loadPendingAssignments();
    }, []);

    const categoryLabel: Record<string, string> = {
        intelligence: "Intelligence",
        personality: "Personality",
        aptitude: "Aptitude",
        projective: "Projective",
    };

    const handleSelectAssignment = (id: string) => {
        setSelectedAssignmentId(id);
        setAgreed(false);
        setShowConfirm(false);
    };

    const handleBeginTest = () => {
        // Safe it so the next exam page knows which one
        localStorage.setItem("selectedAssignmentId", selectedAssignmentId);
        window.location.href = "/cbt";
    };

    const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId);
    const testInfo = selectedAssignment?.test;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark">
                <div className="flex items-center gap-2">
                    <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-[var(--color-text-sub)]">Loading instructions...</span>
                </div>
            </div>
        );
    }

    if (!selectedAssignment || !testInfo) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark">
                <div className="text-center p-8">
                    <span className="material-symbols-outlined text-4xl text-[var(--color-text-muted)] mb-2">assignment_turned_in</span>
                    <h2 className="text-xl font-bold text-[var(--color-text-main)]">All caught up!</h2>
                    <p className="text-[var(--color-text-sub)] mt-1">You have no pending tests.</p>
                </div>
            </div>
        );
    }

    const rules = generalInstructions.length > 0
        ? generalInstructions.map(g => g.content)
        : defaultRules;

    const specificInstructions = testInfo.instructions || [];

    return (
        <AuthGuard allowedRoles={["user"]}>
            <div className="flex flex-col min-h-screen">
                <Header />

                <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto space-y-8">
                        <Stepper currentStep={1} />

                        {/* Page Header */}
                        <div className="text-center mt-10 animate-slide-in-up">
                            <h1 className="text-3xl font-bold text-[var(--color-text-main)] tracking-tight">
                                Exam Instructions
                            </h1>
                            <p className="mt-2 text-[var(--color-text-sub)]">
                                Please select a test to begin and read the rules carefully.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">

                            {/* Left Panel: Assignment List */}
                            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] shadow-[var(--shadow-card)] border border-[var(--color-border)] p-4 space-y-3 sticky top-6">
                                <h3 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wider mb-2">
                                    Your Pending Tests
                                </h3>
                                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                    {assignments.map(asgn => (
                                        <button
                                            key={asgn.id}
                                            onClick={() => handleSelectAssignment(asgn.id)}
                                            className={`w-full text-left p-3 rounded-[var(--radius-sm)] border text-sm transition-all duration-200 focus:outline-none ${selectedAssignmentId === asgn.id
                                                ? "bg-[var(--color-primary-light)] border-[var(--color-border-accent)] shadow-[var(--shadow-sm)] text-primary"
                                                : "bg-[var(--color-bg-elevated)] border-[var(--color-border)] hover:border-[var(--color-border-accent)] hover:translate-x-1"
                                                }`}
                                        >
                                            <p className={`font-semibold ${selectedAssignmentId === asgn.id ? "text-primary" : "text-[var(--color-text-main)]"}`}>
                                                {asgn.test.name}
                                            </p>
                                            <p className="text-xs text-[var(--color-text-muted)] mt-1 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px]">timer</span>
                                                {asgn.test.duration} min
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Right Panel: Content */}
                            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] shadow-[var(--shadow-card)] border border-[var(--color-border)] overflow-hidden animate-slide-in-up relative">
                                <div className="p-6 sm:p-8 space-y-6">

                                    {/* Exam Info Header */}
                                    <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-[var(--radius-sm)] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hidden">
                                        <div className="size-12 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined text-2xl">assignment</span>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-[var(--color-text-main)]">{testInfo.name}</h2>
                                            <div className="flex flex-wrap gap-3 mt-1 text-sm text-[var(--color-text-sub)]">
                                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">category</span> {categoryLabel[testInfo.category] || testInfo.category}</span>
                                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">timer</span> {testInfo.duration} minutes</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { label: "Selected Test", value: testInfo.name, icon: "assignment" },
                                            { label: "Category", value: (categoryLabel[testInfo.category] || testInfo.category), icon: "category" },
                                            { label: "Duration", value: `${testInfo.duration} min`, icon: "timer" },
                                            { label: "Passing Score", value: "Auto-graded", icon: "grading" },
                                        ].map((item) => (
                                            <div
                                                key={item.label}
                                                className="bg-[var(--color-bg-card)] rounded-[var(--radius-sm)] p-4 flex items-center gap-3 border border-[var(--color-border-accent)] transition-all duration-200 hover:translate-y-[-1px] hover:shadow-[var(--shadow-sm)]"
                                            >
                                                <span className="material-symbols-outlined text-brand-teal text-2xl">
                                                    {item.icon}
                                                </span>
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-[var(--color-text-muted)]">
                                                        {item.label}
                                                    </p>
                                                    <p className="text-sm font-bold text-[var(--color-text-main)]">
                                                        {item.value}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Specific Instructions */}
                                    {specificInstructions.length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-semibold text-[var(--color-text-main)] flex items-center gap-2 mb-4">
                                                <span className="material-symbols-outlined text-[var(--color-success)]">
                                                    psychology_alt
                                                </span>
                                                Test-Specific Instructions
                                            </h3>
                                            <div className="space-y-3">
                                                {specificInstructions.map((rule, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex gap-3 p-4 rounded-[var(--radius-sm)] bg-[var(--color-success-light)] border border-[var(--color-success)]/20 animate-fade-in"
                                                        style={{ animationDelay: `${i * 80}ms` }}
                                                    >
                                                        <span className="material-symbols-outlined text-[var(--color-success)] mt-0.5">info</span>
                                                        <p className="text-sm font-medium text-[var(--color-success)] leading-relaxed">
                                                            {rule.content}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Rules List */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-[var(--color-text-main)] flex items-center gap-2 mb-4">
                                            <span className="material-symbols-outlined text-brand-teal">
                                                gavel
                                            </span>
                                            General Rules & Regulations
                                        </h3>
                                        <div className="space-y-3">
                                            {rules.map((rule, i) => (
                                                <div
                                                    key={i}
                                                    className="flex gap-3 p-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] animate-fade-in"
                                                    style={{ animationDelay: `${i * 80}ms` }}
                                                >
                                                    <div className="size-6 rounded-full bg-brand-teal/10 text-brand-teal flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <span className="text-xs font-bold">{i + 1}</span>
                                                    </div>
                                                    <p className="text-sm text-[var(--color-text-sub)] leading-relaxed">
                                                        {rule}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Warning */}
                                    <div className="bg-[var(--color-warning-light)] border border-[var(--color-warning)]/30 p-4 rounded-[var(--radius-sm)] flex gap-3">
                                        <span className="material-symbols-outlined text-[var(--color-warning)] flex-shrink-0">
                                            warning
                                        </span>
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--color-warning)]">
                                                Proctoring Notice
                                            </p>
                                            <p className="text-sm text-[var(--color-text-sub)] mt-1">
                                                This exam is supervised via AI-powered camera monitoring.
                                                Your face, actions, and screen activity will be recorded for
                                                integrity verification.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Consent Agreement */}
                                    <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] p-5 rounded-[var(--radius-sm)]">
                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={agreed}
                                                onChange={(e) => setAgreed(e.target.checked)}
                                                className="mt-0.5 size-5 rounded border-[var(--color-border)] text-primary focus:ring-[var(--color-primary-light)] cursor-pointer"
                                            />
                                            <span className="text-sm font-medium text-[var(--color-text-sub)] group-hover:text-[var(--color-text-main)] transition-colors">
                                                I have read, understood, and agree to all the rules and
                                                consent to camera-based proctoring during the exam. I understand any violation will trigger disqualification.
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Footer actions */}
                                <div className="px-6 py-4 sm:px-8 bg-[var(--color-bg-elevated)] border-t border-[var(--color-border)] flex justify-between gap-3">
                                    <Link
                                        href="/system-check"
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-sub)] font-medium text-sm hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-main)] transition-all duration-200 btn-press"
                                    >
                                        <span className="material-symbols-outlined text-sm">
                                            arrow_back
                                        </span>
                                        Back
                                    </Link>

                                    <button
                                        onClick={() => agreed && setShowConfirm(true)}
                                        disabled={!agreed}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-[var(--radius-sm)] font-bold text-sm transition-all cursor-pointer btn-press ${agreed
                                            ? "bg-gradient-to-br from-primary to-accent text-white shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-shine"
                                            : "bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] cursor-not-allowed opacity-75"
                                            }`}
                                    >
                                        Proceed to Test
                                        <span className="material-symbols-outlined text-sm">
                                            arrow_forward
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                    <FooterLinks />
                </main>

                {/* Confirmation Modal */}
                {showConfirm && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-[8px] animate-fade-in">
                        <div className="bg-[var(--color-bg-card)] rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] border border-[var(--color-border-strong)] w-full max-w-md mx-4 p-6 animate-slide-in-up">
                            <div className="text-center space-y-4">
                                <div className="size-14 bg-[var(--color-warning-light)] rounded-full flex items-center justify-center mx-auto">
                                    <span className="material-symbols-outlined text-[var(--color-warning)] text-3xl">
                                        warning
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-[var(--color-text-main)]">
                                    Are you sure?
                                </h3>
                                <p className="text-sm text-[var(--color-text-sub)]">
                                    Once you start the test, the timer will begin counting down
                                    immediately and cannot be paused. Make sure you&apos;re ready.
                                </p>
                                <div className="bg-[var(--color-bg-elevated)] rounded-[var(--radius-sm)] p-3 text-sm border border-[var(--color-border)]">
                                    <p className="font-semibold text-[var(--color-text-main)]">{testInfo.name}</p>
                                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                        {testInfo.duration} minutes
                                    </p>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setShowConfirm(false)}
                                        className="flex-1 py-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-sub)] font-medium text-sm hover:bg-[var(--color-bg-hover)] transition-all cursor-pointer btn-press"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleBeginTest}
                                        className="flex-1 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-bold text-sm text-center transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] cursor-pointer btn-press btn-shine"
                                    >
                                        Begin Test
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthGuard>
    );
}
