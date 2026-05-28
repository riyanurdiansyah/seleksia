import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET single test with questions
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const test = await prisma.test.findUnique({
            where: { id },
            include: { questions: { orderBy: { sortOrder: "asc" } } },
        });
        if (!test) {
            return NextResponse.json({ error: "Test not found" }, { status: 404 });
        }
        return NextResponse.json(test);
    } catch (error) {
        console.error("GET /api/tests/[id] error:", error);
        return NextResponse.json({ error: "Failed to fetch test" }, { status: 500 });
    }
}

// DELETE test
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.test.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/tests/[id] error:", error);
        return NextResponse.json({ error: "Failed to delete test" }, { status: 500 });
    }
}

// PATCH update test (status or full details)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();

        // Build update data dynamically
        const data: Record<string, unknown> = {};
        if (body.status !== undefined) data.status = body.status;
        if (body.name !== undefined) data.name = body.name;
        if (body.category !== undefined) data.category = body.category;
        if (body.questionType !== undefined) data.questionType = body.questionType;
        if (body.description !== undefined) data.description = body.description;
        if (body.duration !== undefined) data.duration = body.duration;

        const test = await prisma.test.update({
            where: { id },
            data,
            include: { questions: { orderBy: { sortOrder: "asc" } } },
        });

        return NextResponse.json(test);
    } catch (error) {
        console.error("PATCH /api/tests/[id] error:", error);
        return NextResponse.json({ error: "Failed to update test" }, { status: 500 });
    }
}
