// lib/competencyScoring.ts

export type OverallCategory = string;
export type CompetencyStatus = "Critical Development" | "Development Area" | "Adequate" | "Strength" | "Key Strength" | string;
export type HiringRecommendation = string;

export interface ScoringBand {
    min: number;
    max: number;
    label: string; // e.g. "VERY HIGH", "GRADE A", "SANGAT BAIK"
    description?: string;
    color?: string; // "emerald" | "teal" | "amber" | "orange" | "rose" | "purple" | "blue"
}

export interface RecommendationRule {
    type: string; // e.g. "RECOMMENDED", "CONSIDER", "DEVELOPMENT_REQUIRED", "NOT_RECOMMENDED", "DEEP_DIVE"
    label: string; // e.g. "Recommended", "Disarankan", "Lolos Tahap 1"
    minOverallScore: number;
    description?: string;
    color?: string;
}

export interface GatekeeperRule {
    competency: string;
    minScore: number;
    action?: "DEEP_DIVE" | "REJECT";
    actionLabel?: string;
}

export interface CustomScoringConfig {
    enabled?: boolean;
    schemeName?: string; // e.g. "Sales 5-Tier Standard", "Company Custom Scheme"
    bands?: ScoringBand[];
    recommendations?: RecommendationRule[];
    benchmarks?: Record<string, number>;
    gatekeepers?: GatekeeperRule[];
}

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
    activeSchemeName?: string;
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

// Built-in SaaS Presets for quick selection
export const PRESET_SCORING_SCHEMES: Record<string, CustomScoringConfig> = {
    "5_tier_sales": {
        enabled: true,
        schemeName: "Standard 5-Tier (Sales Standard)",
        bands: [
            { min: 90, max: 100, label: "VERY HIGH", description: "Penguasaan kompetensi sangat baik dan di atas rata-rata standard.", color: "emerald" },
            { min: 80, max: 89, label: "HIGH", description: "Penguasaan kompetensi baik dan memenuhi ekspektasi performa tinggi.", color: "teal" },
            { min: 70, max: 79, label: "MIDDLE", description: "Penguasaan kompetensi cukup/memadai untuk menjalankan tugas dasar.", color: "amber" },
            { min: 60, max: 69, label: "MIDDLE LOW", description: "Penguasaan dasar mulai terlihat tetapi masih memerlukan penguatan intensif.", color: "orange" },
            { min: 0, max: 59, label: "LOW", description: "Penguasaan kompetensi masih rendah dan membutuhkan pengembangan mendasar.", color: "rose" }
        ],
        recommendations: [
            { type: "RECOMMENDED", label: "Recommended", minOverallScore: 80, color: "emerald", description: "Kandidat memenuhi seluruh kualifikasi standar dan direkomendasikan." },
            { type: "CONSIDER / FURTHER ASSESSMENT", label: "Consider Assessment", minOverallScore: 70, color: "amber", description: "Kandidat berada pada tingkat cukup dan memerlukan pendalaman aspek tertentu." },
            { type: "DEVELOPMENT REQUIRED / CONSIDER", label: "Development Required", minOverallScore: 60, color: "orange", description: "Kandidat memerlukan program pelatihan intensif sebelum dapat mandiri." },
            { type: "NOT_RECOMMENDED", label: "Not Recommended", minOverallScore: 0, color: "rose", description: "Skor belum memenuhi standar minimum kelulusan." }
        ],
        benchmarks: {
            "integrity": 80,
            "integritas": 80,
            "compliance & regulation": 70,
            "compliance": 70,
            "regulasi": 70,
            "sales execution & performance control": 70,
            "customer focus": 70,
            "target orientation": 70,
            "problem solving": 70,
            "communication": 70,
            "sales process & order": 70,
            "product knowledge": 60,
            "market share & competitor analysis": 60
        },
        gatekeepers: [
            { competency: "integrity", minScore: 80, action: "DEEP_DIVE", actionLabel: "Integrity Gatekeeper" },
            { competency: "compliance & regulation", minScore: 70, action: "DEEP_DIVE", actionLabel: "Compliance Gatekeeper" }
        ]
    },
    "3_tier_simple": {
        enabled: true,
        schemeName: "3-Tier Simple (Tinggi / Sedang / Rendah)",
        bands: [
            { min: 80, max: 100, label: "TINGGI", description: "Kompetensi di atas rata-rata.", color: "emerald" },
            { min: 60, max: 79, label: "SEDANG", description: "Kompetensi cukup memadai.", color: "amber" },
            { min: 0, max: 59, label: "RENDAH", description: "Kompetensi di bawah standar.", color: "rose" }
        ],
        recommendations: [
            { type: "RECOMMENDED", label: "Lolos (Disarankan)", minOverallScore: 75, color: "emerald" },
            { type: "CONSIDER", label: "Dipertimbangkan", minOverallScore: 60, color: "amber" },
            { type: "NOT_RECOMMENDED", label: "Tidak Lolos", minOverallScore: 0, color: "rose" }
        ],
        benchmarks: {},
        gatekeepers: []
    },
    "academic_grade": {
        enabled: true,
        schemeName: "Academic Grade (A - E)",
        bands: [
            { min: 85, max: 100, label: "GRADE A", description: "Sangat Memuaskan (Distinction)", color: "emerald" },
            { min: 75, max: 84, label: "GRADE B", description: "Memuaskan (Good)", color: "teal" },
            { min: 60, max: 74, label: "GRADE C", description: "Cukup (Average)", color: "amber" },
            { min: 50, max: 59, label: "GRADE D", description: "Kurang (Below Average)", color: "orange" },
            { min: 0, max: 49, label: "GRADE E", description: "Gagal (Fail)", color: "rose" }
        ],
        recommendations: [
            { type: "RECOMMENDED", label: "Passed (Grade A/B)", minOverallScore: 75, color: "emerald" },
            { type: "CONSIDER", label: "Conditional Pass", minOverallScore: 60, color: "amber" },
            { type: "NOT_RECOMMENDED", label: "Failed", minOverallScore: 0, color: "rose" }
        ],
        benchmarks: {},
        gatekeepers: []
    }
};

