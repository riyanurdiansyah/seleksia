import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET the next pending assignment for a candidate
// Query params: ?candidateId=xxx&assignmentId=yyy
export async function GET(req: NextRequest) {
    try {
        const candidateId = req.nextUrl.searchParams.get("candidateId");
        const assignmentId = req.nextUrl.searchParams.get("assignmentId");

        if (!candidateId) {
            return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
        }

        const whereClause: { candidateId: string; status: { in: ("assigned" | "in_progress")[] }; id?: string } = {
            candidateId,
            status: { in: ["assigned", "in_progress"] },
        };

        if (assignmentId) {
            whereClause.id = assignmentId;
        }

        const nextAssignment = await prisma.testAssignment.findFirst({
            where: whereClause,
            orderBy: { sortOrder: "asc" },
            include: {
                test: {
                    select: {
                        id: true,
                        displayId: true,
                        name: true,
                        category: true,
                        questionType: true,
                        description: true,
                        duration: true,
                        questions: {
                            select: {
                                id: true,
                                displayId: true,
                                type: true,
                                text: true,
                                options: true,
                                imageUrl: true,
                                timeLimit: true,
                                sortOrder: true,
                            },
                            orderBy: { sortOrder: "asc" },
                        },
                    },
                },
                candidate: {
                    select: { id: true, displayId: true, name: true },
                },
                answers: {
                    select: { questionId: true, answer: true },
                },
            },
        });

        if (!nextAssignment) {
            // No more tests to take — all done!
            // Count total and completed for summary
            const [total, completed] = await Promise.all([
                prisma.testAssignment.count({ where: { candidateId } }),
                prisma.testAssignment.count({ where: { candidateId, status: "completed" } }),
            ]);

            return NextResponse.json({
                hasNext: false,
                totalAssignments: total,
                completedAssignments: completed,
            });
        }

        // Count progress info
        const [total, completed] = await Promise.all([
            prisma.testAssignment.count({ where: { candidateId } }),
            prisma.testAssignment.count({ where: { candidateId, status: "completed" } }),
        ]);

        return NextResponse.json({
            hasNext: true,
            assignment: nextAssignment,
            currentNumber: completed + 1,
            totalAssignments: total,
            completedAssignments: completed,
            serverTime: new Date().toISOString(),
        });
    } catch (error) {
        console.error("GET /api/assignments/next error:", error);
        return NextResponse.json({ error: "Failed to fetch next assignment" }, { status: 500 });
    }
}
