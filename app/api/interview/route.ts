import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const sessions = await prisma.interviewSession.findMany({
            include: {
                candidate: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({ success: true, sessions });
    } catch (error) {
        console.error("Fetch interviews error:", error);
        return NextResponse.json({ success: false, error: "Gagal mengambil data wawancara" }, { status: 500 });
    }
}
