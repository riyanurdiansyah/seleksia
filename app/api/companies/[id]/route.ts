import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
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

    if (email) {
      smtpData = {
        smtpUser: email,
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



    await prisma.company.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/companies/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete company" }, { status: 500 });
  }
}

