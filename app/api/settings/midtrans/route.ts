import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const companyId = await getCompanyId();
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                midtransServerKey: true,
                midtransClientKey: true,
                midtransMode: true,
            }
        });

        if (!company) {
            return NextResponse.json({ error: "Company not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: {
                midtransServerKey: company.midtransServerKey || "",
                midtransClientKey: company.midtransClientKey || "",
                midtransMode: company.midtransMode || "sandbox",
                hasMidtransConfig: !!company.midtransServerKey && !!company.midtransClientKey,
            }
        });
    } catch (error) {
        console.error("GET /api/settings/midtrans error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const companyId = await getCompanyId();
        const body = await req.json();
        const { midtransServerKey, midtransClientKey, midtransMode } = body;

        await prisma.company.update({
            where: { id: companyId },
            data: {
                midtransServerKey: midtransServerKey || null,
                midtransClientKey: midtransClientKey || null,
                midtransMode: midtransMode || "sandbox",
            }
        });

        return NextResponse.json({
            success: true,
            message: "Midtrans settings updated successfully"
        });
    } catch (error) {
        console.error("POST /api/settings/midtrans error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
