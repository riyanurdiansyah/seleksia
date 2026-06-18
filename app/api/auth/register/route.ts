import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role, AccessType, CandidateStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { companyName, companySlug, adminName, adminEmail, adminPassword, planName } = body as {
            companyName: string;
            companySlug: string;
            adminName: string;
            adminEmail: string;
            adminPassword?: string;
            planName?: string;
        };

        if (!companyName || !companySlug || !adminName || !adminEmail || !adminPassword) {
            return NextResponse.json({ error: "Semua kolom pendaftaran wajib diisi" }, { status: 400 });
        }

        const normalizedSlug = companySlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
        const normalizedEmail = adminEmail.trim().toLowerCase();

        // 1. Check if company slug already exists
        const existingCompany = await prisma.company.findUnique({
            where: { slug: normalizedSlug }
        });

        if (existingCompany) {
            return NextResponse.json({ error: "Slug/Subdomain perusahaan sudah terdaftar. Silakan pilih slug lain." }, { status: 400 });
        }

        // 2. Check if admin email already exists (global check or per-company? In schema, email is unique per company, but to avoid confusion let's check globally first)
        const existingAdmin = await prisma.candidate.findFirst({
            where: { email: normalizedEmail }
        });

        if (existingAdmin) {
            return NextResponse.json({ error: "Email administrator sudah digunakan oleh akun lain." }, { status: 400 });
        }

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Calculate subscription parameters
        const selectedPlan = planName || "Free";
        const now = new Date();
        let amount = 0;
        let subStatus = "active"; // Free is active by default
        let redirectTo = "/dashboard";

        if (selectedPlan === "Starter") {
            amount = 290000;
            subStatus = "pending_payment";
            redirectTo = "/payment";
        } else if (selectedPlan === "Business") {
            amount = 750000;
            subStatus = "pending_payment";
            redirectTo = "/payment";
        }

        // 4. Perform database transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create Company
            const company = await tx.company.create({
                data: {
                    name: companyName,
                    slug: normalizedSlug,
                    subscriptionPlan: selectedPlan,
                    subscriptionStatus: subStatus,
                    subscriptionStartedAt: selectedPlan === "Free" ? now : null,
                    subscriptionExpiresAt: null,
                }
            });

            // Create Admin Candidate
            const admin = await tx.candidate.create({
                data: {
                    companyId: company.id,
                    displayId: "PSK-001",
                    name: adminName,
                    email: normalizedEmail,
                    password: hashedPassword,
                    role: Role.admin,
                    accessType: AccessType.permanent,
                    status: CandidateStatus.registered,
                }
            });

            // Seed default instructions for the new company
            const defaultGeneralInstructions = [
                "Ujian ini dibatasi waktu secara ketat. Begitu dimulai, waktu tidak bisa dijeda.",
                "Kamera Anda harus tetap aktif dan wajah Anda harus terlihat jelas selama seluruh proses ujian.",
                "Dilarang berpindah tab, membuka aplikasi lain (Alt+Tab), atau meminimalkan browser. Pelanggaran berulang dapat mengakibatkan diskualifikasi otomatis.",
                "Fitur klik kanan, copy, dan paste dinonaktifkan secara otomatis selama ujian berlangsung.",
                "Jawaban Anda akan tersimpan secara otomatis setiap kali Anda memilih atau mengubah pilihan jawaban.",
                "Jika waktu ujian (timer) mencapai angka nol, ujian Anda akan otomatis dikirim (ter-submit).",
                "Sistem proctoring AI akan mengambil foto secara acak selama ujian untuk keperluan verifikasi.",
                "Hanya boleh ada satu wajah yang tertangkap di dalam bingkai kamera selama ujian berlangsung."
            ];

            await Promise.all(
                defaultGeneralInstructions.map((content) =>
                    tx.instruction.create({
                        data: {
                            content,
                            type: "general",
                            companyId: company.id,
                        }
                    })
                )
            );

            // Log initial payment if not free
            if (amount > 0) {
                await tx.subscriptionPayment.create({
                    data: {
                        companyId: company.id,
                        plan: selectedPlan,
                        amount: amount,
                        status: "pending",
                        paymentMethod: "Midtrans Gateway",
                    }
                });
            }

            return { company, admin };
        });

        // 5. Set session cookies
        const response = NextResponse.json({
            success: true,
            candidate: {
                id: result.admin.id,
                displayId: result.admin.displayId,
                name: result.admin.name,
                email: result.admin.email,
                role: result.admin.role,
            },
            redirectTo: redirectTo,
        });

        response.cookies.set("companyId", result.company.id, { path: "/", httpOnly: true });
        response.cookies.set("userRole", result.admin.role, { path: "/", httpOnly: true });

        return response;

    } catch (error) {
        console.error("POST /api/auth/register error:", error);
        return NextResponse.json({ error: "Proses pendaftaran gagal. Silakan coba lagi." }, { status: 500 });
    }
}
