"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DataTable, { ColumnDef } from "../../components/DataTable";
import Breadcrumb from "../../components/Breadcrumb";

interface ResultData {
    id: string; // The assignment ID
    candidateName: string;
    candidateId: string;
    testName: string;
    testDescription?: string;
    category: string;
    batch: string;
    completedAt: string;
    timeUsedSeconds: number;
    answeredCount: number;
    violations: number;
    autoSubmitted: boolean;
    overallNormalScore: number;
    calculatedNormalScore: number;
    totalWeightedScore: number;
    normalScorableCount: number;
    weightedCount: number;
    unscorableCount: number;
    competencyProfile?: {
        hasCompetencies: boolean;
        overallCategory: string;
        hiringRecommendation: string;
        recommendationBadgeColor: {
            bg: string;
            text: string;
            border: string;
            icon: string;
        };
        topStrengths: string[];
        topDevelopmentAreas: string[];
        gateViolationsCount: number;
    };
}

interface GroupedCandidate {
    candidateId: string;
    candidateName: string;
    batch: string;
    overallRecommendation: string;
    totalTests: number;
    latestCompletion: string;
    results: ResultData[];
}

const computeOverallRecommendation = (results: ResultData[]) => {
    if (!results || results.length === 0) return "-";
    const totalTests = results.length;
    const avgScore = Math.round(results.reduce((acc, r) => acc + (r.overallNormalScore || 0), 0) / totalTests);
    const totalGateViolations = results.reduce((acc, r) => acc + (r.competencyProfile?.gateViolationsCount || 0), 0);

    if (avgScore < 60) return `Not Recommended ${avgScore}`;
    if (totalGateViolations > 0 || results.some(r => r.competencyProfile?.hiringRecommendation === "REVIEW / DEEP DIVE INTERVIEW")) {
        return `Deep Dive Review ${avgScore}`;
    }
    if (avgScore >= 80) return `Recommended ${avgScore}`;
    if (avgScore >= 70) return `Consider Assessment ${avgScore}`;
    return `Development Required ${avgScore}`;
};

const categoryConfig: Record<string, { label: string; icon: string; color: string }> = {
    intelligence: { label: "Intelligence", icon: "psychology", color: "text-brand-teal bg-brand-sky/20 dark:bg-brand-sky/5" },
    personality: { label: "Personality", icon: "mood", color: "text-pink-600 bg-pink-50 dark:bg-pink-900/20" },
    aptitude: { label: "Aptitude", icon: "school", color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
    projective: { label: "Projective", icon: "draw", color: "text-teal-600 bg-teal-50 dark:bg-teal-900/20" },
};

const OVERALL_CATEGORY_BADGES: Record<string, {
    bg: string;
    text: string;
    border: string;
    dot: string;
    bar: string;
    boxBg: string;
    label: string;
}> = {
    "VERY HIGH": {
        bg: "bg-emerald-50/80 dark:bg-emerald-950/40",
        text: "text-emerald-700 dark:text-emerald-300",
        border: "border-emerald-200/80 dark:border-emerald-800/60",
        dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]",
        bar: "bg-gradient-to-r from-emerald-500 to-teal-400",
        boxBg: "bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
        label: "Very High"
    },
    "HIGH": {
        bg: "bg-teal-50/80 dark:bg-teal-950/40",
        text: "text-teal-700 dark:text-teal-300",
        border: "border-teal-200/80 dark:border-teal-800/60",
        dot: "bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.7)]",
        bar: "bg-teal-500",
        boxBg: "bg-teal-50/90 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60",
        label: "High"
    },
    "MIDDLE": {
        bg: "bg-amber-50/80 dark:bg-amber-950/40",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-200/80 dark:border-amber-800/60",
        dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]",
        bar: "bg-amber-500",
        boxBg: "bg-amber-50/90 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
        label: "Middle"
    },
    "MIDDLE LOW": {
        bg: "bg-orange-50/80 dark:bg-orange-950/40",
        text: "text-orange-700 dark:text-orange-300",
        border: "border-orange-200/80 dark:border-orange-800/60",
        dot: "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.7)]",
        bar: "bg-orange-500",
        boxBg: "bg-orange-50/90 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/60",
        label: "Middle Low"
    },
    "LOW": {
        bg: "bg-rose-50/80 dark:bg-rose-950/40",
        text: "text-rose-700 dark:text-rose-300",
        border: "border-rose-200/80 dark:border-rose-800/60",
        dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]",
        bar: "bg-rose-500",
        boxBg: "bg-rose-50/90 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
        label: "Low"
    }
};

