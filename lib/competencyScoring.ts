// lib/competencyScoring.ts

export type OverallCategory = "LOW" | "MIDDLE LOW" | "MIDDLE" | "HIGH" | "VERY HIGH";
export type CompetencyStatus = "Critical Development" | "Development Area" | "Adequate" | "Strength" | "Key Strength";
export type HiringRecommendation =
    | "RECOMMENDED"
    | "CONSIDER / FURTHER ASSESSMENT"
    | "DEVELOPMENT REQUIRED / CONSIDER"
    | "REVIEW / DEEP DIVE INTERVIEW"
    | "NOT RECOMMENDED";

export interface CompetencyDetail {
    name: string;
    score: number; // 0 - 100
    correctCount: number;
    totalCount: number;
    status: CompetencyStatus;
    category: OverallCategory;
    deltaVsOverall: number; // e.g. +8, -12
    benchmarkMin: number;
    passedBenchmark: boolean;
    isKeyStrength: boolean;
    isCriticalGate: boolean;
    isGateViolated: boolean;
}

export interface CompetencyProfileResult {
    hasCompetencies: boolean;
    totalQuestions: number;
    totalCorrect: number;
    overallScore: number; // 0 - 100
    overallCategory: OverallCategory;
    categoryDescription: string;
    hiringRecommendation: HiringRecommendation;
    recommendationBadgeColor: {
        bg: string;
        text: string;
        border: string;
        icon: string;
    };
    recommendationRationale: string;
    gateViolations: string[];
    topStrengths: CompetencyDetail[];
    topDevelopmentAreas: CompetencyDetail[];
    competencies: CompetencyDetail[];
}

export interface QuestionInput {
    id: string;
    displayId?: string;
    competency?: string | null;
    correctAnswer?: string | null;
    optionWeights?: Record<string, number> | null;
    type?: string;
    text?: string;
}

export interface AnswerInput {
    questionId: string;
    answer: string;
}

// Default benchmark targets per competency
export const DEFAULT_BENCHMARKS: Record<string, number> = {
    "integrity": 80,
    "integritas": 80,
    "compliance & regulation": 70,
    "compliance": 70,
    "regulasi": 70,
    "sales execution & performance control": 70,
    "sales execution": 70,
    "customer focus": 70,
    "target orientation": 70,
    "problem solving": 70,
    "communication": 70,
    "komunikasi": 70,
    "sales process & order": 70,
    "sales process": 70,
    "product knowledge": 60,
    "pengetahuan produk": 60,
    "market share & competitor analysis": 60,
    "market share": 60,
    "analisis pasar": 60,
};

// Competencies that act as strict gatekeepers (e.g. Integrity & Compliance)
export const SPECIAL_GATE_COMPETENCIES = [
    "integrity",
    "integritas",
    "compliance & regulation",
    "compliance",
    "regulasi"
];

export function getOverallCategory(score: number): { category: OverallCategory; description: string } {
    if (score >= 90) {
        return {
            category: "VERY HIGH",
            description: "Penguasaan kompetensi sangat baik dan di atas rata-rata standard."
        };
    }
    if (score >= 80) {
        return {
            category: "HIGH",
            description: "Penguasaan kompetensi baik dan memenuhi ekspektasi sales performa tinggi."
        };
    }
    if (score >= 70) {
        return {
            category: "MIDDLE",
            description: "Penguasaan kompetensi cukup/memadai untuk menjalankan tugas dasar."
        };
    }
    if (score >= 60) {
        return {
            category: "MIDDLE LOW",
            description: "Penguasaan dasar mulai terlihat tetapi masih memerlukan penguatan intensif."
        };
    }
    return {
        category: "LOW",
        description: "Penguasaan kompetensi masih rendah dan membutuhkan pengembangan mendasar."
    };
}

export function getCompetencyStatus(score: number): CompetencyStatus {
    if (score >= 90) return "Key Strength";
    if (score >= 80) return "Strength";
    if (score >= 70) return "Adequate";
    if (score >= 60) return "Development Area";
    return "Critical Development";
}

export function getBenchmarkForCompetency(name: string): number {
    const key = name.trim().toLowerCase();
    for (const [pattern, benchmark] of Object.entries(DEFAULT_BENCHMARKS)) {
        if (key.includes(pattern) || pattern.includes(key)) {
            return benchmark;
        }
    }
    return 70; // default minimum target
}

export function isSpecialGate(name: string): boolean {
    const key = name.trim().toLowerCase();
    return SPECIAL_GATE_COMPETENCIES.some(g => key.includes(g) || g.includes(key));
}

/**
 * Pure calculation function to evaluate candidate test results
 * Supports standard right/wrong questions AND weighted multiple choice points
 */
