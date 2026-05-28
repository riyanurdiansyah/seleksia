import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getTenantPrisma, getCompanyId } from "@/lib/tenant";

// GET all candidates
export async function GET(req: NextRequest) {
    try {
        const tenantPrisma = await getTenantPrisma();
        const candidates = await tenantPrisma.candidate.findMany({
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(candidates);
    } catch (error) {
        console.error("GET /api/candidates error:", error);
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

        // Generate display ID
        const count = await prisma.candidate.count();
        const displayId = `PSK-${String(count + 1).padStart(3, "0")}`;

        // Hash the password
        const hashedPassword = await bcrypt.hash(body.password, 10);

        const companyId = await getCompanyId();

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

        return NextResponse.json(candidate, { status: 201 });
    } catch (error) {
        console.error("POST /api/candidates error:", error);
        return NextResponse.json(
            { error: "Failed to create candidate" },
            { status: 500 }
        );
    }
}
