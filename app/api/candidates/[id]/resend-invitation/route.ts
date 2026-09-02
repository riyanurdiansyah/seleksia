import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/tenant";
import { checkSubscriptionAccess } from "@/lib/subscription";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const candidate = await prisma.candidate.findUnique({
            where: { id },
            include: { company: true },
        });

        if (!candidate) {
            return NextResponse.json(
                { error: "Kandidat tidak ditemukan" },
                { status: 404 }
            );
        }

        if (!candidate.email) {
            return NextResponse.json(
                { error: "Kandidat belum memiliki email" },
                { status: 400 }
            );
        }

        // Check subscription permission if companyId is resolved
        const companyId = candidate.companyId || (await getCompanyId());
        const access = await checkSubscriptionAccess(companyId, "edit");
        if (!access.allowed) {
            return NextResponse.json({ error: access.message }, { status: 403 });
        }

        // Format password info as requested by user:
        // USR... / Silahkan gunakan password yang sudah anda ganti
        const passwordInfo = `${candidate.displayId} / Silahkan gunakan password yang sudah anda ganti`;

        const result = await sendWelcomeEmail(candidate.id, passwordInfo);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || "Gagal mengirim ulang email undangan" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: result.simulated
                ? `[Simulasi] Email undangan dikirim ke ${candidate.email} (Mode Dev).`
                : `Email undangan berhasil dikirim ulang ke ${candidate.email}`,
            simulated: !!result.simulated,
        });
    } catch (error: any) {
        console.error("POST /api/candidates/[id]/resend-invitation error:", error);
        return NextResponse.json(
            { error: error?.message || "Terjadi kesalahan internal saat mengirim email undangan" },
            { status: 500 }
        );
    }
}
