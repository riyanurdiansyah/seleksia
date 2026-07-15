import { NextRequest, NextResponse } from "next/server";
import { generateArticle } from "@/lib/ai";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { topic, keywords, tone } = body;

        if (!topic) {
            return NextResponse.json({ error: "Topic is required" }, { status: 400 });
        }

        const articleData = await generateArticle(topic, keywords || "", tone);

        return NextResponse.json(articleData, { status: 200 });
    } catch (error) {
        console.error("POST /api/articles/generate error:", error);
        return NextResponse.json(
            { error: "Failed to generate article" },
            { status: 500 }
        );
    }
}
