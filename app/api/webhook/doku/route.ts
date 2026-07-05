import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const signatureHeader = req.headers.get("signature");
        const clientIdHeader = req.headers.get("client-id");
        const requestIdHeader = req.headers.get("request-id");
        const requestTimestampHeader = req.headers.get("request-timestamp");

        const bodyString = await req.text();
        let body;
        try {
            body = JSON.parse(bodyString);
        } catch {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const isProd = process.env.DOKU_IS_PRODUCTION === "true";
        const secretKey = process.env.DOKU_SECRET_KEY;

        if (!secretKey) {
            console.error("DOKU_SECRET_KEY is not configured.");
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        // Validate Signature
        // Signature = HMACSHA256(Client-Id + Request-Id + Request-Timestamp + Request-Target + Digest, SecretKey)
        const requestTarget = "/api/webhook/doku";
        const digestStr = crypto.createHash('sha256').update(bodyString).digest('base64');
        const signatureStr = `Client-Id:${clientIdHeader}\nRequest-Id:${requestIdHeader}\nRequest-Timestamp:${requestTimestampHeader}\nRequest-Target:${requestTarget}\nDigest:${digestStr}`;
        const computedHmac = crypto.createHmac('sha256', secretKey).update(signatureStr).digest('base64');
        const expectedSignature = `HMACSHA256=${computedHmac}`;

        if (signatureHeader !== expectedSignature) {
            console.error("Invalid DOKU Webhook Signature");
            return NextResponse.json({ error: "Invalid Signature" }, { status: 401 });
        }

        // Process Notification
        const order = body.order;
        const transaction = body.transaction;

        if (!order || !order.invoice_number) {
            return NextResponse.json({ error: "Invalid Order Data" }, { status: 400 });
        }

        const paymentRecordId = order.invoice_number;
        const transactionStatus = transaction?.status; // e.g. "SUCCESS", "FAILED"

        if (transactionStatus === "SUCCESS") {
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
        } else if (transactionStatus === "FAILED" || transactionStatus === "EXPIRED") {
            await prisma.subscriptionPayment.update({
                where: { id: paymentRecordId },
                data: {
                    status: "failed",
                }
            });
        }

        return NextResponse.json({ message: "Notification processed" });

    } catch (error) {
        console.error("DOKU Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
