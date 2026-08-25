import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PUT /api/reports/[id] — Update report status and adminNote
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { status, adminNote } = body;

        const report = await prisma.userReport.findUnique({
            where: { id }
        });

        if (!report) {
            return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
        }

        const updatedReport = await prisma.userReport.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(adminNote !== undefined && { adminNote }),
            }
        });

        return NextResponse.json({
            success: true,
            message: "Status laporan berhasil diperbarui.",
            report: updatedReport
        });

    } catch (error) {
        console.error("PUT /api/reports/[id] error:", error);
        return NextResponse.json({ error: "Gagal memperbarui laporan" }, { status: 500 });
    }
}

// DELETE /api/reports/[id] — Delete report
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const report = await prisma.userReport.findUnique({
            where: { id }
        });

        if (!report) {
            return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
        }

        await prisma.userReport.delete({
            where: { id }
        });

        return NextResponse.json({
            success: true,
            message: "Laporan berhasil dihapus."
        });

    } catch (error) {
        console.error("DELETE /api/reports/[id] error:", error);
        return NextResponse.json({ error: "Gagal menghapus laporan" }, { status: 500 });
    }
}
