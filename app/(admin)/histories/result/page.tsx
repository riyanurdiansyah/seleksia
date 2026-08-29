import { Suspense } from "react";
import ResultsClient from "./ResultsClient";
import { prisma } from "@/lib/prisma";
import { calculateCompetencyProfile } from "@/lib/competencyScoring";

export const dynamic = 'force-dynamic';

export default async function ResultsPage() {
    // Fetch completed test assignments
    const completedAssignments = await prisma.testAssignment.findMany({
        where: { status: "completed" },
        orderBy: { completedAt: "desc" },
        include: {
            candidate: {
                select: {
                    name: true,
                    displayId: true,
                    batch: true
                }
            },
            test: {
                select: {
                    name: true,
                    description: true,
                    category: true,
                    duration: true,
                    questionType: true,
                    scoringConfig: true,
                    company: {
                        select: {
                            scoringConfig: true
                        }
                    },
                    questions: {
                        select: { id: true, type: true, correctAnswer: true, optionWeights: true, competency: true, text: true }
                    }
                }
            },
            examSession: true,
            answers: {
                select: { questionId: true, answer: true }
            },
            _count: {
                select: { violations: true, answers: true }
            }
        }
    });

    const resultsData = completedAssignments.map(a => {
        let normalScorableCount = 0;
        let weightedCount = 0;
        let unscorableCount = 0;
        let correctNormal = 0;
        let totalWeightedScore = 0;

        a.test.questions.forEach(q => {
            const isWeighted = q.type === "multiple_choice_weighted";
            const isNormalScorable = !isWeighted && q.correctAnswer && q.correctAnswer.trim() !== "";
            
            if (isWeighted) {
                weightedCount++;
            } else if (isNormalScorable) {
                normalScorableCount++;
            } else {
                unscorableCount++;
            }

            if (isWeighted && q.optionWeights) {
                const ans = a.answers.find(ans => ans.questionId === q.id);
                if (ans && ans.answer) {
                    const weights = q.optionWeights as Record<string, number>;
                    const ansKey = ans.answer.trim();
                    if (typeof weights[ansKey] === "number") {
                        totalWeightedScore += weights[ansKey];
                    } else if (typeof weights[ansKey.toUpperCase()] === "number") {
                        totalWeightedScore += weights[ansKey.toUpperCase()];
                    } else if (typeof weights[ansKey.toLowerCase()] === "number") {
                        totalWeightedScore += weights[ansKey.toLowerCase()];
                    }
                }
            } else if (isNormalScorable) {
                const ans = a.answers.find(ans => ans.questionId === q.id);
                if (ans) {
                    if (ans.answer === q.correctAnswer) {
                        correctNormal++;
                    }
                }
            }
        });

        // Resolve active scoring config: per-test override > company default > global fallback
        const activeScoringConfig = a.test.scoringConfig || a.test.company?.scoringConfig || null;

        // Compute 3-layer Competency Profile with dynamic tenant config
        const competencyProfile = calculateCompetencyProfile(
            a.test.questions.map(q => ({
                id: q.id,
                competency: q.competency?.trim() || a.test.description?.trim() || "General Competency",
                correctAnswer: q.correctAnswer,
                optionWeights: q.optionWeights as Record<string, number> | null,
                type: q.type,
                text: q.text
            })),
            a.answers.map(ans => ({
                questionId: ans.questionId,
                answer: ans.answer
            })),
            activeScoringConfig as any
        );

        const isTestWeighted = a.test.questionType === "multiple_choice_weighted" || weightedCount > 0;
        const overallNormalScore = isTestWeighted
            ? competencyProfile.overallScore
            : (a.test.questions.length > 0 ? Math.round((correctNormal / a.test.questions.length) * 100) : 0);

        const calculatedNormalScore = isTestWeighted
            ? competencyProfile.overallScore
            : (normalScorableCount > 0 ? Math.round((correctNormal / normalScorableCount) * 100) : 0);

        return {
            id: a.id,
            candidateName: a.candidate.name,
            candidateId: a.candidate.displayId,
            testName: a.test.name,
            testDescription: a.test.description || "",
            category: a.test.category,
            batch: a.candidate.batch || "-",
            completedAt: a.completedAt ? a.completedAt.toISOString() : "",
            timeUsedSeconds: a.examSession?.timeUsedSeconds || 0,
            answeredCount: a.examSession?.answeredCount || a._count.answers,
            violations: a._count.violations,
            autoSubmitted: a.examSession?.autoSubmitted || false,
            overallNormalScore,
            calculatedNormalScore,
            totalWeightedScore,
            normalScorableCount,
            weightedCount,
            unscorableCount,
            overallCategory: competencyProfile.overallCategory,
            hiringRecommendation: competencyProfile.hiringRecommendation,
            competencyProfile: {
                hasCompetencies: competencyProfile.hasCompetencies,
                overallCategory: competencyProfile.overallCategory,
                hiringRecommendation: competencyProfile.hiringRecommendation,
                recommendationBadgeColor: competencyProfile.recommendationBadgeColor,
                topStrengths: competencyProfile.topStrengths.map(s => s.name),
                topDevelopmentAreas: competencyProfile.topDevelopmentAreas.map(d => d.name),
                gateViolationsCount: competencyProfile.gateViolations.length
            }
        };
    });

    return (
        <Suspense fallback={<div className="p-8 text-center text-[var(--color-text-muted)] animate-pulse">Loading results...</div>}>
            <ResultsClient initialData={resultsData} />
        </Suspense>
    );
}