// Default benchmark targets per competency (fallback)
export const DEFAULT_BENCHMARKS: Record<string, number> = PRESET_SCORING_SCHEMES["5_tier_sales"].benchmarks || {};

export const SPECIAL_GATE_COMPETENCIES = [
    "integrity",
    "integritas",
    "compliance & regulation",
    "compliance",
    "regulasi"
];

export function getOverallCategory(
    score: number,
    customBands?: ScoringBand[]
): { category: OverallCategory; description: string } {
    const bands = customBands && customBands.length > 0
        ? [...customBands].sort((a, b) => b.min - a.min)
        : PRESET_SCORING_SCHEMES["5_tier_sales"].bands!;

    for (const b of bands) {
        if (score >= b.min && score <= b.max) {
            return {
                category: b.label,
                description: b.description || `Penguasaan kompetensi berada pada rentang ${b.min}-${b.max} (${b.label}).`
            };
        }
    }

    const lowest = bands[bands.length - 1];
    return {
        category: lowest?.label || "LOW",
        description: lowest?.description || "Penguasaan kompetensi masih rendah."
    };
}

export function getCompetencyStatus(
    score: number,
    customBands?: ScoringBand[]
): CompetencyStatus {
    if (customBands && customBands.length > 0) {
        const sortedBands = [...customBands].sort((a, b) => b.min - a.min);
        for (const b of sortedBands) {
            if (score >= b.min && score <= b.max) {
                return b.label;
            }
        }
        return sortedBands[sortedBands.length - 1]?.label || "Critical Development";
    }
    if (score >= 90) return "Key Strength";
    if (score >= 80) return "Strength";
    if (score >= 70) return "Adequate";
    if (score >= 60) return "Development Area";
    return "Critical Development";
}

export function getBenchmarkForCompetency(
    name: string,
    customBenchmarks?: Record<string, number>
): number {
    const key = name.trim().toLowerCase();
    const benchmarks = customBenchmarks && Object.keys(customBenchmarks).length > 0
        ? customBenchmarks
        : DEFAULT_BENCHMARKS;

    for (const [pattern, benchmark] of Object.entries(benchmarks)) {
        const p = pattern.trim().toLowerCase();
        if (key.includes(p) || p.includes(key)) {
            return benchmark;
        }
    }
    return 70; // default minimum target
}

export function isSpecialGate(
    name: string,
    customGatekeepers?: GatekeeperRule[]
): boolean {
    const key = name.trim().toLowerCase();
    if (Array.isArray(customGatekeepers)) {
        return customGatekeepers.some(g => {
            const gk = g.competency.trim().toLowerCase();
            return key.includes(gk) || gk.includes(key);
        });
    }
    return false;
}

