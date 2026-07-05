import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        
        // Ensure Midtrans server key is available for signature verification
        const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
        const serverKey = isProd 
            ? process.env.MIDTRANS_SERVER_KEY 
            : process.env.MIDTRANS_SERVER_KEY_SB;

        if (!serverKey) {
            console.error("MIDTRANS_SERVER_KEY is not configured.");
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        const {
            order_id,
            status_code,
            gross_amount,
            signature_key,
            transaction_status,
            fraud_status
        } = body;

        // Verify Signature Key
        const hash = crypto.createHash("sha512");
        hash.update(`${order_id}${status_code}${gross_amount}${serverKey}`);
        const expectedSignature = hash.digest("hex");

        if (signature_key !== expectedSignature) {
            console.error("Invalid Midtrans Webhook Signature");
            return NextResponse.json({ error: "Invalid Signature" }, { status: 401 });
        }

        // Process Notification
        const paymentRecord = await prisma.subscriptionPayment.findUnique({
            where: { id: order_id }
        });

        if (!paymentRecord) {
            return NextResponse.json({ error: "Payment Record Not Found" }, { status: 404 });
        }

        if (transaction_status === "capture") {
            if (fraud_status === "accept") {
                // Success
                await processSuccessPayment(paymentRecord);
            }
        } else if (transaction_status === "settlement") {
            // Success
            await processSuccessPayment(paymentRecord);
        } else if (
            transaction_status === "cancel" ||
            transaction_status === "deny" ||
            transaction_status === "expire"
        ) {
            // Failed
            await prisma.subscriptionPayment.update({
                where: { id: order_id },
                data: { status: "failed" }
            });
        }

        return NextResponse.json({ message: "Midtrans notification processed" });

    } catch (error) {
        console.error("Midtrans Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

async function processSuccessPayment(paymentRecord: any) {
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
}
