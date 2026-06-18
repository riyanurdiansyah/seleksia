import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/tenant";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const companyId = await getCompanyId();

        if (!companyId || companyId === "default-company-id") {
            // Fallback check: if there is no logged-in company or in demo mode, let's use the first company or default
            // In a real app, users must be logged in. Let's try to find a company, or return default
        }

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
                subscriptionPayments: {
                    orderBy: { createdAt: "desc" }
                }
            }
        });

        if (!company) {
            return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
        }

        // Count current usage
        const candidateCount = await prisma.candidate.count({
            where: { companyId, role: "user" }
        });

        const testCount = await prisma.test.count({
            where: { companyId }
        });

        // Resolve limits based on plan
        const plan = company.subscriptionPlan || "Free";
        let candidateLimit = 10;
        let testLimit = 3;

        if (plan === "Starter") {
            candidateLimit = 100;
            testLimit = 10;
        } else if (plan === "Business") {
            candidateLimit = 1000;
            testLimit = 50;
        } else if (plan === "Enterprise") {
            candidateLimit = 99999; // unlimited placeholder
            testLimit = 99999;
        }

        return NextResponse.json({
            plan,
            companyName: company.name,
            status: company.subscriptionStatus,
            startedAt: company.subscriptionStartedAt,
            expiresAt: company.subscriptionExpiresAt,
            usage: {
                candidates: {
                    current: candidateCount,
                    limit: candidateLimit
                },
                tests: {
                    current: testCount,
                    limit: testLimit
                }
            },
            payments: company.subscriptionPayments,
            midtransClientKey: process.env.MIDTRANS_IS_PRODUCTION === "true" 
                ? (process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "")
                : (process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY_SB || ""),
            midtransMode: process.env.MIDTRANS_IS_PRODUCTION === "true" ? "production" : "sandbox"
        });

    } catch (error) {
        console.error("GET /api/subscription error:", error);
        return NextResponse.json({ error: "Gagal mengambil data langganan" }, { status: 500 });
    }
}
