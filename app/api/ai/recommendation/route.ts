import { NextRequest, NextResponse } from "next/server";
import { generateExecutiveRecommendation } from "@/lib/ai";
import { getCompanyId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { calculateCompetencyProfile, resolveScoringConfig } from "@/lib/competencyScoring";

export async function POST(req: NextRequest) {
    try {
        const companyId = await getCompanyId();
        if (!companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { assignmentId, userCustomPrompt } = body;

        if (!assignmentId) {
            return NextResponse.json({ error: "Missing assignmentId" }, { status: 400 });
        }

        const assignment = await prisma.testAssignment.findUnique({
            where: { id: assignmentId },
            include: {
                candidate: true,
                test: {
                    include: {
                        company: {
                            select: { scoringConfig: true }
                        },
                        questions: {
                            orderBy: { sortOrder: "asc" }
                        }
                    }
                },
                examSession: true,
                violations: true,
                answers: true
            }
        });

        if (!assignment) {
            return NextResponse.json({ error: "Hasil tes tidak ditemukan" }, { status: 404 });
        }

        // STRICT CHECK: Single-use generation guard
        const existingRows: any[] = await prisma.$queryRaw`
            SELECT "aiRecommendation", "aiRecommendationGeneratedAt", "aiPromptContext"
            FROM "test_assignments"
            WHERE "id" = ${assignmentId}
            LIMIT 1
        `;

        if (existingRows.length > 0 && existingRows[0].aiRecommendation) {
            return NextResponse.json({
                error: "Rekomendasi AI untuk hasil tes ini sudah pernah dibuat sebelumnya dan hanya dapat di-generate 1 kali.",
                aiRecommendation: existingRows[0].aiRecommendation,
                aiRecommendationGeneratedAt: existingRows[0].aiRecommendationGeneratedAt,
                aiPromptContext: existingRows[0].aiPromptContext
            }, { status: 400 });
        }

        // Calculate competency profile
        const activeScoringConfig = resolveScoringConfig(assignment.test.scoringConfig as any, assignment.test.company?.scoringConfig as any);
        const compProfile = calculateCompetencyProfile(
            assignment.test.questions.map(q => ({
                id: q.id,
                competency: q.competency?.trim() || assignment.test.description?.trim() || "General Competency",
                correctAnswer: q.correctAnswer,
                optionWeights: q.optionWeights as Record<string, number> | null,
                type: q.type,
                text: q.text
            })),
            assignment.answers.map(ans => ({
                questionId: ans.questionId,
                answer: ans.answer
            })),
            activeScoringConfig as any
        );

        // Generate recommendation via AI Engine
        const aiText = await generateExecutiveRecommendation({
            candidateName: assignment.candidate.name,
            testName: assignment.test.name,
            testDescription: assignment.test.description || undefined,
            overallScore: compProfile.overallScore,
            overallCategory: compProfile.overallCategory,
            hiringRecommendation: compProfile.hiringRecommendation,
            recommendationRationale: compProfile.recommendationRationale,
            competencies: compProfile.competencies.map(c => ({
                name: c.name,
                score: c.score,
                status: c.status,
                passedBenchmark: c.passedBenchmark
            })),
            topStrengths: compProfile.topStrengths.map(s => s.name),
            topDevelopmentAreas: compProfile.topDevelopmentAreas.map(d => d.name),
            violationsCount: assignment.violations.length,
            userCustomPrompt: userCustomPrompt?.trim() || undefined
        });

        const generatedAt = new Date();

        // Persist to database
        await prisma.$executeRaw`
            UPDATE "test_assignments"
            SET "aiRecommendation" = ${aiText},
                "aiRecommendationGeneratedAt" = ${generatedAt},
                "aiPromptContext" = ${userCustomPrompt?.trim() || null}
            WHERE "id" = ${assignmentId}
        `;

        return NextResponse.json({
            success: true,
            aiRecommendation: aiText,
            aiRecommendationGeneratedAt: generatedAt.toISOString(),
            aiPromptContext: userCustomPrompt?.trim() || null
        }, { status: 200 });

    } catch (error: any) {
        console.error("POST /api/ai/recommendation error:", error);
        return NextResponse.json(
            { error: "Gagal membuat rekomendasi AI", details: error.message },
            { status: 500 }
        );
    }
}
