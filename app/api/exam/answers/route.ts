import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST — save/update an answer for a question
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { assignmentId, questionId, answer } = body as {
            assignmentId: string;
            questionId: string;
            answer: string;
        };

        if (!assignmentId || !questionId || !answer) {
            return NextResponse.json({ error: "assignmentId, questionId, and answer are required" }, { status: 400 });
        }

        // Upsert the answer (create or update)
        const examAnswer = await prisma.examAnswer.upsert({
            where: { assignmentId_questionId: { assignmentId, questionId } },
            update: { answer, answeredAt: new Date() },
            create: { assignmentId, questionId, answer },
        });

        // Update answered count in exam session
        const answeredCount = await prisma.examAnswer.count({
            where: { assignmentId },
        });

        await prisma.examSession.upsert({
            where: { assignmentId },
            update: { answeredCount },
            create: { assignmentId, answeredCount },
        });

        return NextResponse.json(examAnswer);
    } catch (error) {
        console.error("POST /api/exam/answers error:", error);
        return NextResponse.json({ error: "Failed to save answer" }, { status: 500 });
    }
}
