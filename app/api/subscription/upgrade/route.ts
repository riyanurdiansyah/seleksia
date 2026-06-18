import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const companyId = await getCompanyId();

        if (!companyId || companyId === "default-company-id") {
            return NextResponse.json({ error: "Sesi perusahaan tidak valid. Silakan login kembali." }, { status: 401 });
        }

        const body = await req.json();
        const { planName, amount, paymentMethod } = body as {
            planName: string;
            amount: number;
            paymentMethod: string;
        };

        if (!planName || !paymentMethod) {
            return NextResponse.json({ error: "Informasi upgrade tidak lengkap" }, { status: 400 });
        }

        // Validate plan name
        const validPlans = ["Free", "Starter", "Business", "Enterprise"];
        if (!validPlans.includes(planName)) {
            return NextResponse.json({ error: "Nama paket tidak valid" }, { status: 400 });
        }

        const now = new Date();
        let expiresAt: Date | null = null;

        // Upgrades are for 30 days
        if (planName === "Starter" || planName === "Business") {
            expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
        } else if (planName === "Enterprise") {
            expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year for Enterprise
        }

        // Update company and write payment log in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const updatedCompany = await tx.company.update({
                where: { id: companyId },
                data: {
                    subscriptionPlan: planName,
                    subscriptionStatus: "active",
                    subscriptionStartedAt: now,
                    subscriptionExpiresAt: expiresAt
                }
            });

            const payment = await tx.subscriptionPayment.create({
                data: {
                    companyId: companyId,
                    plan: planName,
                    amount: amount,
                    status: "success",
                    paymentMethod: paymentMethod
                }
            });

            return { company: updatedCompany, payment };
        });

        return NextResponse.json({
            success: true,
            plan: result.company.subscriptionPlan,
            status: result.company.subscriptionStatus,
            expiresAt: result.company.subscriptionExpiresAt,
            payment: result.payment
        });

    } catch (error) {
        console.error("POST /api/subscription/upgrade error:", error);
        return NextResponse.json({ error: "Gagal memproses upgrade langganan" }, { status: 500 });
    }
}
