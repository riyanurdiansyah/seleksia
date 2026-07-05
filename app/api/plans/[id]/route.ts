import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        const body = await req.json();
        const { name, price, priceText, maxCandidates, maxTests, features, isPopular, sortOrder } = body;

        const updatedPlan = await prisma.subscriptionPlan.update({
            where: { id },
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

        return NextResponse.json(updatedPlan);
    } catch (error) {
        console.error("PUT /api/plans/[id] error:", error);
        return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        await prisma.subscriptionPlan.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/plans/[id] error:", error);
        return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
    }
}
