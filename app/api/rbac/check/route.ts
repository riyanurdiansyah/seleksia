import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const path = searchParams.get("path");
        const role = searchParams.get("role") as Role;

        // Default permissions if no role or path provided or menu not found
        const defaultPerms = {
            canRead: false,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
        };

        if (!path || !role) {
            return NextResponse.json(defaultPerms);
        }

        // Find the menu by path
        const menu = await prisma.menu.findFirst({
            where: { path }
        });

        if (!menu) {
            return NextResponse.json(defaultPerms);
        }

        // Find access rights
        const access = await prisma.roleMenuAccess.findUnique({
            where: {
                role_menuId: {
                    role: role,
                    menuId: menu.id,
                }
            }
        });

        if (!access) {
            return NextResponse.json(defaultPerms);
        }

        return NextResponse.json({
            canRead: access.canRead,
            canCreate: access.canCreate,
            canUpdate: access.canUpdate,
            canDelete: access.canDelete,
        });
    } catch (error) {
        console.error("GET /api/rbac/check error:", error);
        return NextResponse.json(
            { error: "Failed to check permissions" },
            { status: 500 }
        );
    }
}
