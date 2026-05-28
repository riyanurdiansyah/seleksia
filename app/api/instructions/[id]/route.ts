import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { type, content, testId } = body;

        const instruction = await prisma.instruction.update({
            where: { id },
            data: {
                type,
                content,
                testId: type === "specific" ? testId : null,
            },
            include: {
                test: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        return NextResponse.json(instruction);
    } catch (error) {
        console.error("PUT /api/instructions/[id] error:", error);
        return NextResponse.json({ error: "Failed to update instruction" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await prisma.instruction.delete({
            where: { id },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/instructions/[id] error:", error);
        return NextResponse.json({ error: "Failed to delete instruction" }, { status: 500 });
    }
}
