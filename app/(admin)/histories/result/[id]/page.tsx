import ResultDetailClient from "./ResultDetailClient";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function ResultDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: assignmentId } = await params;

    const assignment = await prisma.testAssignment.findUnique({
        where: { id: assignmentId },
        include: {
            candidate: true,
            test: {
                include: {
                    questions: {
                        orderBy: { sortOrder: "asc" }
                    }
                }
            },
            examSession: true,
            violations: {
                orderBy: { detectedAt: "desc" }
            },
            answers: true
        }
    });

    if (!assignment) {
        notFound();
    }

    // Process data for frontend
    const totalQuestions = assignment.test.questions.length;
    let correctNormal = 0;
    let normalScorableCount = 0;
    let totalWeightedScore = 0;
    let weightedCount = 0;
    let unscorableCount = 0;

    const answersList = assignment.test.questions.map((q) => {
        const isWeighted = q.type === "multiple_choice_weighted";
        const isNormalScorable = !isWeighted && q.correctAnswer && q.correctAnswer.trim() !== "";
        
        if (isWeighted) {
            weightedCount++;
        } else if (isNormalScorable) {
            normalScorableCount++;
        } else {
            unscorableCount++;
        }

        const candidateAnswer = assignment.answers.find(a => a.questionId === q.id);
        const isCorrect = q.correctAnswer && candidateAnswer?.answer === q.correctAnswer;
        
        let earnedWeight = 0;
        if (isWeighted && candidateAnswer?.answer) {
            const weights = (q.optionWeights as Record<string, number>) || {};
            if (typeof weights[candidateAnswer.answer] === 'number') {
                earnedWeight = weights[candidateAnswer.answer];
            }
        }

        if (isWeighted) {
            totalWeightedScore += earnedWeight;
        } else if (isNormalScorable && isCorrect) {
            correctNormal++;
        }

        return {
            id: q.id,
            displayId: q.displayId,
            type: q.type,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            candidateAnswer: candidateAnswer?.answer || null,
            isCorrect: !!isCorrect,
            earnedWeight,
            imageUrl: q.imageUrl,
            answeredAt: candidateAnswer?.answeredAt ? candidateAnswer.answeredAt.toISOString() : null
        };
    });

    // Score calculation
    const calculatedNormalScore = normalScorableCount > 0 ? Math.round((correctNormal / normalScorableCount) * 100) : 0;
    const overallNormalScore = totalQuestions > 0 ? Math.round((correctNormal / totalQuestions) * 100) : 0;

    const resultData = {
        id: assignment.id,
        status: assignment.status,
        startedAt: assignment.startedAt ? assignment.startedAt.toISOString() : null,
        completedAt: assignment.completedAt ? assignment.completedAt.toISOString() : null,
        candidate: {
            id: assignment.candidate.id,
            name: assignment.candidate.name,
            displayId: assignment.candidate.displayId,
            email: assignment.candidate.email,
            batch: assignment.candidate.batch
        },
        test: {
            id: assignment.test.id,
            name: assignment.test.name,
            category: assignment.test.category,
            questionType: assignment.test.questionType,
            duration: assignment.test.duration,
            totalQuestions
        },
        examSession: {
            timeUsedSeconds: assignment.examSession?.timeUsedSeconds || 0,
            autoSubmitted: assignment.examSession?.autoSubmitted || false,
            deviceFingerprint: assignment.examSession?.deviceFingerprint
        },
        violations: assignment.violations.map(v => ({
            id: v.id,
            type: v.type,
            description: v.description,
            severity: v.severity,
            detectedAt: v.detectedAt.toISOString()
        })),
        answers: answersList,
        calculatedNormalScore,
        overallNormalScore,
        totalWeightedScore,
        normalScorableCount,
        weightedCount,
        unscorableCount,
        correctNormalCount: correctNormal
    };

    return <ResultDetailClient data={resultData} />;
}
