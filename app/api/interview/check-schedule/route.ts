import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const candidateId = searchParams.get("candidateId");

        if (!candidateId) {
            return NextResponse.json({ success: false, error: "Missing candidateId" }, { status: 400 });
        }

        const session = await prisma.interviewSession.findFirst({
            where: { candidateId },
            orderBy: { createdAt: 'desc' }
        });

        if (!session) {
            return NextResponse.json({ success: false, error: "Sesi wawancara belum diatur untuk Anda." });
        }

        const now = new Date();

        if (session.accessStart && now < new Date(session.accessStart)) {
            const startDate = new Date(session.accessStart).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
            return NextResponse.json({ 
                success: false, 
                error: `Jadwal wawancara Anda belum dimulai. Silakan kembali pada ${startDate}` 
            });
        }

        if (session.accessEnd && now > new Date(session.accessEnd)) {
            return NextResponse.json({ 
                success: false, 
                error: "Jadwal wawancara Anda telah berakhir dan sudah ditutup." 
            });
        }

        if (session.status === "completed" || session.status === "analyzed") {
            return NextResponse.json({ 
                success: false, 
                error: "Anda sudah menyelesaikan sesi wawancara ini sebelumnya." 
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Check schedule error:", error);
        return NextResponse.json({ success: false, error: "Terjadi kesalahan sistem." }, { status: 500 });
    }
}
