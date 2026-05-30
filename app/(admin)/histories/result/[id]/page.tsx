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
    let correctAnswersCount = 0;

    const answersList = assignment.test.questions.map((q) => {
        const candidateAnswer = assignment.answers.find(a => a.questionId === q.id);
        const isCorrect = q.correctAnswer && candidateAnswer?.answer === q.correctAnswer;

        if (isCorrect) correctAnswersCount++;

        return {
            id: q.id,
            displayId: q.displayId,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            candidateAnswer: candidateAnswer?.answer || null,
            isCorrect: !!isCorrect,
            imageUrl: q.imageUrl,
            answeredAt: candidateAnswer?.answeredAt ? candidateAnswer.answeredAt.toISOString() : null
        };
    });

    // Simple percentage score for illustrative purposes (depends on your business logic)
    const calculatedScore = totalQuestions > 0 ? Math.round((correctAnswersCount / totalQuestions) * 100) : 0;

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
        calculatedScore
    };

    return <ResultDetailClient data={resultData} />;
}
