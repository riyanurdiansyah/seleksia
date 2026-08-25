import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

async function ensureSubscriptionMenu() {
    try {
        const existing = await prisma.menu.findFirst({
            where: { path: "/subscription" }
        });

        if (!existing) {
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

        const reportsExists = await prisma.menu.findFirst({ where: { path: "/reports" } });
        if (!reportsExists) {
            await prisma.menu.create({
                data: {
                    name: "Laporan User",
                    path: "/reports",
                    icon: "support_agent",
                    isActive: true,
                    parentId: null,
                    sortOrder: 100,
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
        await ensureSuperAdminMenus();
        const { searchParams } = new URL(req.url);
        const role = (searchParams.get("role") || "admin") as Role;

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
