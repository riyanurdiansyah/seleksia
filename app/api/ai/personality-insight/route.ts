import { NextRequest, NextResponse } from "next/server";
import { generatePersonalityInsight } from "@/lib/ai";
import { getCompanyId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { candidateId } = body;

    if (!candidateId) {
      return NextResponse.json({ error: "Missing candidateId" }, { status: 400 });
    }

    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, companyId },
      include: {
        assignments: {
            include: {
                answers: true
            }
        }
      }
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const questionIds = new Set<string>();
    candidate.assignments.forEach(assignment => {
        assignment.answers.forEach(ans => questionIds.add(ans.questionId));
    });

    const questions = await prisma.question.findMany({
        where: { id: { in: Array.from(questionIds) } }
    });

    const questionMap = new Map();
    questions.forEach(q => questionMap.set(q.id, q));

    // Collect all essay answers
    const essayAnswers: { question: string; answer: string }[] = [];
    
    candidate.assignments.forEach(assignment => {
        assignment.answers.forEach(ans => {
            const question = questionMap.get(ans.questionId);
            if (question && question.type === 'essay' && ans.answer && ans.answer.trim().length > 10) {
                essayAnswers.push({
                    question: question.text,
                    answer: ans.answer
                });
            }
        });
    });

    if (essayAnswers.length === 0) {
        return NextResponse.json({ error: "Not enough essay data to generate insight" }, { status: 400 });
    }

    const insight = await generatePersonalityInsight(candidate.name, essayAnswers);

    // Save insight to DB
    await prisma.candidate.update({
        where: { id: candidateId },
        data: {
            aiPersonalityInsight: insight
        }
    });

    return NextResponse.json({ success: true, insight }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/ai/personality-insight error:", error);
    return NextResponse.json(
      { error: "Failed to generate insight", details: error.message },
      { status: 500 }
    );
  }
}
