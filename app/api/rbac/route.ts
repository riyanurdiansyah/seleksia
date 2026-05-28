import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

// Get all menus and role access mappings
export async function GET(req: NextRequest) {
  try {
    // 1. Get all menus ordered by sortOrder
    const menus = await prisma.menu.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        submenus: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    // 2. Get all current access mappings
    const accessMappings = await prisma.roleMenuAccess.findMany();

    // 3. Format the data to easily map role -> { menuId: { r, c, u, d } }
    const roleAccess: Record<string, Record<string, { r: boolean; c: boolean; u: boolean; d: boolean }>> = {};
    const allRoles = Object.values(Role);

    allRoles.forEach((r) => {
      roleAccess[r] = {};
    });

    accessMappings.forEach((mapping) => {
      roleAccess[mapping.role][mapping.menuId] = {
        r: mapping.canRead,
        c: mapping.canCreate,
        u: mapping.canUpdate,
        d: mapping.canDelete,
      };
    });

    return NextResponse.json({
      menus,
      roles: allRoles,
      roleAccess,
    });
  } catch (error: any) {
    console.error("Failed to fetch RBAC data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Update role access (Bulk save the whole matrix)
export async function PUT(req: NextRequest) {
  try {
    // Expected payload: { matrix: { role: { menuId: { r, c, u, d } } } }
    const { matrix } = await req.json();

    if (!matrix || typeof matrix !== "object") {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    // Wrap in a transaction: delete old mappings, then create new ones
    await prisma.$transaction(async (tx) => {
      // We will just clear all mappings and insert the updated ones
      await tx.roleMenuAccess.deleteMany();

      const newMappings = [];
      for (const role of Object.keys(matrix)) {
        for (const menuId of Object.keys(matrix[role])) {
          const perms = matrix[role][menuId];
          // Only save if at least one permission is true
          if (perms.r || perms.c || perms.u || perms.d) {
            newMappings.push({
              role: role as Role,
              menuId,
              canRead: !!perms.r,
              canCreate: !!perms.c,
              canUpdate: !!perms.u,
              canDelete: !!perms.d,
            });
          }
        }
      }

      if (newMappings.length > 0) {
        await tx.roleMenuAccess.createMany({
          data: newMappings,
        });
      }
    });

    return NextResponse.json({ success: true, message: "Akses menu berhasil diperbarui" });
  } catch (error: any) {
    console.error("Failed to update RBAC:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
