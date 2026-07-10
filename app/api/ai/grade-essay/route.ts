import { NextRequest, NextResponse } from "next/server";
import { gradeEssay } from "@/lib/ai";
import { getCompanyId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { answerId } = body;

    if (!answerId) {
      return NextResponse.json({ error: "Missing answerId" }, { status: 400 });
    }

    const answer = await prisma.examAnswer.findUnique({
      where: { id: answerId },
      include: {
        assignment: { include: { candidate: true } },
      }
    });

    if (!answer || answer.assignment.candidate.companyId !== companyId) {
      return NextResponse.json({ error: "Answer not found or unauthorized" }, { status: 404 });
    }

    const question = await prisma.question.findUnique({
        where: { id: answer.questionId }
    });

    if (!question || question.type !== 'essay') {
        return NextResponse.json({ error: "Invalid question type for auto-grading" }, { status: 400 });
    }

    const evaluation = await gradeEssay(question.text, answer.answer, question.aiRubric);

    // Save evaluation to DB
    const updatedAnswer = await prisma.examAnswer.update({
        where: { id: answerId },
        data: {
            score: evaluation.score,
            aiFeedback: evaluation.feedback
        }
    });

    return NextResponse.json({ success: true, evaluation: updatedAnswer }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/ai/grade-essay error:", error);
    return NextResponse.json(
      { error: "Failed to grade essay", details: error.message },
      { status: 500 }
    );
  }
}
