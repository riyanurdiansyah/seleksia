import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCompanyId } from "@/lib/tenant";
import { checkSubscriptionAccess } from "@/lib/subscription";
import { sendWelcomeEmail } from "@/lib/email";


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { candidates } = body;

        if (!Array.isArray(candidates)) {
            return NextResponse.json(
                { error: "Payload tidak valid. Diharapkan sebuah array." },
                { status: 400 }
            );
        }

        const companyId = await getCompanyId();

        // Check subscription limits based on import size
        const access = await checkSubscriptionAccess(companyId, 'create_candidate', candidates.length);
        if (!access.allowed) {
            return NextResponse.json({ error: access.message }, { status: 403 });
        }

        // 1. Get existing emails to check for duplicates
        const existingCandidates = await prisma.candidate.findMany({
            where: { companyId },
            select: { email: true },
        });
        const existingEmails = new Set(existingCandidates.map((c) => c.email.toLowerCase()));

        const validCandidates = [];
        const skipped = [];
        const processedEmails = new Set<string>();

        // 2. Initial validation and duplicate check
        for (const raw of candidates) {
            const name = raw.name?.toString().trim();
            const email = raw.email?.toString().trim().toLowerCase();

            if (!name || !email) {
                skipped.push({
                    name: name || "—",
                    email: email || "—",
                    reason: "Nama atau email tidak boleh kosong",
                });
                continue;
            }

            if (existingEmails.has(email) || processedEmails.has(email)) {
                skipped.push({
                    name,
                    email,
                    reason: "Email sudah terdaftar",
                });
                continue;
            }

            processedEmails.add(email);

            // Access Type check and default normalization
            const accessType = raw.accessType?.toString().trim().toLowerCase() === "permanent" ? "permanent" : "range";
            
            // Format dates
            let accessStart: Date | null = null;
            let accessEnd: Date | null = null;
            
            if (accessType === "range") {
                if (raw.accessStart) {
                    const parsedStart = new Date(raw.accessStart);
                    if (!isNaN(parsedStart.getTime())) {
                        accessStart = parsedStart;
                    }
                }
                if (raw.accessEnd) {
                    const parsedEnd = new Date(raw.accessEnd);
                    if (!isNaN(parsedEnd.getTime())) {
                        accessEnd = parsedEnd;
                    }
                }
            }

            // Normalise role
            let role = "user";
            const rawRole = raw.role?.toString().trim().toLowerCase();
            if (rawRole === "admin") role = "admin";
            else if (rawRole === "proctor") role = "proctor";

            validCandidates.push({
                name,
                email,
                phone: raw.phone?.toString().trim() || null,
                role,
                batch: raw.batch?.toString().trim() || null,
                plainPassword: null,
                accessType,
                accessStart,
                accessEnd,
            });
        }

        // 3. Assign display IDs sequentially (avoiding race conditions)
        const allCandidates = await prisma.candidate.findMany({
            where: { companyId, displayId: { startsWith: 'USR-' } },
            select: { displayId: true }
        });
        
        let maxNum = 0;
        for (const c of allCandidates) {
            const numPart = c.displayId.split('-')[1];
            if (numPart) {
                const num = parseInt(numPart, 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
        }
        let count = maxNum;
        const candidatesWithIds = validCandidates.map((c) => {
            count++;
            const displayId = `USR-${String(count).padStart(3, "0")}`;
            const finalPassword = displayId;
            return { ...c, displayId, plainPassword: finalPassword };
        });

        // 4. Hash passwords concurrently
        const candidatesToCreate = await Promise.all(
            candidatesWithIds.map(async (c) => {
                const hashedPassword = await bcrypt.hash(c.plainPassword, 10);
                return {
                    companyId,
                    displayId: c.displayId,
                    name: c.name,
                    email: c.email,
                    phone: c.phone,
                    role: c.role as any,
                    batch: c.role === "user" ? c.batch : null,
                    password: hashedPassword,
                    accessType: c.accessType as any,
                    accessStart: c.accessStart,
                    accessEnd: c.accessEnd,
                    status: "registered" as any,
                };
            })
        );

        // 5. Bulk insert using Prisma
        let insertedCount = 0;
        if (candidatesToCreate.length > 0) {
            const result = await prisma.candidate.createMany({
                data: candidatesToCreate,
            });
            insertedCount = result.count;

            // Send welcome emails asynchronously
            try {
                const createdCandidates = await prisma.candidate.findMany({
                    where: {
                        companyId,
                        email: { in: candidatesToCreate.map(c => c.email) }
                    }
                });
                
                Promise.allSettled(
                    createdCandidates.map(c => sendWelcomeEmail(c.id, c.displayId))
                ).catch(console.error);
            } catch (err) {
                console.error("Failed to send bulk welcome emails:", err);
            }
        }

        // Return status check results
        return NextResponse.json({
            success: true,
            insertedCount,
            skippedCount: skipped.length,
            skipped,
            importedCandidates: candidatesWithIds.map(c => ({
                displayId: c.displayId,
                name: c.name,
                email: c.email,
                password: c.plainPassword
            }))
        });

    } catch (error) {
        console.error("POST /api/candidates/import error:", error);
        return NextResponse.json(
            {
                error: "Gagal mengimpor data kandidat",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
