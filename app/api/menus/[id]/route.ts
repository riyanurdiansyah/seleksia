import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name, path, icon, isActive, parentId, sortOrder } = body;

        const menu = await prisma.menu.update({
            where: { id },
            data: {
                name,
                path: path !== undefined ? (path || null) : undefined,
                icon: icon !== undefined ? (icon || null) : undefined,
                isActive: isActive !== undefined ? isActive : undefined,
                parentId: parentId !== undefined ? (parentId || null) : undefined,
                sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : undefined,
            },
        });

        return NextResponse.json(menu);
    } catch (error) {
        console.error("PUT /api/menus/[id] error:", error);
        return NextResponse.json({ error: "Failed to update menu" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await prisma.menu.delete({
            where: { id },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/menus/[id] error:", error);
        return NextResponse.json({ error: "Failed to delete menu" }, { status: 500 });
    }
}
