import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const companies = await prisma.company.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" }
        });
        return NextResponse.json(companies);
    } catch (error) {
        console.error("GET /api/companies error:", error);
        return NextResponse.json(
            { error: "Failed to fetch companies" },
            { status: 500 }
        );
    }
}
