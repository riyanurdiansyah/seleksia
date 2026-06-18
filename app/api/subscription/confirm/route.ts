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
        const { orderId } = body;

        if (!orderId) {
            return NextResponse.json({ error: "Order ID wajib dikirim" }, { status: 400 });
        }

        // Fetch payment record
        const paymentRecord = await prisma.subscriptionPayment.findUnique({
            where: { id: orderId }
        });

        if (!paymentRecord || paymentRecord.companyId !== companyId) {
            return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
        }

        // Fetch company Midtrans settings or env variables
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
        }

        const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
        const serverKey = isProd 
            ? process.env.MIDTRANS_SERVER_KEY 
            : process.env.MIDTRANS_SERVER_KEY_SB;
        const mode = isProd ? "production" : "sandbox";

        if (!serverKey || serverKey.startsWith("SB-Mid-server-XXXXXX") || serverKey === "") {
            return NextResponse.json({ error: "Server Key tidak valid" }, { status: 400 });
        }

        const midtransStatusUrl = mode === "production"
            ? `https://api.midtrans.com/v2/${orderId}/status`
            : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

        const authString = Buffer.from(`${serverKey}:`).toString("base64");

        const response = await fetch(midtransStatusUrl, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Basic ${authString}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Midtrans Status API Error:", data);
            return NextResponse.json({ error: "Gagal mengambil status transaksi dari Midtrans" }, { status: response.status });
        }

        const transactionStatus = data.transaction_status;
        const fraudStatus = data.fraud_status;

        let isSuccess = false;

        if (transactionStatus === "capture") {
            if (fraudStatus === "challenge") {
                // challenge status needs manual approval / check
            } else if (fraudStatus === "accept") {
                isSuccess = true;
            }
        } else if (transactionStatus === "settlement") {
            isSuccess = true;
        }

        if (isSuccess) {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

            await prisma.$transaction([
                prisma.company.update({
                    where: { id: companyId },
                    data: {
                        subscriptionStatus: "active",
                        subscriptionStartedAt: now,
                        subscriptionExpiresAt: expiresAt,
                    }
                }),
                prisma.subscriptionPayment.update({
                    where: { id: orderId },
                    data: {
                        status: "success",
                        paymentMethod: data.payment_type || "Midtrans"
                    }
                })
            ]);

            return NextResponse.json({
                success: true,
                message: "Pembayaran terverifikasi! Paket Anda sekarang aktif."
            });
        }

        return NextResponse.json({
            success: false,
            status: transactionStatus,
            message: `Pembayaran belum selesai (Status: ${transactionStatus})`
        });

    } catch (error) {
        console.error("POST /api/subscription/confirm error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
