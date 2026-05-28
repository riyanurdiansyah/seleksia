import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// PATCH — mark an assignment as completed
export async function PATCH(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const updated = await prisma.testAssignment.update({
            where: { id },
            data: {
                status: "completed",
                completedAt: new Date(),
            },
            include: {
                candidate: { select: { id: true, displayId: true, name: true } },
                test: { select: { id: true, displayId: true, name: true, category: true } },
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("PATCH /api/assignments/[id]/complete error:", error);
        return NextResponse.json({ error: "Failed to complete assignment" }, { status: 500 });
    }
}
