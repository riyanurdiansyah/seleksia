import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST bulk add questions to test
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();

        if (!Array.isArray(body.questions) || body.questions.length === 0) {
            return NextResponse.json({ error: "Invalid or empty questions array" }, { status: 400 });
        }

        const test = await prisma.test.findUnique({
            where: { id },
            select: { companyId: true }
        });
        
        if (!test) {
            return NextResponse.json({ error: "Test not found" }, { status: 404 });
        }

        // Count existing questions for display ID and sortOrder
        const startCount = await prisma.question.count({ where: { testId: id } });
        
        const questionsToCreate = body.questions.map((q: any, index: number) => {
            const currentCount = startCount + index;
            return {
                companyId: test.companyId,
                testId: id,
                displayId: `q-${currentCount + 1}`,
                sortOrder: currentCount,
                type: q.type || "multiple_choice",
                text: q.text || "",
                options: q.options || [],
                optionWeights: q.optionWeights || null,
                correctAnswer: q.correctAnswer || null,
                timeLimit: q.timeLimit ? parseInt(q.timeLimit) : null,
            };
        });

        // Use createMany for bulk insert
        const result = await prisma.question.createMany({
            data: questionsToCreate,
        });

        return NextResponse.json({ message: "Successfully imported questions", count: result.count }, { status: 201 });
    } catch (error) {
        console.error("POST /api/tests/[id]/questions/bulk error:", error);
        return NextResponse.json(
            { error: "Failed to import questions", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
