import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/tenant";

// GET all tests with question count
export async function GET() {
    try {
        const tests = await prisma.test.findMany({
            include: { questions: true },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(tests);
    } catch (error) {
        console.error("GET /api/tests error:", error);
        return NextResponse.json(
            { error: "Failed to fetch tests" },
            { status: 500 }
        );
    }
}

// POST create test
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const count = await prisma.test.count();
        const displayId = `TST-${String(count + 1).padStart(3, "0")}`;

        const companyId = await getCompanyId();

        const test = await prisma.test.create({
            data: {
                companyId,
                displayId,
                name: body.name,
                category: body.category,
                questionType: body.questionType,
                description: body.description || null,
                duration: body.duration || 30,
            },
            include: { questions: true },
        });

        return NextResponse.json(test, { status: 201 });
    } catch (error) {
        console.error("POST /api/tests error:", error);
        return NextResponse.json(
            { error: "Failed to create test" },
            { status: 500 }
        );
    }
}