export function calculateCompetencyProfile(
    questions: QuestionInput[],
    answers: AnswerInput[]
): CompetencyProfileResult {
    const totalQuestions = questions.length;
    if (totalQuestions === 0) {
        return {
            hasCompetencies: false,
            totalQuestions: 0,
            totalCorrect: 0,
            overallScore: 0,
            overallCategory: "LOW",
            categoryDescription: "No questions evaluated",
            hiringRecommendation: "NOT RECOMMENDED",
            recommendationBadgeColor: {
                bg: "bg-red-50 dark:bg-red-950/30",
                text: "text-red-700 dark:text-red-400",
                border: "border-red-200 dark:border-red-900/40",
                icon: "cancel"
            },
            recommendationRationale: "Tidak ada data soal yang dievaluasi.",
            gateViolations: [],
            topStrengths: [],
            topDevelopmentAreas: [],
            competencies: []
        };
    }

    const answerMap = new Map<string, string>();
    answers.forEach(a => answerMap.set(a.questionId, a.answer));

    let totalEarnedScore = 0;
    let totalMaxScore = 0;
    let totalFullMatches = 0;
    const competencyGroups = new Map<string, { total: number; earned: number; max: number; fullMatches: number }>();
    let distinctCompetencyCount = 0;

    questions.forEach(q => {
        const candidateAnswer = answerMap.get(q.id);
        const isWeighted = q.type === "multiple_choice_weighted" || (q.optionWeights && Object.keys(q.optionWeights).length > 0);

        let earnedPoints = 0;
        let maxPoints = 1;

        if (isWeighted && q.optionWeights) {
            const weights = q.optionWeights as Record<string, number>;
            const weightValues = Object.values(weights);
            maxPoints = weightValues.length > 0 ? Math.max(...weightValues) : 1;
            if (maxPoints <= 0) maxPoints = 1;

            if (candidateAnswer && typeof weights[candidateAnswer] === "number") {
                earnedPoints = weights[candidateAnswer];
            }
        } else if (q.correctAnswer && q.correctAnswer.trim() !== "") {
            maxPoints = 1;
            if (candidateAnswer && candidateAnswer === q.correctAnswer) {
                earnedPoints = 1;
            }
        } else {
            // Unscored / open question default
            maxPoints = 1;
            earnedPoints = 0;
        }

        const isFullMatch = earnedPoints >= maxPoints && maxPoints > 0;
        if (isFullMatch) totalFullMatches++;

        totalEarnedScore += earnedPoints;
        totalMaxScore += maxPoints;

        const compName = q.competency?.trim() || "General Competency";
        if (!competencyGroups.has(compName)) {
            if (q.competency?.trim()) distinctCompetencyCount++;
            competencyGroups.set(compName, { total: 0, earned: 0, max: 0, fullMatches: 0 });
        }
        const group = competencyGroups.get(compName)!;
        group.total += 1;
        group.earned += earnedPoints;
        group.max += maxPoints;
        if (isFullMatch) group.fullMatches += 1;
    });

    const hasCompetencies = distinctCompetencyCount > 1;
    const overallScore = totalMaxScore > 0 ? Math.round((totalEarnedScore / totalMaxScore) * 100) : 0;
    const { category: overallCategory, description: categoryDescription } = getOverallCategory(overallScore);

    const competencies: CompetencyDetail[] = [];
    const gateViolations: string[] = [];

    competencyGroups.forEach((val, name) => {
        const score = val.max > 0 ? Math.round((val.earned / val.max) * 100) : 0;
        const status = getCompetencyStatus(score);
        const { category } = getOverallCategory(score);
        const deltaVsOverall = score - overallScore;
        const benchmarkMin = getBenchmarkForCompetency(name);
        const passedBenchmark = score >= benchmarkMin;
        const isKeyStrength = score >= 90;
        const isGate = isSpecialGate(name);
        const isGateViolated = isGate ? score < benchmarkMin : score < 60;

        if (isGate && score < benchmarkMin) {
            gateViolations.push(`${name} (${score}%) berada di bawah ambang batas minimal (${benchmarkMin}%)`);
        } else if (score < 60) {
            gateViolations.push(`${name} (${score}%) terdeteksi sebagai Critical Development Area (<60%)`);
        }

        competencies.push({
            name,
            score,
            correctCount: val.fullMatches,
            totalCount: val.total,
            status,
            category,
            deltaVsOverall,
            benchmarkMin,
            passedBenchmark,
            isKeyStrength,
            isCriticalGate: isGate,
            isGateViolated
        });
    });

    // Sort competencies for top strengths & development areas
    const sortedDesc = [...competencies].sort((a, b) => b.score - a.score || b.totalCount - a.totalCount);
    const sortedAsc = [...competencies].sort((a, b) => a.score - b.score || a.totalCount - b.totalCount);

    const topStrengths = sortedDesc.slice(0, 3);
    const topDevelopmentAreas = sortedAsc.slice(0, 3);

    // Hiring Recommendation logic
    let hiringRecommendation: HiringRecommendation;
    let recommendationRationale = "";

    const hasSpecialGateBreach = competencies.some(c => c.isCriticalGate && !c.passedBenchmark);
    const hasCriticalUnder60 = competencies.some(c => c.score < 60);

    if (hasSpecialGateBreach) {
        hiringRecommendation = "REVIEW / DEEP DIVE INTERVIEW";
        recommendationRationale = `Kandidat memiliki nilai keseluruhan ${overallCategory} (${overallScore}%), namun terdeteksi kelemahan pada kompetensi kritikal gatekeeper (${gateViolations.join("; ")}). Diperlukan pendalaman terstruktur saat interview user/HR sebelum keputusan final.`;
    } else if (overallScore >= 80) {
        if (hasCriticalUnder60) {
            hiringRecommendation = "REVIEW / DEEP DIVE INTERVIEW";
            recommendationRationale = `Overall score tinggi (${overallScore}%), namun ada kompetensi yang berada di kategori Critical (<60%). Disarankan klarifikasi interview pada area pengembangan terkait.`;
        } else {
            hiringRecommendation = "RECOMMENDED";
            recommendationRationale = `Kandidat menunjukkan profil kompetensi yang solid (${overallScore}% - ${overallCategory}) tanpa ada pelanggaran nilai kritikal. Sangat direkomendasikan untuk tahap lanjut.`;
        }
    } else if (overallScore >= 70) {
        if (hasCriticalUnder60) {
            hiringRecommendation = "REVIEW / DEEP DIVE INTERVIEW";
            recommendationRationale = `Overall score memadai (${overallScore}%), namun memerlukan verifikasi interview mendalam pada area kompetensi yang di bawah ambang batas.`;
        } else {
            hiringRecommendation = "CONSIDER / FURTHER ASSESSMENT";
            recommendationRationale = `Kandidat memenuhi kualifikasi dasar (${overallScore}% - ${overallCategory}). Dapat dipertimbangkan dengan rencana pembinaan terarah.`;
        }
    } else if (overallScore >= 60) {
        hiringRecommendation = "DEVELOPMENT REQUIRED / CONSIDER";
        recommendationRationale = `Kandidat berada pada tingkat Middle Low (${overallScore}%). Memerlukan program training dan mentoring intensif jika diputuskan untuk direkrut.`;
    } else {
        hiringRecommendation = "NOT RECOMMENDED";
        recommendationRationale = `Overall score di bawah batas minimum kelulusan (${overallScore}% - LOW). Penguasaan kompetensi belum memenuhi standar posisi sales.`;
    }

    // Recommendation badge visual styling
    const badgeColors: Record<HiringRecommendation, { bg: string; text: string; border: string; icon: string }> = {
        "RECOMMENDED": {
            bg: "bg-emerald-50 dark:bg-emerald-950/30",
            text: "text-emerald-700 dark:text-emerald-400",
            border: "border-emerald-200 dark:border-emerald-900/40",
            icon: "verified"
        },
        "CONSIDER / FURTHER ASSESSMENT": {
            bg: "bg-amber-50 dark:bg-amber-950/30",
            text: "text-amber-700 dark:text-amber-400",
            border: "border-amber-200 dark:border-amber-900/40",
            icon: "help_outline"
        },
        "DEVELOPMENT REQUIRED / CONSIDER": {
            bg: "bg-orange-50 dark:bg-orange-950/30",
            text: "text-orange-700 dark:text-orange-400",
            border: "border-orange-200 dark:border-orange-900/40",
            icon: "trending_up"
        },
        "REVIEW / DEEP DIVE INTERVIEW": {
            bg: "bg-purple-50 dark:bg-purple-950/30",
            text: "text-purple-700 dark:text-purple-400",
            border: "border-purple-200 dark:border-purple-900/40",
            icon: "policy"
        },
        "NOT RECOMMENDED": {
            bg: "bg-red-50 dark:bg-red-950/30",
            text: "text-red-700 dark:text-red-400",
            border: "border-red-200 dark:border-red-900/40",
            icon: "cancel"
        }
    };

    return {
        hasCompetencies,
        totalQuestions,
        totalCorrect: totalFullMatches,
        overallScore,
        overallCategory,
        categoryDescription,
        hiringRecommendation,
        recommendationBadgeColor: badgeColors[hiringRecommendation],
        recommendationRationale,
        gateViolations,
        topStrengths,
        topDevelopmentAreas,
        competencies
    };
}
