import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET() {
    try {
        const roles = Object.values(Role);
        
        // Count candidates per role
        const roleStats = await Promise.all(roles.map(async (r) => {
            const count = await prisma.candidate.count({
                where: { role: r }
            });
            return {
                id: r,
                name: r.charAt(0).toUpperCase() + r.slice(1),
                userCount: count,
                isSystem: true // Since it's an enum, all roles are system roles
            };
        }));
        
        return NextResponse.json(roleStats);
    } catch (error) {
        console.error("Failed to fetch roles:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
