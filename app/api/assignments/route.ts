import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

import { cookies } from "next/headers";
import { getCompanyId } from "@/lib/tenant";

// GET all assignments with candidate & test info
export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const role = cookieStore.get('userRole')?.value;
        const companyIdFilter = req.nextUrl.searchParams.get('companyId');

        const whereClause: any = {};

        if (role === 'superadmin') {
            if (companyIdFilter && companyIdFilter !== 'all') {
                whereClause.candidate = { companyId: companyIdFilter };
            }
        } else {
            const companyId = await getCompanyId();
            whereClause.candidate = { companyId };
        }

        const assignments = await prisma.testAssignment.findMany({
            where: whereClause,
            include: {
                candidate: {
                    select: { id: true, displayId: true, name: true, email: true, batch: true, role: true },
                },
                test: {
                    select: { id: true, displayId: true, name: true, category: true, duration: true, status: true, questions: { select: { id: true } } },
                },
            },
            orderBy: { assignedAt: "desc" },
        });
        return NextResponse.json(assignments);
    } catch (error) {
        console.error("GET /api/assignments error:", error);
        return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
    }
}

// POST create assignments (bulk: assign multiple tests to multiple candidates)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { candidateIds, testIds } = body as { candidateIds: string[]; testIds: string[] };

        if (!candidateIds?.length || !testIds?.length) {
            return NextResponse.json({ error: "candidateIds and testIds are required" }, { status: 400 });
        }

        // Build all assignment pairs, skip duplicates via upsert
        const results = [];
        for (const candidateId of candidateIds) {
            // Get the current max sortOrder for this candidate
            const maxOrder = await prisma.testAssignment.aggregate({
                where: { candidateId },
                _max: { sortOrder: true },
            });
            let nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

            for (const testId of testIds) {
                const assignment = await prisma.testAssignment.upsert({
                    where: { candidateId_testId: { candidateId, testId } },
                    update: {}, // no-op if exists
                    create: { candidateId, testId, sortOrder: nextOrder },
                    include: {
                        candidate: { select: { id: true, displayId: true, name: true, email: true, batch: true, role: true } },
                        test: { select: { id: true, displayId: true, name: true, category: true, duration: true, status: true, questions: { select: { id: true } } } },
                    },
                });
                results.push(assignment);
                nextOrder++;
            }
        }

        return NextResponse.json(results, { status: 201 });
    } catch (error) {
        console.error("POST /api/assignments error:", error);
        return NextResponse.json({ error: "Failed to create assignments" }, { status: 500 });
    }
}

