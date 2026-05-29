import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// PATCH update test group
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name, description, testIds } = body as { name?: string; description?: string; testIds?: string[] };

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (testIds !== undefined) {
            updateData.tests = {
                set: testIds.map((tid) => ({ id: tid })),
            };
        }

        const testGroup = await prisma.testGroup.update({
            where: { id },
            data: updateData,
            include: {
                tests: {
                    select: {
                        id: true,
                        displayId: true,
                        name: true,
                        category: true,
                        duration: true,
                    }
                }
            },
        });

        return NextResponse.json(testGroup);
    } catch (error) {
        console.error("PATCH /api/test-groups/[id] error:", error);
        return NextResponse.json({ error: "Failed to update test group" }, { status: 500 });
    }
}

// DELETE test group
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.testGroup.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/test-groups/[id] error:", error);
        return NextResponse.json({ error: "Failed to delete test group" }, { status: 500 });
    }
}
