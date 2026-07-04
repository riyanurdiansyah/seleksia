"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import Breadcrumb from "../../../components/Breadcrumb";
import * as XLSX from "xlsx";

interface Violation {
    id: string;
    type: string;
    description: string | null;
    severity: number;
    detectedAt: string;
}

interface Answer {
    id: string;
    displayId: string;
    type?: string;
    text: string;
    options: string[];
    correctAnswer: string | null;
    candidateAnswer: string | null;
    isCorrect: boolean;
    earnedWeight?: number;
    imageUrl: string | null;
    answeredAt: string | null;
}

interface DetailData {
    id: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    candidate: {
        id: string;
        name: string;
        displayId: string;
        email: string;
        batch: string | null;
    };
    test: {
        id: string;
        name: string;
        category: string;
        questionType: string;
        duration: number;
        totalQuestions: number;
    };
    examSession: {
        timeUsedSeconds: number;
        autoSubmitted: boolean;
        deviceFingerprint?: string | null;
    };
    violations: Violation[];
    calculatedNormalScore: number;
    overallNormalScore: number;
    totalWeightedScore: number;
    normalScorableCount: number;
    weightedCount: number;
    unscorableCount: number;
    correctNormalCount: number;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
    intelligence: { label: "Intelligence", icon: "psychology", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30" },
    personality: { label: "Personality", icon: "mood", color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-950/20 border-pink-100 dark:border-pink-900/30" },
    aptitude: { label: "Aptitude", icon: "school", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30" },
    projective: { label: "Projective", icon: "draw", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/20 border-teal-100 dark:border-teal-900/30" },
};

export default function ResultDetailClient({ data }: { data: DetailData }) {
    const [viewMode, setViewMode] = useState<"overview" | "answers" | "violations">("overview");

    const m = Math.floor(data.examSession.timeUsedSeconds / 60);
    const s = data.examSession.timeUsedSeconds % 60;
    const timeLimitSeconds = data.test.duration * 60;
    
    const timePercentage = useMemo(() => {
        if (timeLimitSeconds <= 0) return 0;
        return Math.min(Math.round((data.examSession.timeUsedSeconds / timeLimitSeconds) * 100), 100);
    }, [data.examSession.timeUsedSeconds, timeLimitSeconds]);

    const getInitials = (name: string) => {
        return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
    };

    const category = CATEGORY_CONFIG[data.test.category] || CATEGORY_CONFIG.intelligence;

    const exportToExcel = () => {
        const worksheetData = [
            ["ASSESSMENT PERFORMANCE REPORT - EXAM RECAP"],
            [],
            ["Candidate Profile"],
            ["Name", data.candidate.name],
            ["Display ID", data.candidate.displayId],
            ["Email", data.candidate.email],
            ["Batch", data.candidate.batch || "-"],
            [],
            ["Exam Metadata"],
            ["Test Name", data.test.name],
            ["Category", category.label],
            ["Duration Limit", `${data.test.duration}m`],
            ["Time Spent", `${m}m ${s}s`],
            ["Test Score (Normal)", `${data.overallNormalScore}%`],
            ["Test Score (Weighted)", `${data.totalWeightedScore} Points`],
            ["System Action", data.examSession.autoSubmitted ? "Force Submitted" : "Normal Submit"],
            [],
            ["No", "Question Text", "Candidate Selection", "Correct Answer Key", "Status", "Point / Weight", "Image URL"]
        ];

        data.answers.forEach((ans, idx) => {
            const cleanText = ans.text.replace(/<[^>]*>/g, ""); // Strip HTML tags
            const statusMsg = ans.isCorrect 
                ? "Correct" 
                : ans.candidateAnswer 
                    ? "Incorrect" 
                    : "Skipped";

            const pointOrWeight = ans.type === "multiple_choice_weighted" 
                ? (ans.earnedWeight || 0).toString()
                : ans.isCorrect ? "1" : "0";

            worksheetData.push([
                (idx + 1).toString(),
                cleanText,
                ans.candidateAnswer || "-",
                ans.correctAnswer || (ans.type === "multiple_choice_weighted" ? "Weighted Answer" : "-"),
                ans.type === "multiple_choice_weighted" ? "Weighted Evaluation" : statusMsg,
                pointOrWeight,
                ans.imageUrl || "-"
            ]);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        
        // Define column widths for better readability in Excel
        worksheet["!cols"] = [
            { wch: 6 },   // No
            { wch: 60 },  // Question Text
            { wch: 25 },  // Candidate Selection
            { wch: 25 },  // Correct Answer Key
            { wch: 20 },  // Status
            { wch: 15 },  // Point / Weight
            { wch: 50 }   // Image URL
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Recap Answers");

        const sanitizedCandidateName = data.candidate.name.replace(/[^a-zA-Z0-9]/g, "_");
        const sanitizedTestName = data.test.name.replace(/[^a-zA-Z0-9]/g, "_");
        const filename = `Recap_${sanitizedCandidateName}_${sanitizedTestName}.xlsx`;

        XLSX.writeFile(workbook, filename);
    };

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 md:p-8 shadow-[var(--shadow-card)]">
                <div className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                <div className="absolute -left-16 -bottom-16 w-44 h-44 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <Link href="/histories/result" className="p-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-sub)] hover:text-primary transition-all flex items-center justify-center cursor-pointer btn-press">
                            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl md:text-2xl font-black text-[var(--color-text-main)] tracking-tight">
                                    Assessment Performance Dossier
                                </h1>
                            </div>
                            <p className="text-xs text-[var(--color-text-sub)] mt-1 font-medium">Detailed exam analysis, candidate responses, and behaviors audit logs.</p>
                        </div>
                    </div>
                    <Breadcrumb />
                </div>
            </div>

            {/* Split Grid Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* LEFT: Candidate & Session Dossier Summary Panel */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
                    
                    {/* Card 1: User Profile Header */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 relative overflow-hidden flex flex-col items-center text-center">
                        <div className="card-shimmer" />
                        <div className="size-16 rounded-full bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center font-bold text-xl shadow-[var(--shadow-md)]">
                            {getInitials(data.candidate.name)}
                        </div>
                        <h2 className="text-base font-extrabold text-[var(--color-text-main)] mt-4">{data.candidate.name}</h2>
                        <span className="text-[10px] font-black tracking-widest text-[var(--color-text-muted)] uppercase border border-[var(--color-border)] px-2 py-0.5 rounded bg-[var(--color-bg-elevated)] mt-2">
                            {data.candidate.displayId}
                        </span>

                        <div className="w-full border-t border-[var(--color-border)] mt-5 pt-4 space-y-3 text-left">
                            <div className="flex items-center gap-2.5 text-xs text-[var(--color-text-sub)]">
                                <span className="material-symbols-outlined text-[16px] text-primary">mail</span>
                                <span className="truncate font-medium">{data.candidate.email}</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-[var(--color-text-sub)]">
                                <span className="material-symbols-outlined text-[16px] text-primary">domain</span>
                                <span className="font-semibold">Batch: {data.candidate.batch || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-[var(--color-text-sub)]">
                                <span className="material-symbols-outlined text-[16px] text-primary">analytics</span>
                                <span className="font-semibold">Category: {category.label}</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Score Display Panel */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 relative overflow-hidden flex flex-col items-center">
                        <div className="card-shimmer" />
                        <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] self-start">Test Score</p>
                        
                        <div className="relative flex items-center justify-center mt-3.5">
                            {/* Simple Premium Score Circle Visualizer */}
                            <div className={`size-32 rounded-full border-[10px] flex flex-col items-center justify-center shadow-[var(--shadow-xs)]
                                ${data.normalScorableCount > 0 && data.weightedCount > 0
                                    ? "border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                                    : data.weightedCount > 0 
                                        ? "border-primary/20 text-primary" 
                                        : data.overallNormalScore >= 60 
                                            ? "border-emerald-500/20 dark:border-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                            : "border-amber-500/20 dark:border-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                                
                                {data.normalScorableCount > 0 && data.weightedCount > 0 ? (
                                    <>
                                        <span className="text-xl font-black">{data.overallNormalScore}% / {data.totalWeightedScore}</span>
                                        <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--color-text-sub)] mt-0.5">
                                            Normal / Weighted
                                        </span>
                                    </>
                                ) : data.weightedCount > 0 ? (
                                    <>
                                        <span className="text-3xl font-black">{data.totalWeightedScore}</span>
                                        <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--color-text-sub)] mt-0.5">Raw Score</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-3xl font-black">{data.overallNormalScore}%</span>
                                        <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--color-text-sub)] mt-0.5">
                                            {data.overallNormalScore >= 60 ? "Passed" : "Audit"}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Breakdown Panel */}
                        <div className="w-full mt-5 space-y-2">
                            {data.normalScorableCount > 0 && (
                                <div className="flex justify-between items-center px-3 py-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                                        Calculated Score
                                    </span>
                                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                                        {data.calculatedNormalScore} Points
                                    </span>
                                </div>
                            )}

                            {data.weightedCount > 0 && (
                                <div className="flex justify-between items-center px-3 py-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase">
                                        Weighted Score
                                    </span>
                                    <span className="text-xs font-black text-blue-700 dark:text-blue-400">
                                        {data.totalWeightedScore} Points
                                    </span>
                                </div>
                            )}
                            
                            {data.unscorableCount > 0 && (
                                <div className="flex justify-between items-center px-3 py-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Manual Review</span>
                                        <span className="text-[8px] text-amber-600 dark:text-amber-500">Unscored (e.g., Essay)</span>
                                    </div>
                                    <span className="text-xs font-black text-amber-700 dark:text-amber-400">{data.unscorableCount} Qs</span>
                                </div>
                            )}
                        </div>

                        {/* Timing meter bar */}
                        <div className="w-full mt-6 space-y-2 border-t border-[var(--color-border)] pt-4">
                            <div className="flex justify-between items-center text-xs text-[var(--color-text-sub)]">
                                <span className="font-bold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">timer</span>
                                    Time Used
                                </span>
                                <span className="font-mono font-bold text-[var(--color-text-main)]">
                                    {m}m {s}s <span className="font-normal text-[var(--color-text-muted)]">/ {data.test.duration}m</span>
                                </span>
                            </div>
                            <div className="w-full bg-[var(--color-bg-elevated)] h-2 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-300 rounded-full
                                        ${timePercentage >= 90 ? "bg-red-500" : timePercentage >= 70 ? "bg-amber-500" : "bg-primary"}`} 
                                    style={{ width: `${timePercentage}%` }} 
                                />
                            </div>
                            {data.examSession.autoSubmitted && (
                                <div className="mt-2 text-center text-[10px] font-black uppercase text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
                                    🔴 System Force Submitted
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Card 3: Proctoring Safety Context */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 relative overflow-hidden">
                        <div className="card-shimmer" />
                        <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Security & Device Registry</p>
                        
                        <div className="flex items-center gap-3">
                            <div className={`size-9 rounded-xl flex items-center justify-center flex-shrink-0
                                ${data.violations.length === 0 
                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                                    : "bg-red-500/10 text-red-600 border border-red-500/20"}`}>
                                <span className="material-symbols-outlined text-[18px]">
                                    {data.violations.length === 0 ? "verified" : "warning"}
                                </span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-[var(--color-text-main)]">
                                    {data.violations.length === 0 ? "Trust Score: Optimal" : `${data.violations.length} Flags Detected`}
                                </p>
                                <p className="text-[10px] text-[var(--color-text-sub)] mt-0.5 font-medium truncate">
                                    {data.violations.length === 0 ? "Zero behavioral violations" : "Proctoring flags require inspection"}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-2 text-[10px]">
                            <span className="font-black text-[var(--color-text-muted)] uppercase tracking-wider">Device ID Fingerprint</span>
                            <code className="block p-2 rounded bg-[var(--color-bg-elevated)] text-[9px] font-mono text-[var(--color-text-sub)] border border-[var(--color-border)] break-all max-h-16 overflow-y-auto">
                                {data.examSession.deviceFingerprint || "No Fingerprint log available"}
                            </code>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Detailed audit content workspace */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    
                    {/* Navigation Bar inside Workspace */}
                    <div className="bg-[var(--color-bg-card)] p-2 rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-xs)] flex gap-2">
                        <button
                            onClick={() => setViewMode("overview")}
                            className={`flex-1 py-3.5 px-3 rounded-[var(--radius-sm)] flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer btn-press
                                ${viewMode === "overview"
                                    ? "bg-primary text-white shadow-md shadow-primary/20"
                                    : "text-[var(--color-text-sub)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-main)]"
                                }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">dashboard</span>
                            Overview
                        </button>

                        <button
                            onClick={() => setViewMode("answers")}
                            className={`flex-1 py-3.5 px-3 rounded-[var(--radius-sm)] flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer btn-press
                                ${viewMode === "answers"
                                    ? "bg-primary text-white shadow-md shadow-primary/20"
                                    : "text-[var(--color-text-sub)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-main)]"
                                }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">fact_check</span>
                            Answer Sheets
                        </button>

                        <button
                            onClick={() => setViewMode("violations")}
                            className={`flex-1 py-3.5 px-3 rounded-[var(--radius-sm)] flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer btn-press relative
                                ${viewMode === "violations"
                                    ? "bg-primary text-white shadow-md shadow-primary/20"
                                    : "text-[var(--color-text-sub)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-main)]"
                                }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">gavel</span>
                            Proctoring Timeline
                            {data.violations.length > 0 && (
                                <span className="absolute top-1.5 right-2 bg-red-500 text-white font-bold font-sans text-[8px] px-1.5 py-0.5 rounded-full border border-white">
                                    {data.violations.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Content Board */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 relative min-h-[580px] flex flex-col justify-between overflow-hidden">
                        <div className="card-shimmer" />

                        {/* TAB 1: OVERVIEW */}
                        {viewMode === "overview" && (
                            <div className="space-y-6 animate-fade-in flex-1">
                                <div>
                                    <h3 className="text-sm font-bold text-[var(--color-text-main)] uppercase tracking-wider">Session Overview</h3>
                                    <p className="text-[11px] text-[var(--color-text-sub)] mt-0.5">Summary of dates, timelines, and assessment classifications.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl space-y-1.5">
                                        <span className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-wider">Test Name</span>
                                        <p className="text-xs font-bold text-[var(--color-text-main)]">{data.test.name}</p>
                                    </div>
                                    <div className="p-4 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl space-y-1.5">
                                        <span className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-wider">Test Category</span>
                                        <div>
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${category.bg} ${category.color}`}>
                                                {category.label}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl space-y-1.5">
                                        <span className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-wider">Total Questions</span>
                                        <p className="text-xs font-bold text-[var(--color-text-main)]">{data.test.totalQuestions} Questions</p>
                                    </div>
                                    <div className="p-4 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl space-y-1.5">
                                        <span className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-wider">Session Status</span>
                                        <div>
                                            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                                                {data.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl space-y-1.5">
                                        <span className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-wider">Session Started</span>
                                        <p className="text-xs font-bold text-[var(--color-text-main)]">
                                            {data.startedAt ? new Date(data.startedAt).toLocaleString("id-ID") : "-"}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl space-y-1.5">
                                        <span className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-wider">Session Completed</span>
                                        <p className="text-xs font-bold text-[var(--color-text-main)]">
                                            {data.completedAt ? new Date(data.completedAt).toLocaleString("id-ID") : "-"}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-5 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent rounded-xl border border-[var(--color-border-strong)]">
                                    <h4 className="text-xs font-black uppercase text-[var(--color-text-main)] flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
                                        Proctoring Trust Score
                                    </h4>
                                    <p className="text-[11px] text-[var(--color-text-sub)] mt-1.5 leading-relaxed font-semibold">
                                        This test report has been compiled and locked dynamically by the SELEKSIA proctoring suite. All window focus switches, tabs blurs, and face tracking diagnostics were logged using timestamp indicators.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: ANSWER SHEET DETAIL AUDIT */}
                        {viewMode === "answers" && (
                            <div className="space-y-6 animate-fade-in flex-1">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[var(--color-border)] pb-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-[var(--color-text-main)] uppercase tracking-wider">Detailed Responses Audit</h3>
                                        <p className="text-[11px] text-[var(--color-text-sub)] mt-0.5">Audit options selected, essay answers, and correct solutions.</p>
                                    </div>
                                    <button
                                        onClick={exportToExcel}
                                        className="px-4 py-2 rounded-[var(--radius-sm)] text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 border border-emerald-500/20 shadow-md shadow-emerald-600/10 hover:shadow-lg transition-all btn-press cursor-pointer flex-shrink-0"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">download</span>
                                        Export to XLS
                                    </button>
                                </div>

                                <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                                    {data.answers.map((ans, idx) => (
                                        <div key={ans.id} className="p-4 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg-card)] shadow-xs relative overflow-hidden group">
                                            {/* Status indicator bar left edge */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1
                                                ${ans.type === "multiple_choice_weighted"
                                                    ? "bg-primary"
                                                    : ans.isCorrect 
                                                        ? "bg-emerald-500" 
                                                        : ans.candidateAnswer 
                                                            ? "bg-red-500" 
                                                            : "bg-[var(--color-text-muted)]"}`} 
                                            />

                                            <div className="pl-3.5 flex flex-col md:flex-row gap-6">
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-[9px] font-mono font-black text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                                                            QUESTION {idx + 1}
                                                        </span>
                                                        {ans.type === "multiple_choice_weighted" ? (
                                                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-[var(--color-primary-light)] text-primary">
                                                                Earned Weight: {ans.earnedWeight || 0}
                                                            </span>
                                                        ) : (
                                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded
                                                                ${ans.isCorrect 
                                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                                                    : ans.candidateAnswer 
                                                                        ? "bg-red-500/10 text-red-600 dark:text-red-400" 
                                                                        : "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"}`}>
                                                                {ans.isCorrect ? "Correct" : ans.candidateAnswer ? "Incorrect" : "Skipped"}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="text-xs font-semibold text-[var(--color-text-main)] leading-relaxed font-sans" dangerouslySetInnerHTML={{ __html: ans.text }} />

                                                    {ans.imageUrl && (
                                                        <div className="mt-2.5 p-2 bg-[var(--color-bg-elevated)] rounded border border-[var(--color-border)] inline-block">
                                                            <img src={ans.imageUrl} alt={`Question ${idx + 1} reference`} className="max-h-28 rounded object-contain" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Selections box */}
                                                <div className="md:w-60 flex-shrink-0 flex flex-col gap-2 p-3.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl h-fit text-xs font-medium">
                                                    <div>
                                                        <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase block mb-1">User Selection</span>
                                                        {ans.candidateAnswer ? (
                                                            ans.type === "multiple_choice_weighted" ? (
                                                                <div className="px-2.5 py-1.5 rounded flex items-center gap-1.5 font-bold font-sans bg-[var(--color-primary-light)] text-primary border border-[var(--color-border-accent)]">
                                                                    <span className="material-symbols-outlined text-[14px]">
                                                                        radio_button_checked
                                                                    </span>
                                                                    {ans.candidateAnswer} (Weight: {ans.earnedWeight || 0})
                                                                </div>
                                                            ) : (
                                                                <div className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 font-bold font-sans
                                                                    ${ans.isCorrect 
                                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                                                                        : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"}`}>
                                                                    <span className="material-symbols-outlined text-[14px]">
                                                                        {ans.isCorrect ? "check_circle" : "cancel"}
                                                                    </span>
                                                                    {ans.candidateAnswer}
                                                                </div>
                                                            )
                                                        ) : (
                                                            <div className="px-2.5 py-1.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] italic font-semibold">
                                                                Skipped / Blank
                                                            </div>
                                                        )}
                                                    </div>

                                                    {ans.type !== "multiple_choice_weighted" && (
                                                        <div className="border-t border-[var(--color-border)] pt-2.5 mt-1">
                                                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase block mb-1">Correct Key Solution</span>
                                                            <div className="px-2.5 py-1.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-main)] font-extrabold">
                                                                {ans.correctAnswer || "Essay / Custom scoring"}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB 3: PROCTORING LOGS TIMELINE */}
                        {viewMode === "violations" && (
                            <div className="space-y-6 animate-fade-in flex-1">
                                <div className="border-b border-[var(--color-border)] pb-3">
                                    <h3 className="text-sm font-bold text-[var(--color-text-main)] uppercase tracking-wider">Proctoring Timeline Audit</h3>
                                    <p className="text-[11px] text-[var(--color-text-sub)] mt-0.5">Chronological record of browser, mouse, screen, and focus anomalies.</p>
                                </div>

                                {data.violations.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-12 text-center gap-3 border-2 border-dashed border-[var(--color-border)] rounded-2xl min-h-[300px]">
                                        <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center glow-success">
                                            <span className="material-symbols-outlined text-[32px]">shield</span>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-extrabold text-[var(--color-text-main)]">Verified Clear</h5>
                                            <p className="text-xs text-[var(--color-text-sub)] mt-1.5 max-w-xs mx-auto font-medium">
                                                The candidate completed the session without triggering tab switches, focus losses, devtools openings, or security flags.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative pl-6 border-l border-[var(--color-border-strong)] space-y-5 max-h-[480px] overflow-y-auto pr-1">
                                        {data.violations.map((v) => (
                                            <div key={v.id} className="relative group/timeline-item">
                                                {/* Timeline circular indicator bullet */}
                                                <div className={`absolute -left-[31px] top-1.5 size-4 rounded-full border-2 flex items-center justify-center bg-[var(--color-bg-card)] transition-all duration-300
                                                    ${v.severity >= 3 
                                                        ? "border-red-500 text-red-500 shadow-md shadow-red-500/20" 
                                                        : v.severity === 2 
                                                            ? "border-amber-500 text-amber-500 shadow-md shadow-amber-500/20" 
                                                            : "border-yellow-400 text-yellow-600 shadow-md shadow-yellow-400/20"}`}
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                </div>

                                                {/* Timeline item card */}
                                                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-hover)]/30 hover:bg-[var(--color-bg-hover)] transition-all duration-200">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-extrabold text-xs text-[var(--color-text-main)] capitalize">
                                                                {v.type.replace(/_/g, ' ')}
                                                            </p>
                                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded
                                                                ${v.severity >= 3 
                                                                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" 
                                                                    : v.severity === 2 
                                                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" 
                                                                        : "bg-yellow-400/10 text-yellow-700 dark:text-yellow-400 border border-yellow-400/20"}`}
                                                            >
                                                                Severity Lvl {v.severity}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] font-mono font-bold">
                                                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                                                            {new Date(v.detectedAt).toLocaleTimeString("id-ID")}
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-[var(--color-text-sub)] font-medium leading-relaxed">
                                                        {v.description || "Anomalous behavior caught by client telemetry hooks."}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
