import { prisma } from "@/lib/prisma";

export type ActionType = 'create_candidate' | 'create_test' | 'edit' | 'delete';

export async function checkSubscriptionAccess(companyId: string, action: ActionType, bulkCount: number = 1) {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
    });

    if (!company) {
        return { allowed: false, reason: 'company_not_found', message: 'Perusahaan tidak ditemukan' };
    }

    const now = new Date();
    
    // Check if subscription is active and not expired
    const isActive = company.subscriptionStatus === 'active';
    const isExpired = company.subscriptionExpiresAt ? company.subscriptionExpiresAt < now : true;
    
    // If not active or expired, it's read-only mode
    if (!isActive || isExpired) {
        return { allowed: false, reason: 'read_only', message: 'Masa aktif langganan telah habis. Akun Anda dalam mode hanya-baca (read-only). Silakan perbarui paket langganan Anda.' };
    }

    // If just editing or deleting and subscription is active, allow it.
    if (action === 'edit' || action === 'delete') {
        return { allowed: true };
    }

    // For create actions, check limits based on subscription plan
    // Find the plan in database
    const planName = company.subscriptionPlan || 'Free';
    const plan = await prisma.subscriptionPlan.findFirst({
        where: { name: planName }
    });

    // Fallback limits if plan not found in DB
    let maxCandidates = 10;
    let maxTests = 3;

    if (plan) {
        maxCandidates = plan.maxCandidates;
        maxTests = plan.maxTests;
    } else {
        // Hardcoded fallbacks if DB table is empty
        if (planName === "Starter") {
            maxCandidates = 100;
            maxTests = 10;
        } else if (planName === "Business") {
            maxCandidates = 1000;
            maxTests = 50;
        } else if (planName === "Enterprise") {
            maxCandidates = -1; // unlimited
            maxTests = -1;
        }
    }

    // If action is create_candidate, check candidate limit
    if (action === 'create_candidate') {
        if (maxCandidates === -1) return { allowed: true };

        // Count candidates created in the current billing cycle
        const startedAt = company.subscriptionStartedAt || new Date(0); // fallback if null
        
        const candidateCount = await prisma.candidate.count({
            where: {
                companyId,
                role: 'user', // Only count users, not admins/proctors
                createdAt: {
                    gte: startedAt
                }
            }
        });

        if (candidateCount + bulkCount > maxCandidates) {
            return { 
                allowed: false, 
                reason: 'limit_reached', 
                message: `Batas kuota kandidat telah tercapai (${candidateCount}/${maxCandidates}). Silakan upgrade paket langganan Anda.`
            };
        }
    }

    // If action is create_test, check test limit
    if (action === 'create_test') {
        if (maxTests === -1) return { allowed: true };

        // Count all tests (absolute quota)
        const testCount = await prisma.test.count({
            where: { companyId }
        });

        if (testCount + bulkCount > maxTests) {
            return {
                allowed: false,
                reason: 'limit_reached',
                message: `Batas maksimal paket soal telah tercapai (${testCount}/${maxTests}). Silakan upgrade paket langganan Anda.`
            };
        }
    }

    return { allowed: true };
}
