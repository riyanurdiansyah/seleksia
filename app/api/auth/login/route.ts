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
                return NextResponse.json({ error: "Sesi ujian Anda belum dimulai." }, { status: 403 });
            }
            if (candidate.accessEnd && now > candidate.accessEnd) {
                return NextResponse.json({ error: "Sesi ujian Anda telah berakhir." }, { status: 403 });
            }
        }

        // Check if password is still the default (displayId)
        if (password === candidate.displayId) {
            const resetResponse = NextResponse.json({
                success: true,
                requirePasswordReset: true,
                candidate: {
                    id: candidate.id,
                    displayId: candidate.displayId,
                    name: candidate.name,
                    email: candidate.email,
                    role: candidate.role,
                },
                redirectTo: "/auth/force-reset"
            });
            resetResponse.cookies.set("tempCandidateId", candidate.id, { path: "/", httpOnly: true });
            return resetResponse;
        }

        // Check role — only 'user' can take exams
        // Set authentication cookies for companyId and role
        const response = NextResponse.json({
          success: true,
          candidate: {
            id: candidate.id,
            displayId: candidate.displayId,
            name: candidate.name,
            email: candidate.email,
            role: candidate.role,
          },
          redirectTo: candidate.role === "admin" || candidate.role === "proctor" || candidate.role === "superadmin" ? "/dashboard" : "/system-check",
        });
        // Add cookies (HttpOnly for security)
        response.cookies.set("companyId", candidate.companyId, { path: "/", httpOnly: true });
        response.cookies.set("userRole", candidate.role, { path: "/", httpOnly: true });
        return response;


    } catch (error) {
        console.error("POST /api/auth/login error:", error);
        return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
    }
}
