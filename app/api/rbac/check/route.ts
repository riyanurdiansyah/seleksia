import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const role = searchParams.get("role") as Role | null;
        let path = searchParams.get("path");

        if (!role || !path) {
            return NextResponse.json({ allowed: false }, { status: 400 });
        }

        // Dashboard is the default landing page for logged-in users.
        if (path === "/dashboard" || path === "/") {
            return NextResponse.json({ allowed: true });
        }

        // Superadmin has access to everything
        if (role === Role.superadmin) {
            return NextResponse.json({ 
                allowed: true,
                canRead: true,
                canCreate: true,
                canUpdate: true,
                canDelete: true 
            });
        }

        // Normalize path for matching (e.g. /master/user/create -> /master/user)
        // We match by finding the most specific menu path that the current path starts with.
        const menus = await prisma.menu.findMany({
            select: { id: true, path: true }
        });

        // Find the best match (longest matching path)
        let matchedMenuId: string | null = null;
        let longestMatchLength = 0;

        for (const menu of menus) {
            if (!menu.path) continue;
            // Menu paths are like "/master/user"
            // If current path is "/master/user/create" or exactly "/master/user"
            if (path === menu.path || path.startsWith(menu.path + "/")) {
                if (menu.path.length > longestMatchLength) {
                    longestMatchLength = menu.path.length;
                    matchedMenuId = menu.id;
                }
            }
        }

        // If no menu matches this path, we'll allow it (it might be a non-menu route like profile)
        // Adjust this policy if you want strict deny by default.
        if (!matchedMenuId) {
            return NextResponse.json({ 
                allowed: true,
                canRead: true,
                canCreate: true,
                canUpdate: true,
                canDelete: true 
            });
        }

        // Check if the role has canRead access for this menu
        const access = await prisma.roleMenuAccess.findFirst({
            where: {
                role: role,
                menuId: matchedMenuId,
            }
        });

        if (access && access.canRead) {
            return NextResponse.json({ 
                allowed: true,
                canRead: access.canRead,
                canCreate: access.canCreate,
                canUpdate: access.canUpdate,
                canDelete: access.canDelete
            });
        }

        return NextResponse.json({ 
            allowed: false,
            canRead: false,
            canCreate: false,
            canUpdate: false,
            canDelete: false 
        });

    } catch (error) {
        console.error("GET /api/rbac/check error:", error);
        return NextResponse.json({ allowed: false }, { status: 500 });
    }
}
