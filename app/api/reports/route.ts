import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/tenant";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/reports — List all user reports
export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const userRole = cookieStore.get("userRole")?.value || "";

        // Check if user has permission to read reports
        // If not superadmin, check RBAC path /reports
        if (userRole !== "superadmin") {
            const rbacAccess = await prisma.roleMenuAccess.findFirst({
                where: {
                    role: userRole as any,
                    menu: { path: "/reports" }
                }
            });

            if (!rbacAccess || !rbacAccess.canRead) {
                return NextResponse.json({ error: "Akses ditolak. Fitur ini hanya untuk Superadmin." }, { status: 403 });
            }
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const category = searchParams.get("category");

        const whereCondition: any = {};
        if (status && status !== "all") {
            whereCondition.status = status;
        }
        if (category && category !== "all") {
            whereCondition.category = category;
        }

        const reports = await prisma.userReport.findMany({
            where: whereCondition,
            orderBy: { createdAt: "desc" },
            include: {
                company: {
                    select: { id: true, name: true, slug: true }
                },
                candidate: {
                    select: { id: true, name: true, email: true, role: true }
                }
            }
        });

        return NextResponse.json(reports);

    } catch (error) {
        console.error("GET /api/reports error:", error);
        return NextResponse.json({ error: "Gagal mengambil data laporan" }, { status: 500 });
    }
}

// POST /api/reports — Submit a new user report
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { category, subject, message, reporterName, reporterEmail } = body;

        if (!subject || !message) {
            return NextResponse.json({ error: "Subjek dan pesan laporan wajib diisi." }, { status: 400 });
        }

        const companyId = await getCompanyId();
        const cookieStore = await cookies();
        const candidateId = cookieStore.get("candidateId")?.value || null;

        // Try to resolve reporter info if not passed directly
        let finalReporterName = reporterName;
        let finalReporterEmail = reporterEmail;

        if (candidateId) {
            const candidate = await prisma.candidate.findUnique({
                where: { id: candidateId },
                select: { name: true, email: true }
            });
            if (candidate) {
                finalReporterName = finalReporterName || candidate.name;
                finalReporterEmail = finalReporterEmail || candidate.email;
            }
        }

        const report = await prisma.userReport.create({
            data: {
                companyId: companyId && companyId !== "default-company-id" ? companyId : null,
                candidateId: candidateId || null,
                reporterName: finalReporterName || "Pengguna Seleksia",
                reporterEmail: finalReporterEmail || "user@seleksia.com",
                category: category || "general",
                subject,
                message,
                status: "pending"
            }
        });

        return NextResponse.json({
            success: true,
            message: "Laporan Anda telah berhasil dikirim ke tim Seleksia.",
            report
        }, { status: 201 });

    } catch (error) {
        console.error("POST /api/reports error:", error);
        return NextResponse.json({ error: "Gagal mengirim laporan" }, { status: 500 });
    }
}
