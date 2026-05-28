import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/tenant";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const instructions = await prisma.instruction.findMany({
            include: {
                test: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return NextResponse.json(instructions);
    } catch (error) {
        console.error("GET /api/instructions error:", error);
        return NextResponse.json({ error: "Failed to fetch instructions" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, content, testId } = body;

        if (!type || !content) {
            return NextResponse.json({ error: "Type and content are required" }, { status: 400 });
        }

        if (type === "specific" && !testId) {
            return NextResponse.json({ error: "Test ID is required for specific instructions" }, { status: 400 });
        }

        const companyId = await getCompanyId();

        const instruction = await prisma.instruction.create({
            data: {
                companyId,
                type,
                content,
                testId: type === "specific" ? testId : null,
            },
            include: {
                test: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        return NextResponse.json(instruction, { status: 201 });
    } catch (error) {
        console.error("POST /api/instructions error:", error);
        return NextResponse.json({ error: "Failed to create instruction" }, { status: 500 });
    }
}
