import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST — submit the exam (complete the assignment + finalize session)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { assignmentId, timeUsedSeconds, autoSubmitted } = body as {
            assignmentId: string;
            timeUsedSeconds: number;
            autoSubmitted: boolean;
        };

        if (!assignmentId) {
            return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
        }

        // Get final counts
        const [answeredCount, totalViolations, assignment] = await Promise.all([
            prisma.examAnswer.count({ where: { assignmentId } }),
            prisma.violation.count({ where: { assignmentId } }),
            prisma.testAssignment.findUnique({
                where: { id: assignmentId },
                include: { test: { include: { questions: { select: { id: true } } } } },
            }),
        ]);

        const totalQuestions = assignment?.test.questions.length ?? 0;

        // Update exam session
        await prisma.examSession.upsert({
            where: { assignmentId },
            update: {
                answeredCount,
                totalViolations,
                totalQuestions,
                timeUsedSeconds: timeUsedSeconds || 0,
                autoSubmitted: autoSubmitted || false,
            },
            create: {
                assignmentId,
                answeredCount,
                totalViolations,
                totalQuestions,
                timeUsedSeconds: timeUsedSeconds || 0,
                autoSubmitted: autoSubmitted || false,
            },
        });

        // Mark assignment as completed
        await prisma.testAssignment.update({
            where: { id: assignmentId },
            data: {
                status: "completed",
                completedAt: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            summary: {
                answeredCount,
                totalQuestions,
                totalViolations,
                timeUsedSeconds,
                autoSubmitted,
            },
        });
    } catch (error) {
        console.error("POST /api/exam/submit error:", error);
        return NextResponse.json({ error: "Failed to submit exam" }, { status: 500 });
    }
}
