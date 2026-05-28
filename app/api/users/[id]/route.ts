import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

// PUT update user
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();

        // Check if user exists
        const existingUser = await prisma.candidate.findUnique({ where: { id } });
        if (!existingUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check for existing email/displayId with another user
        const duplicate = await prisma.candidate.findFirst({
            where: {
                OR: [
                    { email: body.email },
                    { displayId: body.displayId }
                ],
                NOT: { id }
            }
        });

        if (duplicate) {
            return NextResponse.json(
                { error: "Email atau ID Peserta sudah digunakan oleh pengguna lain." },
                { status: 400 }
            );
        }

        const dataToUpdate: any = {
            name: body.name,
            email: body.email,
            displayId: body.displayId,
            phone: body.phone || null,
            role: (body.role as Role) || "user",
            batch: ["admin", "proctor", "superadmin"].includes(body.role) ? null : (body.batch || null),
            accessType: body.accessType || "permanent",
        };

        if (body.currentRole === "superadmin" && body.companyId) {
            dataToUpdate.companyId = body.companyId;
        }

        if (body.password) {
            dataToUpdate.password = await bcrypt.hash(body.password, 10);
        }

        const updatedUser = await prisma.candidate.update({
            where: { id },
            data: dataToUpdate,
            select: { id: true, name: true, email: true, role: true }
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("PUT /api/users/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to update user" },
            { status: 500 }
        );
    }
}

// DELETE user
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.candidate.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/users/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to delete user" },
            { status: 500 }
        );
    }
}
