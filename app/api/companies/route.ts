import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCompanyId } from "@/lib/tenant";

// GET all companies
export async function GET() {
    try {
        const cookieStore = await cookies();
        const role = cookieStore.get("userRole")?.value || "user";
        
        let whereClause = {};
        
        if (role !== "superadmin") {
            const companyId = await getCompanyId();
            if (companyId) {
                whereClause = { id: companyId };
            } else {
                // If they are not superadmin and somehow don't have a companyId, return empty
                return NextResponse.json([]);
            }
        }

        const companies = await prisma.company.findMany({
            where: whereClause,
            select: { id: true, name: true, smtpUser: true, subscriptionPlan: true }
        });
        return NextResponse.json(companies);
    } catch (error) {
        console.error("GET /api/companies error:", error);
        return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
    }
}

// POST create new company (superadmin only)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, password } = body;
        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        // generate slug (simple)
        const slug = name.toLowerCase().replace(/\s+/g, "-");
        // ensure uniqueness of slug
        const existing = await prisma.company.findFirst({ where: { slug } });
        if (existing) {
            return NextResponse.json({ error: "Company with similar name already exists" }, { status: 400 });
        }

        // 1. Save company to database
        const newCompany = await prisma.company.create({
            data: { 
                name, 
                slug,
                ...(email ? {
                    smtpUser: email,
                    smtpSender: name
                } : {})
            },
            select: { id: true, name: true }
        });
        return NextResponse.json(newCompany, { status: 201 });
    } catch (error: any) {
        console.error("POST /api/companies error:", error);
        return NextResponse.json({ error: error.message || "Failed to create company" }, { status: 500 });
    }
}


