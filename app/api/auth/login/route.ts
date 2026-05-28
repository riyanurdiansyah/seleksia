import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// POST — login with email/displayId + password
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { username, password } = body as { username: string; password: string };

        if (!username || !password) {
            return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
        }

        // Find candidate by email or displayId
        const candidate = await prisma.candidate.findFirst({
            where: {
                OR: [
                    { email: username.toLowerCase() },
                    { displayId: username.toUpperCase() },
                ],
            },
            include: {
                assignments: {
                    where: { status: "assigned" },
                    orderBy: { sortOrder: "asc" },
                    take: 1,
                    include: {
                        test: { select: { id: true, name: true, category: true } },
                    },
                },
            },
        });

        if (!candidate) {
            return NextResponse.json({ error: "Invalid credentials. Account not found." }, { status: 401 });
        }

        // Verify password with bcrypt
        const passwordMatch = await bcrypt.compare(password, candidate.password);
        if (!passwordMatch) {
            return NextResponse.json({ error: "Invalid credentials. Wrong password." }, { status: 401 });
        }

        // Check access period
        if (candidate.accessType === "range") {
            const now = new Date();
            if (candidate.accessStart && now < candidate.accessStart) {
                return NextResponse.json({ error: "Your access period has not started yet." }, { status: 403 });
            }
            if (candidate.accessEnd && now > candidate.accessEnd) {
                return NextResponse.json({ error: "Your access period has expired." }, { status: 403 });
            }
        }

        // Check role — only 'user' can take exams
        if (candidate.role === "admin" || candidate.role === "proctor" || candidate.role === "superadmin") {
            return NextResponse.json({
                success: true,
                candidate: {
                    id: candidate.id,
                    displayId: candidate.displayId,
                    name: candidate.name,
                    email: candidate.email,
                    role: candidate.role,
                },
                redirectTo: "/dashboard",
            });
        }

        // Check if there are any pending assignments
        const pendingCount = await prisma.testAssignment.count({
            where: { candidateId: candidate.id, status: "assigned" },
        });

        if (pendingCount === 0) {
            // Check if they have completed all
            const completedCount = await prisma.testAssignment.count({
                where: { candidateId: candidate.id, status: "completed" },
            });

            if (completedCount > 0) {
                return NextResponse.json({ error: "You have already completed all assigned tests." }, { status: 403 });
            } else {
                return NextResponse.json({ error: "No tests have been assigned to you yet. Please contact the administrator." }, { status: 403 });
            }
        }

        // Update candidate status to testing
        await prisma.candidate.update({
            where: { id: candidate.id },
            data: { status: "testing" },
        });

        return NextResponse.json({
            success: true,
            candidate: {
                id: candidate.id,
                displayId: candidate.displayId,
                name: candidate.name,
                email: candidate.email,
                role: candidate.role,
                batch: candidate.batch,
            },
            pendingTests: pendingCount,
            redirectTo: "/system-check",
        });
    } catch (error) {
        console.error("POST /api/auth/login error:", error);
        return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
    }
}