/**
 * Pure calculation function to evaluate candidate test results
 * Supports standard right/wrong questions, weighted multiple choice points,
 * and dynamic multi-tenant custom scoring schemes.
 */
export function calculateCompetencyProfile(
    questions: QuestionInput[],
    answers: AnswerInput[],
    customConfig?: CustomScoringConfig | null
): CompetencyProfileResult {
    const totalQuestions = questions.length;
    const schemeName = customConfig?.schemeName || "Default 5-Tier";

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
            competencies: [],
            activeSchemeName: schemeName
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
            
            if (candidateAnswer) {
                const ansKey = candidateAnswer.trim();
                if (typeof weights[ansKey] === "number") {
                    earnedPoints = weights[ansKey];
                } else if (typeof weights[ansKey.toUpperCase()] === "number") {
                    earnedPoints = weights[ansKey.toUpperCase()];
                } else if (typeof weights[ansKey.toLowerCase()] === "number") {
                    earnedPoints = weights[ansKey.toLowerCase()];
                }
            }
        } else if (q.correctAnswer && q.correctAnswer.trim() !== "") {
            maxPoints = 1;
            if (candidateAnswer && candidateAnswer === q.correctAnswer) {
                earnedPoints = 1;
            }
        } else {
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
    const { category: overallCategory, description: categoryDescription } = getOverallCategory(overallScore, customConfig?.bands);

    const competencies: CompetencyDetail[] = [];
    const gateViolations: string[] = [];

    competencyGroups.forEach((val, name) => {
        const score = val.max > 0 ? Math.round((val.earned / val.max) * 100) : 0;
        const status = getCompetencyStatus(score, customConfig?.bands);
        const { category } = getOverallCategory(score, customConfig?.bands);
        const deltaVsOverall = score - overallScore;
        const gateRule = customConfig?.gatekeepers?.find(g => {
            const gk = g.competency.trim().toLowerCase();
            const n = name.trim().toLowerCase();
            return n.includes(gk) || gk.includes(n);
        });
        const benchmarkMin = gateRule ? gateRule.minScore : getBenchmarkForCompetency(name, customConfig?.benchmarks);
        const passedBenchmark = score >= benchmarkMin;
        const isKeyStrength = score >= 90;
        const isGate = isSpecialGate(name, customConfig?.gatekeepers);
        const isGateViolated = isGate && score < benchmarkMin;

        if (isGate && score < benchmarkMin) {
            gateViolations.push(`${name} (${score}%) berada di bawah batas syarat mutlak (${benchmarkMin}%)`);
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

    // Sort competencies by score descending
    const sortedCompetencies = [...competencies].sort((a, b) => b.score - a.score);
    const topStrengths = sortedCompetencies.filter(c => c.score >= 70).slice(0, 3);
    const topDevelopmentAreas = [...sortedCompetencies].reverse().filter(c => c.score < 80).slice(0, 3);

    // Dynamic Recommendation Determination
    let hiringRecommendation: HiringRecommendation = "NOT RECOMMENDED";
    let recommendationRationale = "";

    const hasGateViolation = gateViolations.length > 0;
    const isCriticalGateBreach = competencies.some(c => c.isCriticalGate && c.isGateViolated);

    if (customConfig?.recommendations && customConfig.recommendations.length > 0) {
        const sortedRules = [...customConfig.recommendations].sort((a, b) => b.minOverallScore - a.minOverallScore);
        
        if (isCriticalGateBreach && overallScore >= 60) {
            const breachedGate = customConfig?.gatekeepers?.find(g => {
                const gk = g.competency.trim().toLowerCase();
                const comp = competencies.find(c => c.name.toLowerCase().includes(gk) || gk.includes(c.name.toLowerCase()));
                return comp && comp.isGateViolated;
            });
            hiringRecommendation = breachedGate?.actionLabel || "Review Khusus";
            recommendationRationale = `Overall score memadai (${overallScore}%), namun kompetensi ${breachedGate?.competency || "khusus"} berada di bawah ambang batas minimal. Disarankan wawancara lanjutan.`;
        } else {
            for (const rule of sortedRules) {
                if (overallScore >= rule.minOverallScore) {
                    hiringRecommendation = rule.label || rule.type;
                    recommendationRationale = rule.description || `Overall score ${overallScore}% memenuhi kriteria level ${rule.label}.`;
                    break;
                }
            }
        }
    } else {
        // Standard Default logic
        if (overallScore >= 80 && !hasGateViolation) {
            hiringRecommendation = "RECOMMENDED";
            recommendationRationale = `Overall score tinggi (${overallScore}% - ${overallCategory}) dan seluruh kompetensi memenuhi benchmark standar.`;
        } else if (overallScore >= 70 && !isCriticalGateBreach) {
            hiringRecommendation = "CONSIDER / FURTHER ASSESSMENT";
            recommendationRationale = `Overall score memadai (${overallScore}% - ${overallCategory}). Disarankan pendalaman pada area pengembangan kandidat.`;
        } else if (overallScore >= 60 && !isCriticalGateBreach) {
            hiringRecommendation = "DEVELOPMENT REQUIRED / CONSIDER";
            recommendationRationale = `Overall score berada di level menengah-bawah (${overallScore}% - ${overallCategory}). Memerlukan pelatihan terstruktur.`;
        } else if (isCriticalGateBreach && overallScore >= 60) {
            const breachedGate = customConfig?.gatekeepers?.find(g => {
                const gk = g.competency.trim().toLowerCase();
                const comp = competencies.find(c => c.name.toLowerCase().includes(gk) || gk.includes(c.name.toLowerCase()));
                return comp && comp.isGateViolated;
            });
            hiringRecommendation = breachedGate?.actionLabel || "Review Khusus";
            recommendationRationale = `Overall score tinggi (${overallScore}%), namun ada kompetensi kunci di bawah ambang batas minimal.`;
        } else {
            hiringRecommendation = "NOT RECOMMENDED";
            recommendationRationale = `Overall score di bawah batas minimum kelulusan (${overallScore}% - ${overallCategory}).`;
        }
    }

    const lowerRec = (hiringRecommendation || "").toLowerCase().trim();

    // 1. Negative / Red check first
    const isNegative = lowerRec.includes("tidak") || lowerRec.includes("not") || lowerRec.includes("gagal") || lowerRec.includes("fail") || lowerRec.includes("grade e");

    // 2. Deep Dive / Review check
    const isDeepDive = !isNegative && (lowerRec.includes("review") || lowerRec.includes("deep dive") || lowerRec.includes("wawancara") || lowerRec.includes("gate"));

    // 3. Recommended / Positive (rekomendasi, recommend, lolos, passed, disarankan, grade a/b, or score >= 80)
    const isRec = !isNegative && !isDeepDive && (
        lowerRec.includes("rekomendasi") ||
        lowerRec.includes("recommend") ||
        lowerRec.includes("lolos") ||
        lowerRec.includes("passed") ||
        lowerRec.includes("disarankan") ||
        lowerRec.includes("sangat baik") ||
        lowerRec.includes("tinggi") ||
        lowerRec.includes("grade a") ||
        lowerRec.includes("grade b") ||
        overallScore >= 80
    );

    // 4. Consider / Conditional
    const isConsider = !isNegative && !isDeepDive && !isRec && (
        lowerRec.includes("consider") ||
        lowerRec.includes("pertimbang") ||
        lowerRec.includes("cukup") ||
        lowerRec.includes("grade c") ||
        overallScore >= 70
    );

    // 5. Development
    const isDevelopment = !isNegative && !isDeepDive && !isRec && !isConsider && (
        lowerRec.includes("develop") ||
        lowerRec.includes("pelatihan") ||
        lowerRec.includes("kurang") ||
        lowerRec.includes("grade d") ||
        overallScore >= 60
    );

    const badgeColor = isRec
        ? { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-900/40", icon: "verified" }
        : isDeepDive
            ? { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400", border: "border-purple-200 dark:border-purple-900/40", icon: "policy" }
            : isConsider
                ? { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-900/40", icon: "help_outline" }
                : isDevelopment
                    ? { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-400", border: "border-orange-200 dark:border-orange-900/40", icon: "trending_up" }
                    : { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-400", border: "border-red-200 dark:border-red-900/40", icon: "cancel" };

    return {
        hasCompetencies,
        totalQuestions,
        totalCorrect: totalFullMatches,
        overallScore,
        overallCategory,
        categoryDescription,
        hiringRecommendation,
        recommendationBadgeColor: badgeColor,
        recommendationRationale,
        gateViolations,
        topStrengths,
        topDevelopmentAreas,
        competencies,
        activeSchemeName: schemeName
    };
}
