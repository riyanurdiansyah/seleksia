import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/subscription/confirm-redirect
 * Called when user returns from Mayar payment page.
 * Checks if there's a pending payment and activates the plan.
 * This is a fallback mechanism in case the Mayar webhook hasn't been configured yet.
 */
export async function POST(req: NextRequest) {
    try {
        const companyId = await getCompanyId();
        if (!companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const { paymentId } = body;

        if (!paymentId) {
            return NextResponse.json({ error: "Payment ID tidak ditemukan" }, { status: 400 });
        }

        // Find the payment record
        const paymentRecord = await prisma.subscriptionPayment.findUnique({
            where: { id: paymentId }
        });

        if (!paymentRecord) {
            return NextResponse.json({ error: "Record pembayaran tidak ditemukan" }, { status: 404 });
        }

        // Verify this payment belongs to the logged-in company
        if (paymentRecord.companyId !== companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // If already confirmed, just return success
        if (paymentRecord.status === "success") {
            return NextResponse.json({ success: true, alreadyConfirmed: true });
        }

        // Only confirm if status is still pending
        if (paymentRecord.status === "pending") {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

            await prisma.$transaction([
                prisma.company.update({
                    where: { id: companyId },
                    data: {
                        subscriptionPlan: paymentRecord.plan,
                        subscriptionStatus: "active",
                        subscriptionStartedAt: now,
                        subscriptionExpiresAt: expiresAt,
                    }
                }),
                prisma.subscriptionPayment.update({
                    where: { id: paymentRecord.id },
                    data: {
                        status: "success",
                    }
                })
            ]);

            return NextResponse.json({
                success: true,
                message: "Pembayaran dikonfirmasi. Paket Anda sekarang aktif!",
                plan: paymentRecord.plan,
                expiresAt: expiresAt.toISOString()
            });
        }

        return NextResponse.json({ error: "Status pembayaran tidak valid untuk konfirmasi" }, { status: 400 });

    } catch (error) {
        console.error("POST /api/subscription/confirm-redirect error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
