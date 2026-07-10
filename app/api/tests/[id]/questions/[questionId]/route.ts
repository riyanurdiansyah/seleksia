import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";

// DELETE a question
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; questionId: string }> }
) {
    try {
        const { questionId } = await params;

        // Fetch question first to get the image URLs
        const question = await prisma.question.findUnique({
            where: { id: questionId },
            select: { imageUrl: true, options: true }
        });

        if (question) {
            // Helper function to safely delete file
            const safelyDeleteFile = async (fileUrl: string) => {
                if (fileUrl && fileUrl.startsWith('/uploads/questions/')) {
                    try {
                        const filePath = path.join(process.cwd(), 'public', fileUrl);
                        await unlink(filePath);
                    } catch (err) {
                        // Ignore if file doesn't exist
                    }
                }
            };

            // Delete main question image
            if (question.imageUrl) {
                await safelyDeleteFile(question.imageUrl);
            }

            // Delete images in options (if any)
            if (Array.isArray(question.options)) {
                for (const option of question.options) {
                    if (typeof option === 'string' && option.startsWith('/uploads/questions/')) {
                        await safelyDeleteFile(option);
                    }
                }
            }
        }

        await prisma.question.delete({ where: { id: questionId } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE question error:", error);
        return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
    }
}

// PATCH update a question
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; questionId: string }> }
) {
    try {
        const { questionId } = await params;
        const body = await req.json();

        const data: Record<string, unknown> = {};
        if (body.text !== undefined) data.text = body.text;
        if (body.type !== undefined) data.type = body.type;
        if (body.options !== undefined) data.options = body.options;
        if (body.correctAnswer !== undefined) data.correctAnswer = body.correctAnswer;
        if (body.timeLimit !== undefined) data.timeLimit = body.timeLimit;
        if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
        if (body.optionWeights !== undefined) data.optionWeights = body.optionWeights;

        const question = await prisma.question.update({
            where: { id: questionId },
            data,
        });

        return NextResponse.json(question);
    } catch (error) {
        console.error("PATCH question error:", error);
        return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
    }
}
