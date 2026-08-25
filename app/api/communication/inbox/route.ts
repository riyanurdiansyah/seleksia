import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCompanyId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * GET /api/communication/inbox
 * Fetch inbound emails with filtering by company slug / company ID, search, and pagination.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const companySlug = searchParams.get("companySlug") || "";
    const companyIdParam = searchParams.get("companyId") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const skip = (page - 1) * limit;

    const cookieStore = await cookies();
    const role = cookieStore.get("userRole")?.value || "user";

    const where: any = {};

    // 1. Role-based tenant isolation
    if (role === "superadmin") {
      if (companySlug && companySlug !== "all") {
        const company = await prisma.company.findUnique({
          where: { slug: companySlug.toLowerCase() },
          select: { id: true },
        });
        if (company) {
          where.companyId = company.id;
        } else {
          // If filtering by non-existent slug, return empty
          where.companyId = "none";
        }
      } else if (companyIdParam && companyIdParam !== "all") {
        where.companyId = companyIdParam;
      }
    } else {
      // Company Admin only sees their own company's incoming emails
      const companyId = await getCompanyId();
      if (companyId) {
        where.companyId = companyId;
      } else {
        return NextResponse.json({ emails: [], total: 0, page, limit, totalPages: 0 });
      }
    }

    // 2. Search keyword
    if (search.trim()) {
      where.OR = [
        { from: { contains: search, mode: "insensitive" } },
        { fromEmail: { contains: search, mode: "insensitive" } },
        { toEmail: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { text: { contains: search, mode: "insensitive" } },
      ];
    }

    // 3. Query DB
    const [total, emails] = await Promise.all([
      prisma.inboundEmail.count({ where }),
      prisma.inboundEmail.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          candidate: {
            select: {
              id: true,
              name: true,
              displayId: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      emails,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/communication/inbox error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inbound emails", details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/communication/inbox
 * Delete an inbound email by ID
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Email ID is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const role = cookieStore.get("userRole")?.value || "user";

    const email = await prisma.inboundEmail.findUnique({
      where: { id },
      select: { companyId: true },
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    if (role !== "superadmin") {
      const companyId = await getCompanyId();
      if (email.companyId && email.companyId !== companyId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await prisma.inboundEmail.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Email deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/communication/inbox error:", error);
    return NextResponse.json({ error: "Failed to delete email" }, { status: 500 });
  }
}
