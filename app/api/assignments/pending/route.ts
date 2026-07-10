import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const candidateId = req.nextUrl.searchParams.get("candidateId");

        if (!candidateId) {
            return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
        }

        const candidate = await prisma.candidate.findUnique({
            where: { id: candidateId },
            select: { companyId: true }
        });

        if (!candidate) {
            return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
        }

        // Find all pending assignments for the user
        const pendingAssignments = await prisma.testAssignment.findMany({
            where: {
                candidateId,
                status: {
                    in: ["assigned", "in_progress"],
                },
            },
            orderBy: { sortOrder: "asc" },
            include: {
                test: {
                    select: {
                        id: true,
                        displayId: true,
                        name: true,
                        category: true,
                        duration: true,
                        // Include specific instructions for this test
                        instructions: {
                            where: { type: "specific" }
                        }
                    },
                },
            },
        });

        // Also fetch general instructions
        const generalInstructions = await prisma.instruction.findMany({
            where: { 
                type: "general",
                companyId: candidate.companyId
            }
        });

        return NextResponse.json({
            assignments: pendingAssignments,
            generalInstructions,
        });

    } catch (error) {
        console.error("GET /api/assignments/pending error:", error);
        return NextResponse.json({ error: "Failed to fetch pending assignments" }, { status: 500 });
    }
}
