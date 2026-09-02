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
                    orderBy: { createdAt: "desc" },
                    include: {
                        candidate: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });

        if (!company) {
            return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
        }

        // Count current usage based on cycle
        const startedAt = company.subscriptionStartedAt || new Date(0);
        const candidateCount = await prisma.candidate.count({
            where: { 
                companyId, 
                role: "user",
                createdAt: {
                    gte: startedAt
                }
            }
        });

        const testCount = await prisma.test.count({
            where: { companyId }
        });

        // Resolve limits based on plan
        const planName = company.subscriptionPlan || "Free";
        const planNameLower = planName.toLowerCase();
        const isCustomOrUnlimited = 
            planNameLower.includes("unlimited") || 
            planNameLower.includes("custom") || 
            planNameLower.includes("enterprise") || 
            planNameLower.includes("lifetime") || 
            planNameLower.includes("unlimit");

        const dbPlan = await prisma.subscriptionPlan.findFirst({
            where: { name: { equals: planName, mode: "insensitive" } }
        });

        let candidateLimit = 3;
        let testLimit = 1;

        if (isCustomOrUnlimited) {
            candidateLimit = -1;
            testLimit = -1;
        } else if (dbPlan) {
            candidateLimit = (dbPlan.maxCandidates === 0 || dbPlan.maxCandidates === -1) ? -1 : dbPlan.maxCandidates;
            testLimit = (dbPlan.maxTests === 0 || dbPlan.maxTests === -1) ? -1 : dbPlan.maxTests;
        } else {
            if (planNameLower === "starter") {
                candidateLimit = 100;
                testLimit = 10;
            } else if (planNameLower === "business") {
                candidateLimit = 1000;
                testLimit = 50;
            } else if (planNameLower === "enterprise") {
                candidateLimit = -1;
                testLimit = -1;
            }
        }

        return NextResponse.json({
            plan: planName,
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
        });

    } catch (error) {
        console.error("GET /api/subscription error:", error);
        return NextResponse.json({ error: "Gagal mengambil data langganan" }, { status: 500 });
    }
}