const STATUS_BADGE_CONFIG: Record<string, { bg: string; text: string; icon: string }> = {
    "Key Strength": { bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", icon: "⭐" },
    "Strength": { bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", icon: "🟢" },
    "Adequate": { bg: "bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800", text: "text-yellow-700 dark:text-yellow-300", icon: "🟡" },
    "Development Area": { bg: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800", text: "text-orange-700 dark:text-orange-300", icon: "🟠" },
    "Critical Development": { bg: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-300", icon: "🔴" }
};

export function getRecommendationBadgeTheme(rawRec: string, overallScore?: number, gateViolations?: number) {
    const lower = (rawRec || "").toLowerCase().trim();
    
    // 1. Negative / Fail / Not Recommended (Check first so "tidak lolos" is not caught by "lolos")
    if (
        lower.includes("tidak") ||
        lower.includes("not") ||
        lower.includes("gagal") ||
        lower.includes("fail") ||
        lower.includes("belum") ||
        lower.includes("rendah") ||
        lower.includes("grade e") ||
        (overallScore !== undefined && overallScore < 60 && !lower.includes("rekomendasi") && !lower.includes("recommend") && !lower.includes("lolos"))
    ) {
        return {
            badgeTheme: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
            iconName: "cancel",
            displayLabel: rawRec
        };
    }

    // 2. Check gatekeeper / deep dive
    if ((gateViolations && gateViolations > 0 && overallScore !== undefined && overallScore >= 60) || lower.includes("deep dive") || lower.includes("review") || lower.includes("wawancara")) {
        return {
            badgeTheme: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
            iconName: "policy",
            displayLabel: rawRec
        };
    }

    // 3. Recommended / Positive / Lolos / Grade A/B / Rekomendasi
    if (
        lower.includes("rekomendasi") ||
        lower.includes("recommend") ||
        lower.includes("lolos") ||
        lower.includes("pass") ||
        lower.includes("disarankan") ||
        lower.includes("tinggi") ||
        lower.includes("sangat baik") ||
        lower.includes("grade a") ||
        lower.includes("grade b") ||
        (overallScore !== undefined && overallScore >= 80)
    ) {
        return {
            badgeTheme: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
            iconName: "check_circle",
            displayLabel: rawRec
        };
    }

    // 4. Consider / Pertimbangan / Conditional
    if (
        lower.includes("consider") ||
        lower.includes("pertimbang") ||
        lower.includes("cukup") ||
        lower.includes("sedang") ||
        lower.includes("grade c") ||
        (overallScore !== undefined && overallScore >= 70)
    ) {
        return {
            badgeTheme: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
            iconName: "help_outline",
            displayLabel: rawRec
        };
    }

    // 5. Development Required / Pelatihan / Kurang
    if (
        lower.includes("develop") ||
        lower.includes("pelatihan") ||
        lower.includes("kurang") ||
        lower.includes("grade d") ||
        (overallScore !== undefined && overallScore >= 60)
    ) {
        return {
            badgeTheme: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
            iconName: "trending_up",
            displayLabel: rawRec
        };
    }

    // Default fallback based on score or red
    if (overallScore !== undefined && overallScore >= 75) {
        return {
            badgeTheme: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
            iconName: "check_circle",
            displayLabel: rawRec
        };
    }

    return {
        badgeTheme: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
        iconName: "cancel",
        displayLabel: rawRec
    };
}

export function getCategoryBadge(rawCat: string, score?: number) {
    const key = (rawCat || "").toUpperCase().trim();
    if (OVERALL_CATEGORY_BADGES[key]) {
        return OVERALL_CATEGORY_BADGES[key];
    }
    
    // Dynamic matching by score or keywords
    const lower = key.toLowerCase();
    if (lower.includes("sangat") || lower.includes("very") || lower.includes("grade a") || (score !== undefined && score >= 90)) {
        return {
            bg: "bg-emerald-50/80 dark:bg-emerald-950/40",
            text: "text-emerald-700 dark:text-emerald-300",
            border: "border-emerald-200/80 dark:border-emerald-800/60",
            dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]",
            bar: "bg-gradient-to-r from-emerald-500 to-teal-400",
            boxBg: "bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
            label: rawCat
        };
    }
    if (lower.includes("high") || lower.includes("tinggi") || lower.includes("baik") || lower.includes("grade b") || (score !== undefined && score >= 80)) {
        return {
            bg: "bg-teal-50/80 dark:bg-teal-950/40",
            text: "text-teal-700 dark:text-teal-300",
            border: "border-teal-200/80 dark:border-teal-800/60",
            dot: "bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.7)]",
            bar: "bg-teal-500",
            boxBg: "bg-teal-50/90 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60",
            label: rawCat
        };
    }
    if (lower.includes("middle") || lower.includes("sedang") || lower.includes("cukup") || lower.includes("grade c") || (score !== undefined && score >= 70)) {
        return {
            bg: "bg-amber-50/80 dark:bg-amber-950/40",
            text: "text-amber-700 dark:text-amber-300",
            border: "border-amber-200/80 dark:border-amber-800/60",
            dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]",
            bar: "bg-amber-500",
            boxBg: "bg-amber-50/90 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
            label: rawCat
        };
    }
    if (lower.includes("low") || lower.includes("kurang") || lower.includes("grade d") || (score !== undefined && score >= 60)) {
        return {
            bg: "bg-orange-50/80 dark:bg-orange-950/40",
            text: "text-orange-700 dark:text-orange-300",
            border: "border-orange-200/80 dark:border-orange-800/60",
            dot: "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.7)]",
            bar: "bg-orange-500",
            boxBg: "bg-orange-50/90 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/60",
            label: rawCat
        };
    }
    return {
        bg: "bg-rose-50/80 dark:bg-rose-950/40",
        text: "text-rose-700 dark:text-rose-300",
        border: "border-rose-200/80 dark:border-rose-800/60",
        dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]",
        bar: "bg-rose-500",
        boxBg: "bg-rose-50/90 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
        label: rawCat
    };
}

export default function ResultsClient({ initialData }: { initialData: ResultData[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const candidateIdFilter = searchParams.get("candidateId");

    const groupedCandidates = useMemo(() => {
        const map = new Map<string, GroupedCandidate>();
        initialData.forEach(res => {
            const existing = map.get(res.candidateId);
            if (existing) {
                existing.totalTests++;
                existing.results.push(res);
                if (new Date(res.completedAt) > new Date(existing.latestCompletion)) {
                    existing.latestCompletion = res.completedAt;
                }
                existing.overallRecommendation = computeOverallRecommendation(existing.results);
            } else {
                const results = [res];
                map.set(res.candidateId, {
                    candidateId: res.candidateId,
                    candidateName: res.candidateName,
                    batch: res.batch,
                    overallRecommendation: computeOverallRecommendation(results),
                    totalTests: 1,
                    latestCompletion: res.completedAt,
                    results
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => new Date(b.latestCompletion).getTime() - new Date(a.latestCompletion).getTime());
    }, [initialData]);

    const candidateColumns = useMemo<ColumnDef<GroupedCandidate>[]>(() => [
        {
            header: "Candidate",
            accessorKey: "candidateName",
            sortable: true,
            filterable: true,
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-[var(--shadow-sm)]">
                        {row.candidateName.charAt(0)}
                    </div>
                    <div>
                        <p className="font-semibold text-sm text-[var(--color-text-main)] group-hover:text-primary transition-colors cursor-pointer">{row.candidateName}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] font-mono mt-0.5">{row.candidateId}</p>
                    </div>
                </div>
            )
        },
        {
            header: "Batch",
            accessorKey: "batch",
            sortable: true,
            filterable: true,
            cell: (row) => <span className="text-xs font-semibold text-[var(--color-text-sub)]">{row.batch}</span>
        },
        {
            header: "Overall Result",
            accessorKey: "overallRecommendation",
            sortable: true,
            filterable: true,
            cell: (row) => {
                const results = row.results;
                if (!results || results.length === 0) return <span className="text-xs text-[var(--color-text-muted)]">-</span>;

                const totalTests = results.length;
                const avgScore = Math.round(results.reduce((acc, r) => acc + (r.overallNormalScore || 0), 0) / totalTests);
                const totalGateViolations = results.reduce((acc, r) => acc + (r.competencyProfile?.gateViolationsCount || 0), 0);

                const customGateRec = results.find(r => (r.competencyProfile?.gateViolationsCount || 0) > 0)?.competencyProfile?.hiringRecommendation;
                const topRec = results[0]?.competencyProfile?.hiringRecommendation;

                let displayLabel = "Development Required";
                let iconName = "trending_up";
                let badgeTheme = "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20";
                let scoreTheme = "bg-orange-50/90 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/60";

                if (avgScore < 60) {
                    displayLabel = "Not Recommended";
                    iconName = "cancel";
                    badgeTheme = "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20";
                    scoreTheme = "bg-rose-50/90 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60";
                } else if (totalGateViolations > 0) {
                    displayLabel = (customGateRec && !customGateRec.toUpperCase().includes("NOT RECOMMENDED")) ? customGateRec : "Syarat Mutlak Tidak Terpenuhi";
                    iconName = "policy";
                    badgeTheme = "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20";
                    scoreTheme = "bg-purple-50/90 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60";
                } else if (avgScore >= 80) {
                    displayLabel = topRec || "Recommended";
                    iconName = "check_circle";
                    badgeTheme = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
                    scoreTheme = "bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60";
                } else if (avgScore >= 70) {
                    displayLabel = "Consider Assessment";
                    iconName = "help_outline";
                    badgeTheme = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
                    scoreTheme = "bg-amber-50/90 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60";
                }

                return (
                    <div className="flex items-center gap-3 py-1">
                        <div className={`size-10 rounded-xl flex flex-col items-center justify-center border font-mono font-black ${scoreTheme} shadow-2xs flex-shrink-0`}>
                            <span className="text-xs font-sans font-extrabold leading-none">{avgScore}</span>
                            <span className="text-[8px] opacity-60 leading-none mt-0.5">/100</span>
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeTheme} w-max shadow-2xs`}>
                                <span className="material-symbols-outlined text-[14px]">{iconName}</span>
                                <span>{displayLabel}</span>
                            </div>
                            {totalGateViolations > 0 && avgScore >= 60 && (
                                <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 pl-0.5">
                                    <span className="material-symbols-outlined text-[12px] text-amber-500">warning</span>
                                    <span>{totalGateViolations} Gatekeeper Alert</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            }
        },
        {
            header: "Tests Completed",
            accessorKey: "totalTests",
            sortable: true,
            filterable: true,
            cell: (row) => (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--color-primary-light)] text-primary border border-primary/10">
                    {row.totalTests} Tests
                </span>
            )
        },
        {
            header: "Last Activity",
            accessorKey: "latestCompletion",
            sortable: true,
            filterable: true,
            cell: (row) => (
                <span className="text-xs text-[var(--color-text-sub)] font-medium">
                    {new Date(row.latestCompletion).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
            )
        },
        {
            header: "Actions",
            sortable: false,
            filterable: false,
            className: "text-right w-24",
            cell: (row) => (
                <button
                    onClick={() => router.push(`/histories/result?candidateId=${row.candidateId}`)}
                    className="px-3.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold bg-gradient-to-br from-primary to-accent text-white hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] transition-all inline-block shadow-[0_4px_15px_var(--color-primary-glow)] btn-press cursor-pointer"
                >
                    View Tests
                </button>
            )
        }
    ], [router]);

    const testColumns = useMemo<ColumnDef<ResultData>[]>(() => [
        {
            header: "Test Details",
            accessorKey: "testName",
            sortable: true,
            filterable: true,
            cell: (row) => {
                const cat = categoryConfig[row.category] || categoryConfig.intelligence;
                return (
                    <div className="flex items-center gap-2.5 py-1">
                        <div className={`p-2 rounded-xl ${cat.color} flex-shrink-0 border`}>
                            <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
                        </div>
                        <div className="min-w-0">
                            <span className="text-sm font-bold text-[var(--color-text-main)] truncate block">{row.testName}</span>
                            <div className="flex gap-1.5 items-center mt-0.5 text-[10px] text-[var(--color-text-muted)] flex-wrap">
                                <span className="font-medium">{row.answeredCount} Answered</span>
                                {row.testDescription && (
                                    <span className="text-teal-700 dark:text-teal-300 font-semibold bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800/60 max-w-[280px] truncate" title={row.testDescription}>
                                        {row.testDescription}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            }
        },
        {
            header: "Score & Category",
            accessorKey: "overallCategory",
            sortable: true,
            filterable: true,
            cell: (row) => {
                const categoryKey = row.competencyProfile?.overallCategory || (row.overallNormalScore >= 90 ? "VERY HIGH" : row.overallNormalScore >= 80 ? "HIGH" : row.overallNormalScore >= 70 ? "MIDDLE" : row.overallNormalScore >= 60 ? "MIDDLE LOW" : "LOW");
                const style = getCategoryBadge(categoryKey, row.overallNormalScore);

                return (
                    <div className="flex items-center gap-3 py-1">
                        <div className={`size-11 rounded-xl flex flex-col items-center justify-center border font-mono font-black ${style.boxBg} shadow-2xs flex-shrink-0`}>
                            <span className="text-sm leading-none font-sans font-extrabold">{row.overallNormalScore}</span>
                            <span className="text-[8px] font-bold opacity-60 leading-none mt-1">/100</span>
                        </div>
                        <div className="flex flex-col gap-1.5 min-w-[105px]">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${style.bg} ${style.text} ${style.border} w-max`}>
                                <span className={`size-1.5 rounded-full ${style.dot}`} />
                                {style.label}
                            </span>
                            <div className="w-full bg-[var(--color-bg-elevated)] h-1.5 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
                                <div className={`h-full rounded-full transition-all duration-500 ${style.bar}`} style={{ width: `${Math.min(row.overallNormalScore, 100)}%` }} />
                            </div>
                        </div>
                    </div>
                );
            }
        },
        {
            header: "Status",
            accessorKey: "status",
            sortable: true,
            filterable: true,
            cell: (row) => {
                const score = row.overallNormalScore;
                const status = score >= 90 ? "Key Strength"
                    : score >= 80 ? "Strength"
                    : score >= 70 ? "Adequate"
                    : score >= 60 ? "Development Area"
                    : "Critical Development";

                const style = STATUS_BADGE_CONFIG[status] || STATUS_BADGE_CONFIG["Adequate"];

                return (
                    <div className="flex flex-col gap-1 py-1">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${style.bg} ${style.text} w-max shadow-2xs`}>
                            <span>{style.icon}</span>
                            <span>{status}</span>
                        </span>
                        {row.competencyProfile?.gateViolationsCount && row.competencyProfile.gateViolationsCount > 0 ? (
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 pl-1">
                                <span className="material-symbols-outlined text-[13px] text-amber-500">warning</span>
                                <span>{row.competencyProfile.gateViolationsCount} Gatekeeper Alert</span>
                            </div>
                        ) : null}
                    </div>
                );
            }
        },
        {
            header: "Time Used",
            accessorKey: "timeUsedSeconds",
            sortable: true,
            filterable: true,
            cell: (row) => {
                const m = Math.floor(row.timeUsedSeconds / 60);
                const s = row.timeUsedSeconds % 60;
                return (
                    <span className="text-xs font-mono text-[var(--color-text-sub)] bg-[var(--color-bg-elevated)] px-2 py-1 rounded-[var(--radius-xs)]">
                        {m}m {s}s
                    </span>
                );
            }
        },
        {
            header: "Completed At",
            accessorKey: "completedAt",
            sortable: true,
            filterable: true,
            cell: (row) => (
                <span className="text-xs text-[var(--color-text-sub)] font-medium">
                    {new Date(row.completedAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
            )
        },
        {
            header: "Actions",
            sortable: false,
            filterable: false,
            className: "text-right w-28",
            cell: (row) => (
                <Link href={`/histories/result/${row.id}`} className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold bg-gradient-to-br from-primary to-accent text-white hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] transition-all inline-block shadow-[0_4px_15px_var(--color-primary-glow)] btn-press">
                    View Details
                </Link>
            )
        }
    ], []);

    const selectedCandidate = candidateIdFilter ? groupedCandidates.find(c => c.candidateId === candidateIdFilter) : null;

    return (
        <div className="space-y-6 pb-20 animate-slide-in-up">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        {selectedCandidate ? (
                            <div className="flex flex-col gap-1">
                                <button onClick={() => router.push('/histories/result')} className="text-xs text-[var(--color-text-muted)] hover:text-primary transition-colors flex items-center gap-1 w-max mb-1">
                                    <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                                    Back to Candidates
                                </button>
                                <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">
                                    {selectedCandidate.candidateName}&apos;s Results
                                </h1>
                                <p className="text-sm text-[var(--color-text-sub)] mt-1 font-medium">
                                    View all tests completed by this candidate.
                                </p>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">
                                    Test Results
                                </h1>
                                <p className="text-sm text-[var(--color-text-sub)] mt-1 font-medium">
                                    Select a candidate to view their test scores and detailed answers.
                                </p>
                            </>
                        )}
                    </div>
                    <Breadcrumb />
                </div>
            </div>

            {/* Table */}
            <div className="min-h-[500px]">
                {selectedCandidate ? (
                    <DataTable data={selectedCandidate.results} columns={testColumns} globalSearchPlaceholder="Search tests..." />
                ) : (
                    <DataTable data={groupedCandidates} columns={candidateColumns} globalSearchPlaceholder="Search candidates..." />
                )}
            </div>
        </div>
    );
}
