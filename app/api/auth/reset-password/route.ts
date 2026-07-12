import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, newPassword } = body;

        if (!token || !newPassword) {
            return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
        }

        // Find candidates with this token
        const candidates = await prisma.candidate.findMany({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date() // Token must not be expired
                }
            }
        });

        if (candidates.length === 0) {
            return NextResponse.json({ error: "Token reset password tidak valid atau sudah kedaluwarsa." }, { status: 400 });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update all candidates that have this token
        await prisma.candidate.updateMany({
            where: { resetToken: token },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            }
        });

        return NextResponse.json({ success: true, message: "Password berhasil diubah." });

    } catch (error) {
        console.error("Reset password error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
