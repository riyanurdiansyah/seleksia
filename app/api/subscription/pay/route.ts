import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const companyId = await getCompanyId();
        if (!companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const { isSimulation, plan: requestedPlan } = body;

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
                    candidateId: admin?.id || null,
                    plan,
                    amount,
                    status: "pending",
                    paymentMethod: "Mayar Gateway"
                }
            });
        }

        if (isSimulation) {
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

        const apiKey = process.env.MAYAR_API_KEY;
        const isProduction = process.env.MAYAR_IS_PRODUCTION === "true";
        const mode = isProduction ? "production" : "sandbox";

        if (!apiKey || apiKey.trim() === "") {
            return NextResponse.json({
                error: `Kredensial Mayar belum diset di server (.env).`,
                needsConfig: true
            }, { status: 400 });
        }

        const mayarUrl = mode === "production"
            ? "https://api.mayar.id/hl/v1/invoice/create"
            : "https://api.mayar.club/hl/v1/invoice/create";

        // Set callback and redirect to include payment ID so we can match it back if needed
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const redirectUrl = `${baseUrl}/admin/subscription?paymentId=${paymentRecord.id}`;

        const reqBody = {
            name: admin?.name || "Admin",
            email: admin?.email || "admin@example.com",
            mobile: "000000000000",
            amount: amount,
            description: `Pembayaran Langganan ${plan} Plan [ID: ${paymentRecord.id}]`,
            items: [
                {
                    name: `${plan} Plan (30 Hari)`,
                    quantity: 1,
                    price: amount,
                    rate: amount,
                    description: "Langganan CBT"
                }
            ],
            redirectUrl: redirectUrl,
            // Mayar often supports reference or external_id, passing it just in case:
            reference: paymentRecord.id
        };

        const response = await fetch(mayarUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(reqBody)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Mayar API Error:", JSON.stringify(data, null, 2));
            return NextResponse.json({
                error: `Error dari Mayar: ${JSON.stringify(data)}`
            }, { status: response.status });
        }

        // Return the payment link from Mayar response
        // Usually Mayar returns the URL in data.data.link or data.link
        const paymentLink = data.data?.link || data.link || data.redirectUrl;

        return NextResponse.json({
            success: true,
            redirectUrl: paymentLink,
            mode: mode
        });

    } catch (error) {
        console.error("POST /api/subscription/pay error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
