import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCompanyId } from "@/lib/tenant";

// GET all tests with question count
export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const role = cookieStore.get('userRole')?.value;
        const companyIdFilter = req.nextUrl.searchParams.get('companyId');

        const whereClause: any = {};

        if (role === 'superadmin') {
            if (companyIdFilter && companyIdFilter !== 'all') {
                whereClause.companyId = companyIdFilter;
            }
        } else {
            const companyId = await getCompanyId();
            whereClause.companyId = companyId;
        }

        const tests = await prisma.test.findMany({
            where: whereClause,
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

        const cookieStore = await cookies();
        const role = cookieStore.get('userRole')?.value;

        let companyId = await getCompanyId();
        if (role === 'superadmin' && body.companyId) {
            companyId = body.companyId;
        }

        // Generate display ID safely based on company's max ID
        const existingTests = await prisma.test.findMany({
            where: { companyId, displayId: { startsWith: 'TST-' } },
            select: { displayId: true }
        });

        let maxNum = 0;
        for (const t of existingTests) {
            const numPart = t.displayId.split('-')[1];
            if (numPart) {
                const num = parseInt(numPart, 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
        }
        const displayId = `TST-${String(maxNum + 1).padStart(3, "0")}`;

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
