import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// PATCH — mark an assignment as in_progress (started)
export async function PATCH(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const existing = await prisma.testAssignment.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const dataToUpdate: { status?: "in_progress"; startedAt?: Date } = {};
        if (existing.status !== "in_progress") {
            dataToUpdate.status = "in_progress";
            dataToUpdate.startedAt = new Date();
        }

        const updated = await prisma.testAssignment.update({
            where: { id },
            data: dataToUpdate,
            include: {
                candidate: { select: { id: true, displayId: true, name: true } },
                test: { select: { id: true, displayId: true, name: true, category: true, duration: true } },
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("PATCH /api/assignments/[id]/start error:", error);
        return NextResponse.json({ error: "Failed to start assignment" }, { status: 500 });
    }
}
