import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// GET single article
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = await params;
        const article = await prisma.article.findUnique({
            where: { id },
        });

        if (!article) {
            return NextResponse.json({ error: "Article not found" }, { status: 404 });
        }

        return NextResponse.json(article);
    } catch (error) {
        console.error("GET /api/articles/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to fetch article" },
            { status: 500 }
        );
    }
}

// PUT update article
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = await params;
        const body = await req.json();

        const cookieStore = await cookies();
        const role = cookieStore.get('userRole')?.value;

        if (!role || !['admin', 'superadmin'].includes(role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { title, slug, content, excerpt, coverImage, seoTitle, seoDescription, seoKeywords, status, author } = body;

        const article = await prisma.article.update({
            where: { id },
            data: {
                title,
                slug,
                content,
                excerpt,
                coverImage,
                seoTitle,
                seoDescription,
                seoKeywords,
                status,
                author,
            },
        });

        return NextResponse.json(article);
    } catch (error) {
        console.error("PUT /api/articles/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to update article" },
            { status: 500 }
        );
    }
}

// DELETE article
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = await params;
        
        const cookieStore = await cookies();
        const role = cookieStore.get('userRole')?.value;

        if (!role || !['admin', 'superadmin'].includes(role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await prisma.article.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/articles/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to delete article" },
            { status: 500 }
        );
    }
}
