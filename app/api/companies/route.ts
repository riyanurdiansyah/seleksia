import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET all companies
export async function GET() {
    try {
        const companies = await prisma.company.findMany({
            select: { id: true, name: true }
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
        const { name } = body;
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
        const newCompany = await prisma.company.create({
            data: { name, slug },
            select: { id: true, name: true }
        });
        return NextResponse.json(newCompany, { status: 201 });
    } catch (error) {
        console.error("POST /api/companies error:", error);
        return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
    }
}
