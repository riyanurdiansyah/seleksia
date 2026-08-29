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
                    category: true,
                    duration: true,
                    questionType: true,
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

            const candidateAnswer = a.answers.find(ans => ans.questionId === q.id);
            if (candidateAnswer) {
                if (isWeighted) {
                    const weights = (q.optionWeights as Record<string, number>) || {};
                    if (typeof weights[candidateAnswer.answer] === 'number') {
                        totalWeightedScore += weights[candidateAnswer.answer];
                    }
                } else if (isNormalScorable) {
                    if (candidateAnswer.answer === q.correctAnswer) {
                        correctNormal++;
                    }
                }
            }
        });

        const overallNormalScore = a.test.questions.length > 0 ? Math.round((correctNormal / a.test.questions.length) * 100) : 0;
        const calculatedNormalScore = normalScorableCount > 0 ? Math.round((correctNormal / normalScorableCount) * 100) : 0;

        // Compute 3-layer Competency Profile
        const competencyProfile = calculateCompetencyProfile(
            a.test.questions.map(q => ({
                id: q.id,
                competency: q.competency,
                correctAnswer: q.correctAnswer,
                optionWeights: q.optionWeights as Record<string, number> | null,
                type: q.type,
                text: q.text
            })),
            a.answers.map(ans => ({
                questionId: ans.questionId,
                answer: ans.answer
            }))
        );

        return {
            id: a.id,
            candidateName: a.candidate.name,
            candidateId: a.candidate.displayId,
            testName: a.test.name,
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
