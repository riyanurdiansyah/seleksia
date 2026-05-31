import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createMailcowMailbox } from "../route";

// PUT update company (superadmin only)
export async function PUT(req: Request) {
  try {
    const { id, name, email, password } = await req.json();
    if (!id || !name) {
      return NextResponse.json({ error: "id and name are required" }, { status: 400 });
    }

    // 1. Fetch current company config to check if it has smtpUser
    const company = await prisma.company.findUnique({
      where: { id },
      select: { smtpUser: true }
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    let smtpData = {};

    // 2. If it doesn't have an email yet, and an email is supplied, attempt to create in Mailcow
    if (!company.smtpUser && email) {
      if (!password) {
        return NextResponse.json({ error: "Password is required when email is provided" }, { status: 400 });
      }

      await createMailcowMailbox(email, password, name);

      smtpData = {
        smtpHost: process.env.SMTP_HOST || "mail.seleksia.com",
        smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465,
        smtpUser: email,
        smtpPass: password,
        smtpSender: name
      };
    }

    const slug = name.toLowerCase().replace(/\s+/g, "-");
    const updated = await prisma.company.update({
      where: { id },
      data: { 
        name, 
        slug,
        ...smtpData
      },
      select: { id: true, name: true }
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT /api/companies/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to update company" }, { status: 500 });
  }
}

// DELETE company (superadmin only)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Check if company has a Mailcow email configured
    const company = await prisma.company.findUnique({
      where: { id },
      select: { smtpUser: true }
    });

    // Delete mailbox from Mailcow if configured
    if (company?.smtpUser) {
      try {
        await deleteMailcowMailbox(company.smtpUser);
      } catch (err: any) {
        console.error(`[Mailcow] Failed to delete mailbox ${company.smtpUser}:`, err);
        return NextResponse.json(
          { error: `Gagal menghapus email di Mailcow: ${err.message}. Penghapusan data perusahaan dibatalkan.` },
          { status: 500 }
        );
      }
    }

    await prisma.company.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/companies/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete company" }, { status: 500 });
  }
}

async function deleteMailcowMailbox(email: string) {
  const rawMailcowUrl = process.env.MAILCOW_API_URL;
  const rawMailcowKey = process.env.MAILCOW_API_KEY;

  if (!rawMailcowUrl || !rawMailcowKey) return;

  const mailcowUrl = rawMailcowUrl.trim().replace(/^"|"$/g, "");
  const mailcowKey = rawMailcowKey.trim().replace(/^"|"$/g, "");

  const cleanUrl = mailcowUrl.endsWith("/") ? mailcowUrl.slice(0, -1) : mailcowUrl;

  const res = await fetch(`${cleanUrl}/delete/mailbox`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "accept": "application/json",
      "X-API-Key": mailcowKey
    },
    body: JSON.stringify([email])
  });

  const responseText = await res.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (_) {
    if (!res.ok) throw new Error(responseText);
    return;
  }

  if (Array.isArray(data) && data[0]?.type === "danger") {
    if (data[0].msg === "access_denied") {
      // It might be already deleted. Let's verify by checking if it exists.
      try {
        const checkRes = await fetch(`${cleanUrl}/get/mailbox/${email}`, {
          method: "GET",
          headers: {
            "accept": "application/json",
            "X-API-Key": mailcowKey
          }
        });
        if (checkRes.ok) {
          const checkText = await checkRes.text();
          if (checkText === "{}" || checkText === "[]" || checkText === "null" || !checkText) {
            console.log(`[Mailcow] Mailbox ${email} does not exist. Assuming already deleted.`);
            return; // Exit successfully
          }
        }
      } catch (checkErr) {
        console.error("Failed to check if mailbox exists:", checkErr);
      }
    }
    throw new Error(data[0].msg || "Gagal menghapus mailbox di Mailcow");
  }

  console.log(`[Mailcow] Mailbox ${email} deleted successfully`);
  return data;
}
