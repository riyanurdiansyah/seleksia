import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { newPassword } = body as { newPassword?: string };

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 karakter." }, { status: 400 });
        }

        const tempCandidateId = req.cookies.get("tempCandidateId")?.value;

        if (!tempCandidateId) {
            return NextResponse.json({ error: "Sesi telah berakhir. Silakan login kembali." }, { status: 401 });
        }

        const candidate = await prisma.candidate.findUnique({
            where: { id: tempCandidateId }
        });

        if (!candidate) {
            return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
        }

        // Check if new password is the same as displayId (not allowed)
        if (newPassword === candidate.displayId) {
            return NextResponse.json({ error: "Password tidak boleh sama dengan ID Peserta." }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.candidate.update({
            where: { id: tempCandidateId },
            data: { password: hashedPassword }
        });

        // Login successful, set cookies
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

        // Set actual auth cookies
        response.cookies.set("companyId", candidate.companyId, { path: "/", httpOnly: true });
        response.cookies.set("userRole", candidate.role, { path: "/", httpOnly: true });
        
        // Remove temp cookie
        response.cookies.delete("tempCandidateId");

        return response;

    } catch (error) {
        console.error("POST /api/auth/force-reset error:", error);
        return NextResponse.json({ error: "Gagal mereset password. Silakan coba lagi." }, { status: 500 });
    }
}
