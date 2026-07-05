import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

async function ensureSubscriptionMenu() {
    try {
        // Check if menu with path '/subscription' exists
        const existing = await prisma.menu.findFirst({
            where: { path: "/subscription" }
        });

        if (!existing) {
            // Create menu and set permissions for admin and superadmin
            await prisma.menu.create({
                data: {
                    name: "Subscription",
                    path: "/subscription",
                    icon: "credit_card",
                    isActive: true,
                    parentId: null,
                    sortOrder: 95,
                    roleAccess: {
                        createMany: {
                            data: [
                                {
                                    role: Role.admin,
                                    canRead: true,
                                    canCreate: true,
                                    canUpdate: true,
                                    canDelete: true
                                },
                                {
                                    role: Role.superadmin,
                                    canRead: true,
                                    canCreate: true,
                                    canUpdate: true,
                                    canDelete: true
                                }
                            ]
                        }
                    }
                }
            });
        }
    } catch (err) {
        console.error("Failed to ensure subscription menu exists:", err);
    }
}

async function ensureSuperAdminMenus() {
    try {
        const rbacExists = await prisma.menu.findFirst({ where: { path: "/rbac" } });
        if (!rbacExists) {
            await prisma.menu.create({
                data: {
                    name: "Manajemen Akses",
                    path: "/rbac",
                    icon: "security",
                    isActive: true,
                    parentId: null,
                    sortOrder: 98,
                    roleAccess: {
                        createMany: {
                            data: [
                                {
                                    role: Role.superadmin,
                                    canRead: true,
                                    canCreate: true,
                                    canUpdate: true,
                                    canDelete: true
                                }
                            ]
                        }
                    }
                }
            });
        }

        const plansExists = await prisma.menu.findFirst({ where: { path: "/plans" } });
        if (!plansExists) {
            await prisma.menu.create({
                data: {
                    name: "Paket Langganan",
                    path: "/plans",
                    icon: "local_offer",
                    isActive: true,
                    parentId: null,
                    sortOrder: 99,
                    roleAccess: {
                        createMany: {
                            data: [
                                {
                                    role: Role.superadmin,
                                    canRead: true,
                                    canCreate: true,
                                    canUpdate: true,
                                    canDelete: true
                                }
                            ]
                        }
                    }
                }
            });
        }
    } catch (err) {
        console.error("Failed to ensure superadmin menus:", err);
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const role = (searchParams.get("role") || "admin") as Role;

        // Auto-ensure the subscription menu is seeded for the user
        if (role === Role.admin || role === Role.superadmin) {
            await ensureSubscriptionMenu();
        }

        if (role === Role.superadmin) {
            await ensureSuperAdminMenus();
        }


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
