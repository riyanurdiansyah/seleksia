import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// GET all articles
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");

        const whereClause: any = {};
        if (status) {
            whereClause.status = status;
        }

        const articles = await prisma.article.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(articles);
    } catch (error) {
        console.error("GET /api/articles error:", error);
        return NextResponse.json(
            { error: "Failed to fetch articles" },
            { status: 500 }
        );
    }
}

// POST create article
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const cookieStore = await cookies();
        const role = cookieStore.get('userRole')?.value;

        if (!role || !['admin', 'superadmin'].includes(role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { title, slug, content, excerpt, coverImage, seoTitle, seoDescription, seoKeywords, status, author } = body;

        if (!title || !slug || !content) {
            return NextResponse.json({ error: "Title, slug, and content are required" }, { status: 400 });
        }

        const article = await prisma.article.create({
            data: {
                title,
                slug,
                content,
                excerpt,
                coverImage,
                seoTitle,
                seoDescription,
                seoKeywords,
                status: status || "draft",
                author,
            },
        });

        return NextResponse.json(article, { status: 201 });
    } catch (error) {
        console.error("POST /api/articles error:", error);
        return NextResponse.json(
            { error: "Failed to create article" },
            { status: 500 }
        );
    }
}
