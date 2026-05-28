import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST add question to test
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();

        const test = await prisma.test.findUnique({
            where: { id },
            select: { companyId: true }
        });
        if (!test) {
            return NextResponse.json({ error: "Test not found" }, { status: 404 });
        }

        // Count existing questions for display ID
        const count = await prisma.question.count({ where: { testId: id } });
        const displayId = `q-${count + 1}`;

        const question = await prisma.question.create({
            data: {
                companyId: test.companyId,
                displayId,
                type: body.type,
                text: body.text,
                options: body.options || [],
                correctAnswer: body.correctAnswer || null,
                imageUrl: body.imageUrl || null,
                timeLimit: body.timeLimit || null,
                sortOrder: count,
                testId: id,
            },
        });

        return NextResponse.json(question, { status: 201 });
    } catch (error) {
        console.error("POST /api/tests/[id]/questions error:", error);
        return NextResponse.json(
            { error: "Failed to add question", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
