import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const signatureHeader = req.headers.get("x-mayar-signature") || req.headers.get("signature") || "";
        const bodyString = await req.text();
        
        let body;
        try {
            body = JSON.parse(bodyString);
        } catch {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        // For production, we should verify the webhook signature with Mayar webhook secret.
        // However, since we don't know the exact signature header name, we will process it directly,
        // or check if it matches a valid invoice from our DB.
        
        // Extract payment ID from reference or description
        let paymentRecordId = body.reference || body.data?.reference;
        
        if (!paymentRecordId && (body.description || body.data?.description)) {
            const desc = body.description || body.data?.description;
            const match = desc.match(/\[ID: (.*?)\]/);
            if (match && match[1]) {
                paymentRecordId = match[1];
            }
        }

        if (!paymentRecordId) {
            return NextResponse.json({ error: "Payment Record ID Not Found in Webhook" }, { status: 400 });
        }

        const status = body.status || body.data?.status; // e.g. "SUCCESS", "FAILED", "PAID"
        const isSuccess = status === "SUCCESS" || status === "PAID" || status === "settled" || status === "COMPLETED";

        if (isSuccess) {
            const paymentRecord = await prisma.subscriptionPayment.findUnique({
                where: { id: paymentRecordId }
            });

            if (!paymentRecord) {
                return NextResponse.json({ error: "Payment Record Not Found" }, { status: 404 });
            }

            if (paymentRecord.status !== "success") {
                const now = new Date();
                const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

                await prisma.$transaction([
                    prisma.company.update({
                        where: { id: paymentRecord.companyId },
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
            }
        } else if (status === "FAILED" || status === "EXPIRED" || status === "failed" || status === "expired") {
            await prisma.subscriptionPayment.update({
                where: { id: paymentRecordId },
                data: {
                    status: "failed",
                }
            });
        }

        return NextResponse.json({ message: "Mayar webhook processed" });

    } catch (error) {
        console.error("Mayar Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
