import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// PUT update company (superadmin only)
export async function PUT(req: Request) {
  try {
    const { id, name } = await req.json();
    if (!id || !name) {
      return NextResponse.json({ error: "id and name are required" }, { status: 400 });
    }
    // optional slug regeneration
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    const updated = await prisma.company.update({
      where: { id },
      data: { name, slug },
      select: { id: true, name: true }
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/companies/[id] error:", error);
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
  }
}

// DELETE company (superadmin only)
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
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
