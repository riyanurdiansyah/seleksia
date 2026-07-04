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
            // Convert current time to WIB (UTC+7) for date comparison
            const offset = 7 * 60 * 60 * 1000;
            const localNow = new Date(Date.now() + offset);
            const todayStr = localNow.toISOString().split('T')[0];

            if (candidate.accessStart) {
                const startStr = candidate.accessStart.toISOString().split('T')[0];
                if (todayStr < startStr) {
                    return NextResponse.json({ error: "Your access period has not started yet." }, { status: 403 });
                }
            }
            if (candidate.accessEnd) {
                const endStr = candidate.accessEnd.toISOString().split('T')[0];
                if (todayStr > endStr) {
                    return NextResponse.json({ error: "Your access period has expired." }, { status: 403 });
                }
            }
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
