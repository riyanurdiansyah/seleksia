import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma, getCompanyId } from "@/lib/tenant";

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const body = await req.json();
        const prisma = await getTenantPrisma();
        const companyId = await getCompanyId();

        if (!body.name || !body.subject || !body.content) {
            return NextResponse.json({ error: "Name, subject, and content are required" }, { status: 400 });
        }

        // If setting as default, unset other defaults
        if (body.isDefault) {
            await prisma.emailTemplate.updateMany({
                where: { companyId, isDefault: true, id: { not: id } },
                data: { isDefault: false }
            });
        }

        const template = await prisma.emailTemplate.update({
            where: { id },
            data: {
                name: body.name,
                subject: body.subject,
                content: body.content,
                isDefault: body.isDefault || false,
            }
        });

        return NextResponse.json(template);
    } catch (error: any) {
        console.error("PUT /api/email-templates/[id] error:", error);
        return NextResponse.json({ error: "Failed to update email template", details: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const prisma = await getTenantPrisma();

        await prisma.emailTemplate.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("DELETE /api/email-templates/[id] error:", error);
        return NextResponse.json({ error: "Failed to delete email template", details: error.message }, { status: 500 });
    }
}
