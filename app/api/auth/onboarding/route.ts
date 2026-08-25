import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/auth/onboarding — Get onboarding status of current logged-in user
export async function GET() {
    try {
        const cookieStore = await cookies();
        const candidateId = cookieStore.get("tempCandidateId")?.value || cookieStore.get("candidateId")?.value;
        const userRole = cookieStore.get("userRole")?.value || "user";

        if (!candidateId) {
            return NextResponse.json({ hasCompletedOnboarding: true, role: userRole });
        }

        const candidate = await prisma.candidate.findUnique({
            where: { id: candidateId },
            select: { hasCompletedOnboarding: true, role: true, name: true }
        });

        if (!candidate) {
            return NextResponse.json({ hasCompletedOnboarding: true, role: userRole });
        }

        return NextResponse.json({
            hasCompletedOnboarding: candidate.hasCompletedOnboarding,
            role: candidate.role,
            name: candidate.name,
        });

    } catch (error) {
        console.error("GET /api/auth/onboarding error:", error);
        return NextResponse.json({ hasCompletedOnboarding: true }, { status: 500 });
    }
}

// POST /api/auth/onboarding — Complete onboarding tour for current logged-in user
export async function POST() {
    try {
        const cookieStore = await cookies();
        const candidateId = cookieStore.get("tempCandidateId")?.value || cookieStore.get("candidateId")?.value;

        if (candidateId) {
            await prisma.candidate.update({
                where: { id: candidateId },
                data: { hasCompletedOnboarding: true }
            });
        }

        return NextResponse.json({
            success: true,
            message: "Onboarding status successfully saved to database."
        });

    } catch (error) {
        console.error("POST /api/auth/onboarding error:", error);
        return NextResponse.json({ error: "Failed to update onboarding status" }, { status: 500 });
    }
}
