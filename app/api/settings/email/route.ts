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
                smtpHost: true,
                smtpPort: true,
                smtpUser: true,
                smtpPass: true,
                smtpSender: true,
            }
        });

        if (!company) {
            return NextResponse.json({ error: "Company not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: {
                smtpHost: company.smtpHost || "",
                smtpPort: company.smtpPort || "",
                smtpUser: company.smtpUser || "",
                smtpPass: company.smtpPass || "",
                smtpSender: company.smtpSender || "",
                hasCustomSmtp: !!company.smtpHost,
            }
        });
    } catch (error) {
        console.error("GET /api/settings/email error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const companyId = await getCompanyId();
        const body = await req.json();
        const { smtpHost, smtpPort, smtpUser, smtpPass, smtpSender, useCustomSmtp } = body;

        // If useCustomSmtp is false, we clear the fields
        const dataToUpdate = useCustomSmtp ? {
            smtpHost: smtpHost || null,
            smtpPort: smtpPort ? parseInt(smtpPort, 10) : null,
            smtpUser: smtpUser || null,
            smtpPass: smtpPass || null,
            smtpSender: smtpSender || null,
        } : {
            smtpHost: null,
            smtpPort: null,
            smtpUser: null,
            smtpPass: null,
            smtpSender: null,
        };

        await prisma.company.update({
            where: { id: companyId },
            data: dataToUpdate
        });

        return NextResponse.json({
            success: true,
            message: "SMTP settings updated successfully"
        });
    } catch (error) {
        console.error("POST /api/settings/email error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
