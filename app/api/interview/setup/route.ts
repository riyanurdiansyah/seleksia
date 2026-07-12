import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { candidateId, position, context, language, maxQuestions, accessStart, accessEnd } = body;

        if (!candidateId) {
            return NextResponse.json({ error: "Missing candidateId" }, { status: 400 });
        }

        // Create or update the interview session configuration
        const session = await prisma.interviewSession.create({
            data: {
                candidateId,
                position: position || "Posisi Umum",
                context: context || "No specific context provided. Just conduct a general HR interview.",
                language: language || "id",
                maxQuestions: maxQuestions || 5,
                accessStart: accessStart ? new Date(accessStart) : null,
                accessEnd: accessEnd ? new Date(accessEnd) : null,
                status: "pending",
                chatHistory: [], // empty array to start
            }
        });

        return NextResponse.json({ success: true, session });
    } catch (error) {
        console.error("Setup interview error:", error);
        return NextResponse.json(
            { error: "Failed to setup interview", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
