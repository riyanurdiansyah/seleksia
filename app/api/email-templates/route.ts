import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma, getCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
    try {
        const prisma = await getTenantPrisma();
        const companyId = await getCompanyId();
        const templates = await prisma.emailTemplate.findMany({
            where: { companyId },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(templates);
    } catch (error: any) {
        console.error("GET /api/email-templates error:", error);
        return NextResponse.json({ error: "Failed to fetch email templates", details: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const prisma = await getTenantPrisma();
        const companyId = await getCompanyId();

        if (!body.name || !body.subject || !body.content) {
            return NextResponse.json({ error: "Name, subject, and content are required" }, { status: 400 });
        }

        // If setting as default, unset other defaults
        if (body.isDefault) {
            await prisma.emailTemplate.updateMany({
                where: { companyId, isDefault: true },
                data: { isDefault: false }
            });
        }

        const template = await prisma.emailTemplate.create({
            data: {
                companyId,
                name: body.name,
                subject: body.subject,
                content: body.content,
                isDefault: body.isDefault || false,
            }
        });

        return NextResponse.json(template, { status: 201 });
    } catch (error: any) {
        console.error("POST /api/email-templates error:", error);
        return NextResponse.json({ error: "Failed to create email template", details: error.message }, { status: 500 });
    }
}
