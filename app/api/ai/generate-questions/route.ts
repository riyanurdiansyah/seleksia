import { NextRequest, NextResponse } from "next/server";
import { generateQuestions } from "@/lib/ai";
import { getCompanyId } from "@/lib/tenant";
import { checkSubscriptionAccess } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // In a real app, you might want to check subscription access for AI features
    // const access = await checkSubscriptionAccess(companyId, 'ai_features');
    // if (!access.allowed) return NextResponse.json({ error: access.message }, { status: 403 });

    const body = await req.json();
    const { testId, topic, type, count, difficulty } = body;

    if (!topic || !type || !count || !testId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const test = await prisma.test.findFirst({
        where: { id: testId, companyId }
    });

    if (!test) {
        return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const questions = await generateQuestions(topic, type, count, difficulty || "Medium");

    // Get max sort order
    const existingQs = await prisma.question.findMany({
        where: { testId, companyId },
        select: { sortOrder: true, displayId: true },
        orderBy: { sortOrder: 'desc' }
    });
    
    let maxSort = existingQs.length > 0 ? existingQs[0].sortOrder : 0;
    
    let maxDisplayNum = 0;
    existingQs.forEach(q => {
        const numPart = q.displayId.split('-')[1];
        if (numPart) {
            const num = parseInt(numPart, 10);
            if (!isNaN(num) && num > maxDisplayNum) {
                maxDisplayNum = num;
            }
        }
    });

    // Save to DB
    const createdQuestions = [];
    for (const q of questions) {
        maxSort++;
        maxDisplayNum++;
        const newQ = await prisma.question.create({
            data: {
                companyId,
                testId,
                displayId: `q-${maxDisplayNum}`,
                type: type,
                text: q.text,
                options: q.options || [],
                correctAnswer: q.correctAnswer || null,
                aiRubric: q.aiRubric || null,
                sortOrder: maxSort,
            }
        });
        createdQuestions.push(newQ);
    }

    return NextResponse.json({ success: true, questions: createdQuestions }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/ai/generate-questions error:", error);
    return NextResponse.json(
      { error: "Failed to generate questions", details: error.message },
      { status: 500 }
    );
  }
}
