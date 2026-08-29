import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";
import { PRESET_SCORING_SCHEMES } from "@/lib/competencyScoring";

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
    try {
        const companyId = await getCompanyId();
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                name: true,
                scoringConfig: true,
            }
        });

        if (!company) {
            return NextResponse.json({ error: "Company not found" }, { status: 404 });
        }

        const scoringConfig = company.scoringConfig || PRESET_SCORING_SCHEMES["5_tier_sales"];

        return NextResponse.json({
            success: true,
            data: {
                companyName: company.name,
                scoringConfig,
                isCustomized: !!company.scoringConfig
            }
        });
    } catch (error) {
        console.error("GET /api/settings/scoring error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const companyId = await getCompanyId();
        const body = await req.json();
        const { scoringConfig } = body;

        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: {
                scoringConfig: scoringConfig || null,
            },
            select: {
                scoringConfig: true,
            }
        });

        return NextResponse.json({
            success: true,
            data: updatedCompany.scoringConfig,
            message: "Skema penilaian default perusahaan berhasil diperbarui."
        });
    } catch (error) {
        console.error("POST /api/settings/scoring error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
