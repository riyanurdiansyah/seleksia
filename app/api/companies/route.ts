import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCompanyId } from "@/lib/tenant";

// GET all companies
export async function GET() {
    try {
        const cookieStore = await cookies();
        const role = cookieStore.get("userRole")?.value || "user";
        
        let whereClause = {};
        
        if (role !== "superadmin") {
            const companyId = await getCompanyId();
            if (companyId) {
                whereClause = { id: companyId };
            } else {
                // If they are not superadmin and somehow don't have a companyId, return empty
                return NextResponse.json([]);
            }
        }

        const companies = await prisma.company.findMany({
            where: whereClause,
            select: { id: true, name: true, smtpUser: true, subscriptionPlan: true }
        });
        return NextResponse.json(companies);
    } catch (error) {
        console.error("GET /api/companies error:", error);
        return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
    }
}

// POST create new company (superadmin only)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, password } = body;
        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }
        if (email && !password) {
            return NextResponse.json({ error: "Password is required when email is provided" }, { status: 400 });
        }

        // generate slug (simple)
        const slug = name.toLowerCase().replace(/\s+/g, "-");
        // ensure uniqueness of slug
        const existing = await prisma.company.findFirst({ where: { slug } });
        if (existing) {
            return NextResponse.json({ error: "Company with similar name already exists" }, { status: 400 });
        }

        // 1. If email and password are provided, attempt to register in Mailcow
        if (email && password) {
            await createMailcowMailbox(email, password, name);
        }

        // 2. Save company to database
        const newCompany = await prisma.company.create({
            data: { 
                name, 
                slug,
                ...(email && password ? {
                    smtpHost: process.env.SMTP_HOST || "mail.seleksia.com",
                    smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465,
                    smtpUser: email,
                    smtpPass: password,
                    smtpSender: name
                } : {})
            },
            select: { id: true, name: true }
        });
        return NextResponse.json(newCompany, { status: 201 });
    } catch (error: any) {
        console.error("POST /api/companies error:", error);
        return NextResponse.json({ error: error.message || "Failed to create company" }, { status: 500 });
    }
}

export async function createMailcowMailbox(email: string, password: string, name: string) {
    const rawMailcowUrl = process.env.MAILCOW_API_URL;
    const rawMailcowKey = process.env.MAILCOW_API_KEY;

    if (!rawMailcowUrl || !rawMailcowKey) {
        throw new Error("Konfigurasi Mailcow API (MAILCOW_API_URL / MAILCOW_API_KEY) belum diset di file .env server.");
    }

    const mailcowUrl = rawMailcowUrl.trim().replace(/^"|"$/g, "");
    const mailcowKey = rawMailcowKey.trim().replace(/^"|"$/g, "");

    if (!email.includes("@")) {
        throw new Error("Format email tidak valid. Harus menyertakan '@'.");
    }

    const [localPart, domain] = email.split("@");
    const cleanUrl = mailcowUrl.endsWith("/") ? mailcowUrl.slice(0, -1) : mailcowUrl;

    const payload = {
        local_part: localPart,
        domain: domain,
        name: name,
        password: password,
        password2: password,
        quota: 2048,
        active: 1
    };

    const res = await fetch(`${cleanUrl}/add/mailbox`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "accept": "application/json",
            "X-API-Key": mailcowKey
        },
        body: JSON.stringify(payload)
    });

    const responseText = await res.text();

    let data;
    try {
        data = JSON.parse(responseText);
    } catch (_) {
        if (!res.ok) {
            throw new Error(`Mailcow API Error: ${responseText}`);
        }
        return responseText;
    }

    if (!res.ok) {
        let errMsg = "Failed to create mailbox in Mailcow";
        if (Array.isArray(data) && data[0]?.msg) {
            errMsg = data[0].msg;
        } else if (data?.message) {
            errMsg = data.message;
        }
        throw new Error(`Mailcow API Error: ${errMsg}`);
    }

    if (Array.isArray(data) && data[0]?.type === "danger") {
        throw new Error(`Mailcow API Error: ${data[0].msg || "Gagal membuat email di Mailcow"}`);
    }
    
    return data;
}

