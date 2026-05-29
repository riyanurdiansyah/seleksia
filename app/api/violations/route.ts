import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST — record a violation during exam
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { assignmentId, type, description, severity, sessionId } = body as {
            assignmentId: string;
            type: string;
            description?: string;
            severity?: number;
            sessionId?: string;
        };

        if (!assignmentId || !type) {
            return NextResponse.json({ error: "assignmentId and type are required" }, { status: 400 });
        }

        // Create the violation record
        const violation = await prisma.violation.create({
            data: {
                assignmentId,
                type: type as never,
                description: description || null,
                severity: severity || 1,
                sessionId: sessionId || null,
            },
        });

        // Get total violation count for this assignment
        const totalViolations = await prisma.violation.count({
            where: { assignmentId },
        });

        // Update exam session violation count if exists
        await prisma.examSession.upsert({
            where: { assignmentId },
            update: { totalViolations },
            create: { assignmentId, totalViolations },
        });

        return NextResponse.json({
            violation,
            totalViolations,
        }, { status: 201 });
    } catch (error) {
        console.error("POST /api/violations error:", error);
        return NextResponse.json({ error: "Failed to record violation" }, { status: 500 });
    }
}

// GET — get violations for an assignment
export async function GET(req: NextRequest) {
    try {
        const assignmentId = req.nextUrl.searchParams.get("assignmentId");

        if (!assignmentId) {
            return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
        }

        const violations = await prisma.violation.findMany({
            where: { assignmentId },
            orderBy: { detectedAt: "desc" },
        });

        return NextResponse.json(violations);
    } catch (error) {
        console.error("GET /api/violations error:", error);
        return NextResponse.json({ error: "Failed to fetch violations" }, { status: 500 });
    }
}
