import ResultsClient from "./ResultsClient";
import { prisma } from "@/lib/prisma";

export default async function ResultsPage() {
    // Fetch completed test assignments
    const completedAssignments = await prisma.testAssignment.findMany({
        where: { status: "completed" },
        orderBy: { completedAt: "desc" },
        include: {
            candidate: {
                select: {
                    name: true,
                    displayId: true,
                    batch: true
                }
            },
            test: {
                select: {
                    name: true,
                    category: true,
                    duration: true
                }
            },
            examSession: true,
            _count: {
                select: { violations: true, answers: true }
            }
        }
    });

    // We'll calculate a dynamic score here per assignment (if simple correct answer logic applies)
    // Actually, we can fetch all answers for these assignments to calculate scores, 
    // but for the overview, we'll just show answers count and violations.

    // Map to plain objects
    const resultsData = completedAssignments.map(a => ({
        id: a.id,
        candidateName: a.candidate.name,
        candidateId: a.candidate.displayId,
        testName: a.test.name,
        category: a.test.category,
        batch: a.candidate.batch || "-",
        completedAt: a.completedAt ? a.completedAt.toISOString() : "",
        timeUsedSeconds: a.examSession?.timeUsedSeconds || 0,
        answeredCount: a.examSession?.answeredCount || a._count.answers,
        violations: a._count.violations,
        autoSubmitted: a.examSession?.autoSubmitted || false
    }));

    return <ResultsClient initialData={resultsData} />;
}
