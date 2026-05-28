import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCompanyId } from "@/lib/tenant";
import { Role } from "@prisma/client";

// GET all users
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const role = searchParams.get('role');
        const companyIdFilter = searchParams.get('companyId');

        const whereClause: any = {};
        
        if (role !== "superadmin") {
            const companyId = await getCompanyId();
            whereClause.companyId = companyId;
        } else if (companyIdFilter && companyIdFilter !== "all") {
            whereClause.companyId = companyIdFilter;
        }

        const users = await prisma.candidate.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                displayId: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                batch: true,
                accessType: true,
                status: true,
                createdAt: true,
                companyId: true,
                company: {
                    select: {
                        name: true
                    }
                }
                // omitting password
            }
        });
        return NextResponse.json(users);
    } catch (error) {
        console.error("GET /api/users error:", error);
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 }
        );
    }
}

// POST create user
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Check for existing email or displayId
        const existing = await prisma.candidate.findFirst({
            where: {
                OR: [
                    { email: body.email },
                    { displayId: body.displayId }
                ]
            }
        });

        if (existing) {
            return NextResponse.json(
                { error: "User dengan Email atau ID Peserta tersebut sudah terdaftar." },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(body.password, 10);
        let companyId = await getCompanyId();
        if (body.currentRole === "superadmin" && body.companyId) {
            companyId = body.companyId;
        }

        const user = await prisma.candidate.create({
            data: {
                companyId,
                displayId: body.displayId, // Ensure unique ID per company manually passed or generated
                name: body.name,
                email: body.email,
                phone: body.phone || null,
                role: (body.role as Role) || "user",
                batch: ["admin", "proctor", "superadmin"].includes(body.role) ? null : (body.batch || null),
                password: hashedPassword,
                accessType: body.accessType || "permanent",
            },
            select: { id: true, name: true, email: true, role: true }
        });

        return NextResponse.json(user, { status: 201 });
    } catch (error) {
        console.error("POST /api/users error:", error);
        return NextResponse.json(
            { error: "Failed to create user" },
            { status: 500 }
        );
    }
}
