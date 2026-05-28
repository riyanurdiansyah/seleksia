import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const flat = searchParams.get("flat") === "true";

        if (flat) {
            const menus = await prisma.menu.findMany({
                orderBy: {
                    sortOrder: "asc",
                },
            });
            return NextResponse.json(menus);
        }

        // Fetch parent menus with their submenus
        const parentMenus = await prisma.menu.findMany({
            where: {
                parentId: null,
            },
            include: {
                submenus: {
                    orderBy: {
                        sortOrder: "asc",
                    },
                },
            },
            orderBy: {
                sortOrder: "asc",
            },
        });

        return NextResponse.json(parentMenus);
    } catch (error) {
        console.error("GET /api/menus error:", error);
        return NextResponse.json({ error: "Failed to fetch menus" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, path, icon, isActive, parentId, sortOrder } = body;

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const menu = await prisma.menu.create({
            data: {
                name,
                path: path || null,
                icon: icon || null,
                isActive: isActive !== undefined ? isActive : true,
                parentId: parentId || null,
                sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
                roleAccess: {
                    create: {
                        role: "admin",
                        canRead: true,
                        canCreate: true,
                        canUpdate: true,
                        canDelete: true,
                    },
                },
            },
        });

        return NextResponse.json(menu, { status: 201 });
    } catch (error) {
        console.error("POST /api/menus error:", error);
        return NextResponse.json({ error: "Failed to create menu" }, { status: 500 });
    }
}
