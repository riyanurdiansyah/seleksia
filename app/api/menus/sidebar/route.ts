import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const role = (searchParams.get("role") || "admin") as Role;

        // Fetch parent menus with their submenus where role has canRead
        const menus = await prisma.menu.findMany({
            where: {
                parentId: null,
                isActive: true,
                roleAccess: {
                    some: {
                        role: role,
                        canRead: true
                    }
                }
            },
            include: {
                submenus: {
                    where: {
                        isActive: true,
                        roleAccess: {
                            some: {
                                role: role,
                                canRead: true
                            }
                        }
                    },
                    orderBy: {
                        sortOrder: "asc",
                    },
                },
            },
            orderBy: {
                sortOrder: "asc",
            },
        });

        return NextResponse.json(menus);
    } catch (error) {
        console.error("GET /api/menus/sidebar error:", error);
        return NextResponse.json({ error: "Failed to fetch menus" }, { status: 500 });
    }
}
