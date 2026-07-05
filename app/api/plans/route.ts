import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const plans = await prisma.subscriptionPlan.findMany({
            orderBy: { sortOrder: "asc" },
        });
        return NextResponse.json(plans);
    } catch (error) {
        console.error("GET /api/plans error:", error);
        return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, price, priceText, maxCandidates, maxTests, features, isPopular, sortOrder } = body;

        const newPlan = await prisma.subscriptionPlan.create({
            data: {
                name,
                price: Number(price),
                priceText,
                maxCandidates: Number(maxCandidates),
                maxTests: Number(maxTests),
                features: features || [],
                isPopular: Boolean(isPopular),
                sortOrder: Number(sortOrder || 0),
            },
        });

        return NextResponse.json(newPlan, { status: 201 });
    } catch (error) {
        console.error("POST /api/plans error:", error);
        return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
    }
}
