import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCompanyId } from "@/lib/tenant";

// GET all test groups for the company
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

        const testGroups = await prisma.testGroup.findMany({
            where: whereClause,
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
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(testGroups);
    } catch (error) {
        console.error("GET /api/test-groups error:", error);
        return NextResponse.json({ error: "Failed to fetch test groups" }, { status: 500 });
    }
}

// POST create test group
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, description, testIds } = body as { name: string; description?: string; testIds: string[] };

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const cookieStore = await cookies();
        const role = cookieStore.get('userRole')?.value;

        // Determine companyId
        let companyId = await getCompanyId();
        if (role === 'superadmin' && body.companyId) {
            companyId = body.companyId;
        }

        const testGroup = await prisma.testGroup.create({
            data: {
                companyId,
                name,
                description: description || null,
                tests: {
                    connect: (testIds || []).map((id) => ({ id })),
                },
            },
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

        return NextResponse.json(testGroup, { status: 201 });
    } catch (error) {
        console.error("POST /api/test-groups error:", error);
        return NextResponse.json({ error: "Failed to create test group" }, { status: 500 });
    }
}
