import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/tenant";
import { checkSubscriptionAccess } from "@/lib/subscription";

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

        const companyId = await getCompanyId();
        const access = await checkSubscriptionAccess(companyId, 'delete');
        if (!access.allowed) {
            return NextResponse.json({ error: access.message }, { status: 403 });
        }

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

        const companyId = await getCompanyId();
        const access = await checkSubscriptionAccess(companyId, 'edit');
        if (!access.allowed) {
            return NextResponse.json({ error: access.message }, { status: 403 });
        }

        // Build update data dynamically
        const data: Record<string, unknown> = {};
        
        if (body.status !== undefined) {
            if (body.status === "published") {
                const currentTest = await prisma.test.findUnique({ where: { id }, include: { questions: true } });
                if (!currentTest) return NextResponse.json({ error: "Test not found" }, { status: 404 });
                
                const toUse = body.totalQuestionsToUse !== undefined ? body.totalQuestionsToUse : currentTest.totalQuestionsToUse;
                if (toUse > 0 && currentTest.questions.length < toUse) {
                    return NextResponse.json({ 
                        error: `Gagal mem-publish: Jumlah soal (${currentTest.questions.length}) kurang dari pengaturan total soal yang akan digunakan (${toUse}).` 
                    }, { status: 400 });
                }
            }
            data.status = body.status;
        }

        if (body.name !== undefined) data.name = body.name;
        if (body.category !== undefined) data.category = body.category;
        if (body.questionType !== undefined) data.questionType = body.questionType;
        if (body.description !== undefined) data.description = body.description;
        if (body.duration !== undefined) data.duration = body.duration;
        if (body.totalQuestionsToUse !== undefined) data.totalQuestionsToUse = body.totalQuestionsToUse;

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
