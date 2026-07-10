import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCompanyId } from "@/lib/tenant";
import { checkSubscriptionAccess } from "@/lib/subscription";

// DELETE candidate
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const companyId = await getCompanyId();
        const access = await checkSubscriptionAccess(companyId, 'delete');
        if (!access.allowed) {
            return NextResponse.json({ error: access.message }, { status: 403 });
        }

        await prisma.candidate.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/candidates/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to delete candidate" },
            { status: 500 }
        );
    }
}


// PUT update candidate
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();

        const companyId = await getCompanyId();
        const access = await checkSubscriptionAccess(companyId, 'edit');
        if (!access.allowed) {
            return NextResponse.json({ error: access.message }, { status: 403 });
        }


        const updateData: any = {
            name: body.name,
            email: body.email,
            phone: body.phone,
            role: body.role,
            batch: body.role === "user" ? body.batch : null,
            accessType: body.accessType,
            accessStart: body.accessStart ? new Date(body.accessStart) : null,
            accessEnd: body.accessEnd ? new Date(body.accessEnd) : null,
            status: body.status,
        };

        if (body.password && body.password.trim() !== "") {
            updateData.password = await bcrypt.hash(body.password, 10);
        }

        const updated = await prisma.candidate.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("PUT /api/candidates/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to update candidate" },
            { status: 500 }
        );
    }
}
