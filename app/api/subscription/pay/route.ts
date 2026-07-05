import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function generateDokuSignature(
    clientId: string,
    secretKey: string,
    requestId: string,
    requestTimestamp: string,
    requestTarget: string,
    body: any
) {
    const digestStr = crypto.createHash('sha256').update(JSON.stringify(body)).digest('base64');
    const signatureStr = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${requestTimestamp}\nRequest-Target:${requestTarget}\nDigest:${digestStr}`;
    const hmac = crypto.createHmac('sha256', secretKey).update(signatureStr).digest('base64');
    return `HMACSHA256=${hmac}`;
}

export async function POST(req: NextRequest) {
    try {
        const companyId = await getCompanyId();
        if (!companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const { isSimulation, plan: requestedPlan } = body;

        // Fetch company and admin info
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
                candidates: {
                    where: { role: "admin" },
                    take: 1
                }
            }
        });

        if (!company) {
            return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
        }

        const admin = company.candidates[0];
        const plan = requestedPlan || company.subscriptionPlan;
        
        const planRecord = await prisma.subscriptionPlan.findFirst({
            where: { name: plan }
        });

        if (!planRecord) {
            return NextResponse.json({ error: "Plan tidak valid untuk pembayaran" }, { status: 400 });
        }

        const amount = planRecord.price;

        // Find or create pending payment record
        let paymentRecord = await prisma.subscriptionPayment.findFirst({
            where: {
                companyId,
                plan,
                status: "pending"
            }
        });

        if (!paymentRecord) {
            paymentRecord = await prisma.subscriptionPayment.create({
                data: {
                    companyId,
                    plan,
                    amount,
                    status: "pending",
                    paymentMethod: "DOKU Gateway"
                }
            });
        }

        if (isSimulation) {
            // Simulated payment activation
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

            await prisma.$transaction([
                prisma.company.update({
                    where: { id: companyId },
                    data: {
                        subscriptionPlan: plan,
                        subscriptionStatus: "active",
                        subscriptionStartedAt: now,
                        subscriptionExpiresAt: expiresAt,
                    }
                }),
                prisma.subscriptionPayment.update({
                    where: { id: paymentRecord.id },
                    data: {
                        status: "success",
                        paymentMethod: "Simulasi Uji Coba"
                    }
                })
            ]);

            return NextResponse.json({
                success: true,
                isSimulation: true,
                message: "Pembayaran simulasi berhasil. Paket Anda sekarang aktif!"
            });
        }

        // Resolve DOKU Config from .env
        const isProd = process.env.DOKU_IS_PRODUCTION === "true";
        const clientId = process.env.DOKU_CLIENT_ID;
        const secretKey = process.env.DOKU_SECRET_KEY;
        const mode = isProd ? "production" : "sandbox";

        if (!clientId || !secretKey || clientId === "" || secretKey === "") {
            return NextResponse.json({
                error: `Kredensial DOKU ${isProd ? "" : "Sandbox "}belum diset oleh sistem di file .env. Silakan gunakan mode Simulasi Uji Coba.`,
                needsConfig: true
            }, { status: 400 });
        }

        const dokuUrl = mode === "production"
            ? "https://api.doku.com"
            : "https://api-sandbox.doku.com";
        const requestTarget = "/checkout/v1/payment";

        const requestId = crypto.randomUUID();
        const requestTimestamp = new Date().toISOString().substring(0, 19) + "Z"; // e.g. 2023-01-01T00:00:00Z

        const reqBody = {
            order: {
                amount: amount,
                invoice_number: paymentRecord.id,
                currency: "IDR",
                callback_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/subscription`
            },
            payment: {
                payment_due_date: 60 // 60 minutes
            },
            customer: {
                name: admin?.name || "Admin",
                email: admin?.email || "admin@example.com"
            }
        };

        const signature = generateDokuSignature(
            clientId,
            secretKey,
            requestId,
            requestTimestamp,
            requestTarget,
            reqBody
        );

        const response = await fetch(`${dokuUrl}${requestTarget}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Client-Id": clientId,
                "Request-Id": requestId,
                "Request-Timestamp": requestTimestamp,
                "Signature": signature
            },
            body: JSON.stringify(reqBody)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("DOKU API Error:", data);
            return NextResponse.json({
                error: data.error?.message || "Gagal menghubungkan ke DOKU. Silakan gunakan Simulasi Uji Coba."
            }, { status: response.status });
        }

        // Response from DOKU Checkout API contains response.payment.url
        return NextResponse.json({
            success: true,
            redirectUrl: data.response?.payment?.url,
            mode: mode
        });

    } catch (error) {
        console.error("POST /api/subscription/pay error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
