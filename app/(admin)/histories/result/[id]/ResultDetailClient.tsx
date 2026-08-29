"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import Breadcrumb from "../../../components/Breadcrumb";
import * as XLSX from "xlsx";
import { globalDialog } from "@/app/providers/DialogProvider";
import { CompetencyProfileResult } from "@/lib/competencyScoring";

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
    competency?: string | null;
    options: string[];
    correctAnswer: string | null;
    candidateAnswer: string | null;
    isCorrect: boolean;
    earnedWeight?: number;
    imageUrl: string | null;
    answeredAt: string | null;
    answerId: string | null;
    score: number | null;
    aiFeedback: string | null;
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
        aiPersonalityInsight?: string | null;
    };
    test: {
        id: string;
        name: string;
        description?: string | null;
        category: string;
        questionType: string;
        duration: number;
        totalQuestions: number;
    };
    aiRecommendation?: string | null;
    aiRecommendationGeneratedAt?: string | null;
    aiPromptContext?: string | null;
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
    answers: Answer[];
    competencyProfile?: CompetencyProfileResult;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
    intelligence: { label: "Intelligence", icon: "psychology", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30" },
    personality: { label: "Personality", icon: "mood", color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-950/20 border-pink-100 dark:border-pink-900/30" },
    aptitude: { label: "Aptitude", icon: "school", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30" },
    projective: { label: "Projective", icon: "draw", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/20 border-teal-100 dark:border-teal-900/30" },
};

const OVERALL_CATEGORY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; desc: string }> = {
    "VERY HIGH": { label: "VERY HIGH", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800", desc: "Penguasaan kompetensi sangat baik" },
    "HIGH": { label: "HIGH", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800", desc: "Penguasaan kompetensi baik" },
    "MIDDLE": { label: "MIDDLE", bg: "bg-yellow-50 dark:bg-yellow-950/40", text: "text-yellow-700 dark:text-yellow-300", border: "border-yellow-200 dark:border-yellow-800", desc: "Penguasaan kompetensi cukup/memadai" },
    "MIDDLE LOW": { label: "MIDDLE LOW", bg: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800", desc: "Penguasaan dasar mulai terlihat, perlu penguatan" },
    "LOW": { label: "LOW", bg: "bg-red-50 dark:bg-red-950/40", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800", desc: "Penguasaan kompetensi masih rendah" }
};

const STATUS_BADGE_CONFIG: Record<string, { bg: string; text: string; icon: string }> = {
    "Key Strength": { bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", icon: "⭐" },
    "Strength": { bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", icon: "🟢" },
    "Adequate": { bg: "bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800", text: "text-yellow-700 dark:text-yellow-300", icon: "🟡" },
    "Development Area": { bg: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800", text: "text-orange-700 dark:text-orange-300", icon: "🟠" },
    "Critical Development": { bg: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-300", icon: "🔴" }
};

export default function ResultDetailClient({ data: initialData }: { data: DetailData }) {
    const [data, setData] = useState<DetailData>(initialData);
    const [viewMode, setViewMode] = useState<"overview" | "answers" | "violations">("overview");
    const [selectedCompetencyFilter, setSelectedCompetencyFilter] = useState<string>("all");
    const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
    const [gradingAnswerId, setGradingAnswerId] = useState<string | null>(null);

    // AI Executive Recommendation States
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [userCustomPrompt, setUserCustomPrompt] = useState("");
    const [isGeneratingAiRec, setIsGeneratingAiRec] = useState(false);

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
    const compProfile = data.competencyProfile;

    const overallCatInfo = OVERALL_CATEGORY_CONFIG[compProfile?.overallCategory || (data.overallNormalScore >= 80 ? "HIGH" : data.overallNormalScore >= 70 ? "MIDDLE" : data.overallNormalScore >= 60 ? "MIDDLE LOW" : "LOW")] || OVERALL_CATEGORY_CONFIG["MIDDLE"];

    // Distinct list of competencies for filtering
    const distinctCompetencies = useMemo(() => {
        const set = new Set<string>();
        data.answers.forEach(a => {
            if (a.competency?.trim()) {
                set.add(a.competency.trim());
            }
        });
        return Array.from(set);
    }, [data.answers]);

    // Filtered answers
    const filteredAnswers = useMemo(() => {
        if (selectedCompetencyFilter === "all") return data.answers;
        return data.answers.filter(a => a.competency?.trim() === selectedCompetencyFilter);
    }, [data.answers, selectedCompetencyFilter]);

    const exportToExcel = () => {
        const worksheetData: any[][] = [
            ["LAPORAN HASIL ASESMEN KANDIDAT - SELEKSIA"],
            [],
            ["1. PROFIL KANDIDAT"],
            ["Nama Lengkap", data.candidate.name],
            ["ID Kandidat", data.candidate.displayId],
            ["Email", data.candidate.email],
            ["Batch", data.candidate.batch || "-"],
            [],
            ["2. HASIL TES & KEPUTUSAN REKOMENDASI"],
            ["Nama Tes", data.test.name],
            ["Skor Akhir", `${data.overallNormalScore} / 100`],
            ["Tingkat Kategori", overallCatInfo.label],
            ["Rekomendasi Penerimaan", compProfile?.hiringRecommendation || "N/A"],
            ["Alasan Rekomendasi", compProfile?.recommendationRationale || "-"],
            ["Batas Waktu", `${data.test.duration} menit`],
            ["Waktu Pengerjaan", `${m} menit ${s} detik`],
            ["Pelanggaran Pengawasan", `${data.violations.length} Catatan Terdeteksi`],
            []
        ];

        if (compProfile?.competencies && compProfile.competencies.length > 0) {
            worksheetData.push(["3. MATRIKS PROFIL KOMPETENSI"]);
            worksheetData.push(["No", "Nama Kompetensi", "Skor (0-100)", "Benar / Total", "Status", "Selisih vs Rata-rata", "Target Benchmark", "Hasil Benchmark"]);

            compProfile.competencies.forEach((c, idx) => {
                const deltaStr = c.deltaVsOverall > 0 ? `+${c.deltaVsOverall}` : `${c.deltaVsOverall}`;
                worksheetData.push([
                    (idx + 1).toString(),
                    c.name,
                    c.score.toString(),
                    `${c.correctCount} / ${c.totalCount}`,
                    c.status,
                    deltaStr,
                    `${c.benchmarkMin}%`,
                    c.passedBenchmark ? "Memenuhi Target" : "Di Bawah Target"
                ]);
            });
            worksheetData.push([]);
        }

        worksheetData.push(["4. AUDIT RINCIAN LEMBAR JAWABAN"]);
        worksheetData.push(["No", "Pertanyaan", "Kompetensi", "Tipe Soal", "Status Jawaban", "Poin Diperoleh", "Jawaban Kandidat", "Kunci Jawaban"]);

        data.answers.forEach((ans, idx) => {
            const cleanText = ans.text.replace(/<[^>]*>/g, "");
            const statusMsg = ans.isCorrect
                ? "Benar"
                : ans.candidateAnswer
                    ? "Salah"
                    : "Dilewati";

            const pointOrWeight = ans.type === "multiple_choice_weighted"
                ? (ans.earnedWeight || 0).toString()
                : ans.isCorrect ? "1" : "0";

            worksheetData.push([
                (idx + 1).toString(),
                cleanText,
                ans.competency || "General Competency",
                ans.type === "multiple_choice_weighted" ? "Multiple Choice (Berbobot)" : ans.type,
                statusMsg,
                pointOrWeight,
                ans.candidateAnswer || "-",
                ans.correctAnswer || "-"
            ]);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

        worksheet["!cols"] = [
            { wch: 6 },
            { wch: 35 },
            { wch: 25 },
            { wch: 20 },
            { wch: 15 },
            { wch: 18 },
            { wch: 20 },
            { wch: 20 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Hasil Asesmen");

        const sanitizedCandidateName = data.candidate.name.replace(/[^a-zA-Z0-9]/g, "_");
        const sanitizedTestName = data.test.name.replace(/[^a-zA-Z0-9]/g, "_");
        const filename = `Sales_Assessment_${sanitizedCandidateName}_${sanitizedTestName}.xlsx`;

        XLSX.writeFile(workbook, filename);
    };

    const handleGenerateInsight = async () => {
        setIsGeneratingInsight(true);
        try {
            const res = await fetch('/api/ai/personality-insight', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ candidateId: data.candidate.id })
            });

            const result = await res.json();

            if (!res.ok) {
                await globalDialog.alert("Gagal: " + (result.error || result.details || "Failed to generate insight"));
                return;
            }

            setData(prev => ({
                ...prev,
                candidate: {
                    ...prev.candidate,
                    aiPersonalityInsight: result.insight
                }
            }));
        } catch (err: any) {
            console.error("Fetch error:", err);
            await globalDialog.alert("Terjadi kesalahan jaringan atau server saat meng-generate insight.");
        } finally {
            setIsGeneratingInsight(false);
        }
    };

    const handleAutoGrade = async (answerId: string) => {
        setGradingAnswerId(answerId);
        try {
            const res = await fetch('/api/ai/grade-essay', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answerId })
            });

            const result = await res.json();

            if (!res.ok) {
                await globalDialog.alert("Gagal: " + (result.error || result.details || "Failed to grade essay"));
                return;
            }

            setData(prev => ({
                ...prev,
                answers: prev.answers.map(ans =>
                    ans.answerId === answerId
                        ? { ...ans, score: result.evaluation.score, aiFeedback: result.evaluation.aiFeedback }
                        : ans
                )
            }));
        } catch (err: any) {
            console.error("Fetch error:", err);
            await globalDialog.alert("Terjadi kesalahan jaringan atau server saat koreksi otomatis.");
        } finally {
            setGradingAnswerId(null);
        }
    };

    const handleGenerateAiRecommendation = async () => {
        try {
            setIsGeneratingAiRec(true);
            const res = await fetch("/api/ai/recommendation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assignmentId: data.id,
                    userCustomPrompt: userCustomPrompt.trim() || undefined
                })
            });

            const result = await res.json();

            if (!res.ok) {
                await globalDialog.alert("Gagal: " + (result.error || result.details || "Gagal membuat rekomendasi AI"));
                return;
            }

            setData(prev => ({
                ...prev,
                aiRecommendation: result.aiRecommendation,
                aiRecommendationGeneratedAt: result.aiRecommendationGeneratedAt,
                aiPromptContext: result.aiPromptContext
            }));
            setAiModalOpen(false);
        } catch (err: any) {
            console.error("AI Generation error:", err);
            await globalDialog.alert("Terjadi kesalahan jaringan atau server saat membuat rekomendasi AI.");
        } finally {
            setIsGeneratingAiRec(false);
        }
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
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl md:text-2xl font-black text-[var(--color-text-main)] tracking-tight">
                                    Laporan Hasil Asesmen Kandidat
                                </h1>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${overallCatInfo.bg} ${overallCatInfo.text} ${overallCatInfo.border}`}>
                                    {overallCatInfo.label}
                                </span>
                            </div>
                            <p className="text-xs text-[var(--color-text-sub)] mt-1 font-medium">
                                Profil Kompetensi, Rekomendasi Kelulusan, dan Audit Lembar Jawaban untuk {data.candidate.name}.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={exportToExcel}
                            className="px-4 py-2 rounded-[var(--radius-sm)] text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 border border-emerald-500/20 shadow-md shadow-emerald-600/10 hover:shadow-lg transition-all btn-press cursor-pointer flex-shrink-0"
                        >
                            <span className="material-symbols-outlined text-[16px]">download</span>
                            Export Laporan Lengkap (XLS)
                        </button>
                    </div>
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
                                <span className="font-semibold">Test: {data.test.name}</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Score Display Panel */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 relative overflow-hidden flex flex-col items-center">
                        <div className="card-shimmer" />
                        <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] self-start">Overall Test Score</p>

                        <div className="relative flex items-center justify-center mt-3.5">
                            <div className={`size-32 rounded-full border-[10px] flex flex-col items-center justify-center shadow-[var(--shadow-xs)]
                                ${data.overallNormalScore >= 80
                                    ? "border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                    : data.overallNormalScore >= 70
                                        ? "border-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                                        : data.overallNormalScore >= 60
                                            ? "border-orange-500/20 text-orange-600 dark:text-orange-400"
                                            : "border-red-500/20 text-red-600 dark:text-red-400"}`}>

                                <span className="text-3xl font-black">{data.overallNormalScore}</span>
                                <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--color-text-sub)] mt-0.5">
                                    {overallCatInfo.label}
                                </span>
                            </div>
                        </div>

                        {/* Breakdown Panel */}
                        <div className="w-full mt-5 space-y-2">
                            <div className="flex justify-between items-center px-3 py-2 bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border)]">
                                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                                    Correct Answers
                                </span>
                                <span className="text-xs font-black text-[var(--color-text-main)]">
                                    {data.correctNormalCount} / {data.test.totalQuestions} Questions
                                </span>
                            </div>

                            <div className={`flex justify-between items-center px-3 py-2 rounded-lg border ${overallCatInfo.bg} ${overallCatInfo.border}`}>
                                <span className={`text-[10px] font-bold uppercase ${overallCatInfo.text}`}>
                                    Score Group
                                </span>
                                <span className={`text-xs font-black ${overallCatInfo.text}`}>
                                    {overallCatInfo.label} ({overallCatInfo.desc})
                                </span>
                            </div>
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
                        <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Security & Proctoring</p>

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
                            <span className="material-symbols-outlined text-[18px]">analytics</span>
                            Ringkasan & Profil Kompetensi
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
                            Lembar Jawaban ({data.answers.length})
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
                            Log Pengawasan
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

                        {/* TAB 1: 3-LAYER COMPETENCY PROFILE & EXECUTIVE DOSSIER */}
                        {viewMode === "overview" && (
                            <div className="space-y-8 animate-fade-in flex-1">

                                {/* LAYER 1: EXECUTIVE DECISION & HIRING RECOMMENDATION BANNER */}
                                {compProfile && (
                                    <div className={`p-5 rounded-2xl border ${compProfile.recommendationBadgeColor.bg} ${compProfile.recommendationBadgeColor.border} space-y-3 relative overflow-hidden`}>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="size-9 rounded-xl bg-white dark:bg-black/20 flex items-center justify-center shadow-sm">
                                                    <span className={`material-symbols-outlined text-[22px] ${compProfile.recommendationBadgeColor.text}`}>
                                                        {compProfile.recommendationBadgeColor.icon}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] block">
                                                        Assessment Decision & Hiring Flag
                                                    </span>
                                                    <h3 className={`text-base font-black ${compProfile.recommendationBadgeColor.text}`}>
                                                        {compProfile.overallCategory} — {compProfile.hiringRecommendation}
                                                    </h3>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-mono font-bold text-[var(--color-text-main)]">
                                                    Overall: {compProfile.overallScore}/100
                                                </span>
                                            </div>
                                        </div>

                                        <p className="text-xs leading-relaxed text-[var(--color-text-main)] font-medium pt-1 border-t border-black/5 dark:border-white/5">
                                            {compProfile.recommendationRationale}
                                        </p>

                                        {compProfile.gateViolations.length > 0 && (
                                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1 mt-2">
                                                <span className="text-[10px] font-black uppercase text-red-700 dark:text-red-400 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">warning</span>
                                                    Perhatian Khusus / Gatekeeper Alert:
                                                </span>
                                                <ul className="list-disc list-inside text-xs text-red-700 dark:text-red-300 space-y-0.5 font-medium">
                                                    {compProfile.gateViolations.map((gv, i) => (
                                                        <li key={i}>{gv}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* LAYER 2: COMPETENCY PROFILE MATRIX */}
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                                        <div>
                                            <h3 className="text-sm font-extrabold text-[var(--color-text-main)] uppercase tracking-wider flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[18px] text-primary">view_timeline</span>
                                                Layer 2 — Competency Profile Matrix
                                            </h3>
                                            <p className="text-[11px] text-[var(--color-text-sub)] mt-0.5">
                                                Evaluasi detail 10 kompetensi × 10 soal, komparasi terhadap target minimal dan selisih terhadap Overall Score.
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-md text-[var(--color-text-muted)] w-max">
                                            {compProfile?.competencies.length || 0} Kompetensi Terukur
                                        </span>
                                    </div>

                                    {compProfile && compProfile.competencies.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-[var(--color-border)] text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider">
                                                        <th className="py-2.5 px-3">Kompetensi</th>
                                                        <th className="py-2.5 px-3 text-center">Soal Benar</th>
                                                        <th className="py-2.5 px-3 text-center">Score</th>
                                                        <th className="py-2.5 px-3 text-center">Status</th>
                                                        <th className="py-2.5 px-3 text-center">vs Overall</th>
                                                        <th className="py-2.5 px-3 text-center">Target Min</th>
                                                        <th className="py-2.5 px-3 w-32">Visual Bar</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[var(--color-border)] text-xs">
                                                    {compProfile.competencies.map((comp, idx) => {
                                                        const statusStyle = STATUS_BADGE_CONFIG[comp.status] || STATUS_BADGE_CONFIG["Adequate"];
                                                        const deltaStr = comp.deltaVsOverall > 0 ? `+${comp.deltaVsOverall}` : `${comp.deltaVsOverall}`;
                                                        const deltaColor = comp.deltaVsOverall > 0
                                                            ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                                                            : comp.deltaVsOverall < 0
                                                                ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
                                                                : "text-gray-600 bg-gray-50 dark:bg-gray-800";

                                                        return (
                                                            <tr key={idx} className="hover:bg-[var(--color-bg-hover)]/50 transition-colors">
                                                                <td className="py-3 px-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-mono text-[var(--color-text-muted)] font-bold">{idx + 1}.</span>
                                                                        <div>
                                                                            <span className="font-bold text-[var(--color-text-main)] block">{comp.name}</span>
                                                                            {comp.isCriticalGate && (
                                                                                <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase">
                                                                                    🛡️ Gatekeeper Special Competency
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 px-3 text-center font-mono font-semibold text-[var(--color-text-sub)]">
                                                                    {comp.correctCount}/{comp.totalCount}
                                                                </td>
                                                                <td className="py-3 px-3 text-center">
                                                                    <span className="font-extrabold text-sm text-[var(--color-text-main)] font-mono">
                                                                        {comp.score}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 px-3 text-center">
                                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${statusStyle.bg} ${statusStyle.text}`}>
                                                                        <span>{statusStyle.icon}</span>
                                                                        {comp.status}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 px-3 text-center">
                                                                    <span className={`inline-block px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${deltaColor}`}>
                                                                        {deltaStr}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 px-3 text-center">
                                                                    <div className="flex items-center justify-center gap-1 font-mono text-[11px]">
                                                                        <span className="text-[var(--color-text-muted)] font-medium">{comp.benchmarkMin}%</span>
                                                                        {comp.passedBenchmark ? (
                                                                            <span className="material-symbols-outlined text-[14px] text-emerald-500" title="Melebihi / memenuhi target minimal">check_circle</span>
                                                                        ) : (
                                                                            <span className="material-symbols-outlined text-[14px] text-amber-500" title="Di bawah target minimal">warning</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 px-3">
                                                                    <div className="w-full bg-[var(--color-bg-elevated)] h-2.5 rounded-full overflow-hidden border border-[var(--color-border)]">
                                                                        <div
                                                                            className={`h-full rounded-full transition-all duration-500
                                                                                ${comp.score >= 90 ? "bg-blue-500" : comp.score >= 80 ? "bg-emerald-500" : comp.score >= 70 ? "bg-yellow-500" : comp.score >= 60 ? "bg-orange-500" : "bg-red-500"}`}
                                                                            style={{ width: `${comp.score}%` }}
                                                                        />
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="p-6 text-center text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] rounded-xl">
                                            Soal-soal pada tes ini belum dikelompokkan berdasarkan kompetensi. Anda dapat menambahkan tag kompetensi pada menu konfigurasi soal.
                                        </div>
                                    )}
                                </div>

                                {/* LAYER 3: TOP STRENGTHS & DEVELOPMENT AREAS CARDS */}
                                {compProfile && compProfile.hasCompetencies && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">

                                        {/* Card Top Strengths */}
                                        <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-3">
                                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                                                <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                                                Top 3 Strengths (Kekuatan Utama)
                                            </div>
                                            <div className="space-y-2">
                                                {compProfile.topStrengths.map((str, i) => (
                                                    <div key={i} className="flex items-center justify-between p-2.5 bg-white dark:bg-[var(--color-bg-card)] rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-xs">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="size-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                                                                {i + 1}
                                                            </span>
                                                            <span className="font-bold text-[var(--color-text-main)] truncate">{str.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                                                                {str.score}%
                                                            </span>
                                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                                                                {str.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Card Top Development Areas */}
                                        <div className="p-5 rounded-2xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 space-y-3">
                                            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-extrabold text-xs uppercase tracking-wider">
                                                <span className="material-symbols-outlined text-[18px]">trending_up</span>
                                                Top 3 Development Focus (Area Pengembangan)
                                            </div>
                                            <div className="space-y-2">
                                                {compProfile.topDevelopmentAreas.map((dev, i) => (
                                                    <div key={i} className="flex items-center justify-between p-2.5 bg-white dark:bg-[var(--color-bg-card)] rounded-xl border border-orange-100 dark:border-orange-900/30 text-xs">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="size-5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                                                                {i + 1}
                                                            </span>
                                                            <span className="font-bold text-[var(--color-text-main)] truncate">{dev.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-extrabold text-orange-600 dark:text-orange-400 text-xs">
                                                                {dev.score}%
                                                            </span>
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${dev.score < 60 ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300" : "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300"}`}>
                                                                {dev.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Recruiter Action & Follow-up Guide */}
                                {data.aiRecommendation ? (
                                    <div className="p-6 bg-gradient-to-br from-primary/10 via-[var(--color-bg-card)] to-accent/5 rounded-2xl border border-primary/30 shadow-[var(--shadow-sm)] space-y-4 animate-fade-in relative overflow-hidden">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                                                    <span className="material-symbols-outlined text-[18px]">psychology</span>
                                                </div>
                                                <h4 className="text-sm font-black text-[var(--color-text-main)]">
                                                    Rekomendasi Tindak Lanjut Eksekutif & Panduan User
                                                </h4>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-primary/15 to-accent/15 text-primary border border-primary/20">
                                                    <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                                                    Dianalisis oleh AI
                                                </span>
                                                {data.aiRecommendationGeneratedAt && (
                                                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                                                        {new Date(data.aiRecommendationGeneratedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {data.aiPromptContext && (
                                            <div className="p-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-sub)] italic flex items-start gap-2">
                                                <span className="material-symbols-outlined text-[15px] text-primary flex-shrink-0 mt-0.5">format_quote</span>
                                                <div>
                                                    <strong className="not-italic text-[var(--color-text-main)]">Konteks Tambahan Recruiter: </strong>
                                                    "{data.aiPromptContext}"
                                                </div>
                                            </div>
                                        )}

                                        <div className="prose prose-sm dark:prose-invert max-w-none text-xs text-[var(--color-text-main)] space-y-3 leading-relaxed">
                                            {data.aiRecommendation.split("\n\n").map((para, idx) => {
                                                if (para.startsWith("### ")) {
                                                    return (
                                                        <h5 key={idx} className="text-xs font-bold uppercase tracking-wider text-primary pt-2 pb-1 border-b border-[var(--color-border)]">
                                                            {para.replace("### ", "")}
                                                        </h5>
                                                    );
                                                }
                                                return (
                                                    <p key={idx} className="whitespace-pre-line text-xs leading-relaxed text-[var(--color-text-sub)]">
                                                        {para}
                                                    </p>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent rounded-2xl border border-[var(--color-border-strong)] space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <h4 className="text-xs font-black uppercase text-[var(--color-text-main)] flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[16px] text-primary">lightbulb</span>
                                                    Rekomendasi Tindak Lanjut Recruiter & User
                                                </h4>
                                                <p className="text-[11px] text-[var(--color-text-sub)] mt-0.5 font-medium">
                                                    Gunakan rekomendasi sistem dasar di bawah atau generate analisis AI komprehensif.
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setAiModalOpen(true)}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-xs font-bold bg-gradient-to-r from-primary to-accent text-white hover:shadow-[0_4px_20px_var(--color-primary-glow)] hover:translate-y-[-1px] transition-all cursor-pointer shadow-md btn-press flex-shrink-0"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                                                Generate Rekomendasi AI (1x)
                                            </button>
                                        </div>

                                        <div className="text-xs text-[var(--color-text-sub)] space-y-1.5 leading-relaxed font-medium bg-[var(--color-bg-card)] p-4 rounded-xl border border-[var(--color-border)]">
                                            <p>
                                                • <strong>Keputusan Penerimaan:</strong> {compProfile?.recommendationRationale || "Gunakan skor keseluruhan dan profil kompetensi sebagai acuan."}
                                            </p>
                                            <p>
                                                • <strong>Fokus Onboarding & Training:</strong> Jika kandidat diterima, fokuskan modul pelatihan pada <strong>{compProfile?.topDevelopmentAreas.map(d => d.name).join(", ") || "kompetensi terkait"}</strong> untuk mempercepat kurva performa di lapangan.
                                            </p>
                                        </div>
                                    </div>
                                )}
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

                                {/* Filter by competency pills */}
                                {distinctCompetencies.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[10px] font-black uppercase text-[var(--color-text-muted)] mr-1">Filter Kompetensi:</span>
                                        <button
                                            onClick={() => setSelectedCompetencyFilter("all")}
                                            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${selectedCompetencyFilter === "all" ? "bg-primary text-white" : "bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)] hover:bg-[var(--color-bg-hover)]"}`}
                                        >
                                            Semua ({data.answers.length})
                                        </button>
                                        {distinctCompetencies.map(comp => {
                                            const count = data.answers.filter(a => a.competency?.trim() === comp).length;
                                            return (
                                                <button
                                                    key={comp}
                                                    onClick={() => setSelectedCompetencyFilter(comp)}
                                                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${selectedCompetencyFilter === comp ? "bg-primary text-white" : "bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)] hover:bg-[var(--color-bg-hover)]"}`}
                                                >
                                                    {comp} ({count})
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                                    {filteredAnswers.map((ans, idx) => (
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
                                                    <div className="flex items-center gap-2.5 flex-wrap">
                                                        <span className="text-[9px] font-mono font-black text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                                                            QUESTION {idx + 1}
                                                        </span>
                                                        {ans.competency && (
                                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                                                {ans.competency}
                                                            </span>
                                                        )}
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
                                                            ans.type === "essay" ? (
                                                                <div className="space-y-2">
                                                                    <div className="px-2.5 py-1.5 rounded flex flex-col font-sans bg-[var(--color-primary-light)] border border-[var(--color-primary)] text-[var(--color-text-main)] text-[11px] whitespace-pre-wrap">
                                                                        {ans.candidateAnswer}
                                                                    </div>
                                                                    <div className="flex justify-between items-center mt-2">
                                                                        <span className="text-[9px] font-black text-purple-600 uppercase">AI Evaluation</span>
                                                                        {ans.answerId && !ans.aiFeedback && (
                                                                            <button onClick={() => handleAutoGrade(ans.answerId!)} disabled={gradingAnswerId === ans.answerId} className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[9px] font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1">
                                                                                <span className="material-symbols-outlined text-[12px]">{gradingAnswerId === ans.answerId ? "hourglass_empty" : "smart_toy"}</span>
                                                                                Auto Grade
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    {ans.aiFeedback && (
                                                                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/40 rounded flex flex-col">
                                                                            <span className="text-purple-700 dark:text-purple-300 font-bold text-[10px] mb-1">Score: {ans.score}/100</span>
                                                                            <span className="text-[10px] text-[var(--color-text-sub)]">{ans.aiFeedback}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : ans.type === "multiple_choice_weighted" ? (
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

                                                    {ans.type !== "multiple_choice_weighted" && ans.type !== "essay" && (
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
                                                <div className={`absolute -left-[31px] top-1.5 size-4 rounded-full border-2 flex items-center justify-center bg-[var(--color-bg-card)] transition-all duration-300
                                                    ${v.severity >= 3
                                                        ? "border-red-500 text-red-500 shadow-md shadow-red-500/20"
                                                        : v.severity === 2
                                                            ? "border-amber-500 text-amber-500 shadow-md shadow-amber-500/20"
                                                            : "border-yellow-400 text-yellow-600 shadow-md shadow-yellow-400/20"}`}
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                </div>

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

            {/* Modal Popup: AI Recommendation Prompt */}
            {aiModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-[8px] z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0" onClick={() => !isGeneratingAiRec && setAiModalOpen(false)} />
                    <div className="relative w-full max-w-lg bg-[var(--color-bg-card)] rounded-3xl border border-[var(--color-border-strong)] shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-slide-in-up overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl text-primary border border-primary/20">
                                    <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[var(--color-text-main)]">
                                        Generate Rekomendasi Tindak Lanjut AI
                                    </h3>
                                    <p className="text-xs text-[var(--color-text-sub)] mt-0.5">
                                        Analisis eksekutif untuk Recruiter & Hiring Manager
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAiModalOpen(false)}
                                disabled={isGeneratingAiRec}
                                className="size-8 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Data Snapshot Card */}
                            <div className="p-3.5 bg-[var(--color-bg-elevated)] rounded-xl border border-[var(--color-border)] space-y-2 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--color-text-muted)] font-medium">Nama Tes:</span>
                                    <span className="font-bold text-[var(--color-text-main)]">{data.test.name}</span>
                                </div>
                                {data.test.description && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-[var(--color-text-muted)] font-medium">Deskripsi Tes:</span>
                                        <span className="font-semibold text-primary truncate max-w-[260px]">{data.test.description}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--color-text-muted)] font-medium">Skor Akhir & Kategori:</span>
                                    <span className="font-mono font-bold text-[var(--color-text-main)]">{data.overallNormalScore}/100 ({overallCatInfo.label})</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--color-text-muted)] font-medium">Status Rekomendasi:</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{compProfile?.hiringRecommendation || "N/A"}</span>
                                </div>
                            </div>

                            {/* Custom Prompt Input */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-[var(--color-text-main)]">
                                    Deskripsi Tambahan / Konteks Posisi (Opsional)
                                </label>
                                <textarea
                                    value={userCustomPrompt}
                                    onChange={(e) => setUserCustomPrompt(e.target.value)}
                                    disabled={isGeneratingAiRec}
                                    placeholder="Contoh: Kandidat melamar untuk posisi Senior Sales Executive B2B. Tim membutuhkan orang yang kuat di negosiasi kontrak besar dan closing cepat. Mohon buatkan pertanyaan wawancara dan rencana onboarding yang selaras..."
                                    rows={4}
                                    className="w-full p-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-primary transition-all disabled:opacity-50 resize-none leading-relaxed"
                                />
                                <p className="text-[11px] text-[var(--color-text-muted)]">
                                    Bisa dikosongkan jika ingin AI membuat analisis murni dari data hasil tes dan profil kompetensi.
                                </p>
                            </div>

                            {/* 1x Rule Warning Alert */}
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
                                <span className="material-symbols-outlined text-[18px] text-amber-500 flex-shrink-0 mt-0.5">info</span>
                                <p className="leading-relaxed">
                                    <strong>Penting:</strong> Fitur generate rekomendasi AI ini hanya dapat dilakukan <strong>1 kali</strong> dan akan disimpan secara permanen pada hasil tes kandidat ini.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
                            <button
                                type="button"
                                onClick={() => setAiModalOpen(false)}
                                disabled={isGeneratingAiRec}
                                className="px-4 py-2 rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--color-text-sub)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-hover)] transition-all cursor-pointer disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleGenerateAiRecommendation}
                                disabled={isGeneratingAiRec}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] text-xs font-bold bg-gradient-to-r from-primary to-accent text-white hover:shadow-[0_4px_20px_var(--color-primary-glow)] transition-all cursor-pointer disabled:opacity-50 btn-press"
                            >
                                {isGeneratingAiRec ? (
                                    <>
                                        <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                        Menganalisis & Menyusun Laporan...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                                        Mulai Analisis AI
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
