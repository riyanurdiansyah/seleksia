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
                    paymentMethod: "Midtrans Gateway"
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

        // Resolve Midtrans Server Key and Mode strictly from .env
        const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
        const serverKey = isProd 
            ? process.env.MIDTRANS_SERVER_KEY 
            : process.env.MIDTRANS_SERVER_KEY_SB;
        const clientKey = isProd 
            ? process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY 
            : process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY_SB;
        const mode = isProd ? "production" : "sandbox";

        if (!serverKey || serverKey.startsWith("SB-Mid-server-XXXXXX") || serverKey === "") {
            return NextResponse.json({
                error: `Kredensial Midtrans ${isProd ? "" : "Sandbox "}belum diset oleh sistem di file .env. Silakan gunakan mode Simulasi Uji Coba.`,
                needsConfig: true
            }, { status: 400 });
        }

        if (serverKey.startsWith("Mid-client-") || serverKey.startsWith("SB-Mid-client-")) {
            return NextResponse.json({
                error: `Kesalahan Konfigurasi .env: Anda memasukkan Client Key pada field ${isProd ? "MIDTRANS_SERVER_KEY" : "MIDTRANS_SERVER_KEY_SB"}. Harap ganti dengan Server Key yang sesuai (biasanya berawalan 'Mid-server-' atau 'SB-Mid-server-').`
            }, { status: 400 });
        }

        const midtransUrl = mode === "production"
            ? "https://app.midtrans.com/snap/v1/transactions"
            : "https://app.sandbox.midtrans.com/snap/v1/transactions";

        const authString = Buffer.from(`${serverKey}:`).toString("base64");

        const response = await fetch(midtransUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": `Basic ${authString}`
            },
            body: JSON.stringify({
                transaction_details: {
                    order_id: paymentRecord.id,
                    gross_amount: amount
                },
                credit_card: {
                    secure: true
                },
                customer_details: {
                    first_name: admin?.name || "Admin",
                    email: admin?.email || "admin@example.com"
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Midtrans API Error:", data);
            return NextResponse.json({
                error: data.error_messages?.[0] || "Gagal menghubungkan ke Midtrans. Silakan gunakan Simulasi Uji Coba."
            }, { status: response.status });
        }

        return NextResponse.json({
            success: true,
            token: data.token,
            redirectUrl: data.redirect_url,
            clientKey: clientKey,
            mode: mode
        });

    } catch (error) {
        console.error("POST /api/subscription/pay-midtrans error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
