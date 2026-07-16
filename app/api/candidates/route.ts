import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getTenantPrisma, getCompanyId } from "@/lib/tenant";
import { checkSubscriptionAccess } from "@/lib/subscription";
import { sendWelcomeEmail } from "@/lib/email";

// GET all candidates
export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const role = cookieStore.get('userRole')?.value;
        const companyIdFilter = req.nextUrl.searchParams.get('companyId');

        if (role === 'superadmin') {
            // Superadmin: optionally filter by companyId query param
            const whereClause: any = {};
            if (companyIdFilter && companyIdFilter !== 'all') {
                whereClause.companyId = companyIdFilter;
            }
            const candidates = await prisma.candidate.findMany({
                where: whereClause,
                orderBy: { createdAt: "desc" },
                include: { company: { select: { name: true } } },
            });
            return NextResponse.json(candidates);
        }

        // Regular user or admin: filter candidates by companyId from cookie
        const companyId = await getCompanyId();
        const candidates = await prisma.candidate.findMany({
          where: { companyId },
          orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(candidates);
    } catch (error) {
        console.error("GET /api/candidates error:", error);
        return NextResponse.json(
            { error: "Failed to fetch candidates", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

// POST create candidate
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const companyId = await getCompanyId();

        // Check subscription limits and access
        const access = await checkSubscriptionAccess(companyId, 'create_candidate');
        if (!access.allowed) {
            return NextResponse.json({ error: access.message }, { status: 403 });
        }

        // Generate display ID safely based on company's max ID
        const existingCandidates = await prisma.candidate.findMany({
            where: { companyId, displayId: { startsWith: 'USR-' } },
            select: { displayId: true }
        });
        
        let maxNum = 0;
        for (const c of existingCandidates) {
            const numPart = c.displayId.split('-')[1];
            if (numPart) {
                const num = parseInt(numPart, 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
        }
        const displayId = `USR-${String(maxNum + 1).padStart(3, "0")}`;

        // Hash the default password (displayId)
        const hashedPassword = await bcrypt.hash(displayId, 10);

        const candidate = await prisma.candidate.create({
            data: {
                companyId,
                displayId,
                name: body.name,
                email: body.email,
                phone: body.phone || null,
                role: body.role || "user",
                batch: body.role === "admin" || body.role === "proctor" ? null : (body.batch || null),
                password: hashedPassword,
                accessType: body.accessType || "range",
                accessStart: body.accessType === "permanent" ? null : (body.accessStart ? new Date(body.accessStart) : null),
                accessEnd: body.accessType === "permanent" ? null : (body.accessEnd ? new Date(body.accessEnd) : null),
            },
        });

        // Send welcome email asynchronously so it doesn't block the API response
        sendWelcomeEmail(candidate.id, displayId).catch(console.error);

        return NextResponse.json(candidate, { status: 201 });
    } catch (error: any) {
        console.error("POST /api/candidates error:", error);
        
        if (error?.code === 'P2002') {
            return NextResponse.json(
                { error: "Email sudah digunakan oleh kandidat lain. Silakan gunakan email yang berbeda." },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: "Gagal membuat kandidat. Harap hubungi admin.", details: error.message || String(error) },
            { status: 500 }
        );
    }
}
