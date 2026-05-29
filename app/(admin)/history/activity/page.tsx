import ActivityClient from "./ActivityClient";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getCompanyId } from "@/lib/tenant";

export default async function ActivityPage() {
    const cookieStore = await cookies();
    const role = cookieStore.get("userRole")?.value || "user";
    const companyId = await getCompanyId();

    const whereViolation: any = {};
    const whereAssignment: any = {};

    if (role !== "superadmin") {
        whereViolation.assignment = {
            candidate: {
                companyId: companyId
            }
        };
        whereAssignment.candidate = {
            companyId: companyId
        };
    }

    // 1. Fetch recent violations
    const violations = await prisma.violation.findMany({
        where: whereViolation,
        take: 200,
        orderBy: { detectedAt: 'desc' },
        include: {
            assignment: {
                include: { candidate: true, test: true }
            }
        }
    });

    // 2. Fetch recent completions
    const completions = await prisma.testAssignment.findMany({
        where: {
            ...whereAssignment,
            status: 'completed'
        },
        take: 200,
        orderBy: { completedAt: 'desc' },
        include: { candidate: true, test: true }
    });

    // 3. Fetch recently started tests
    const startedStats = await prisma.testAssignment.findMany({
        where: {
            ...whereAssignment,
            status: 'in_progress'
        },
        take: 200,
        orderBy: { startedAt: 'desc' },
        include: { candidate: true, test: true }
    });

    // 4. Combine all into a universal feed
    const allActivities = [
        ...violations.map((v) => ({
            id: `v-${v.id}`,
            type: "violation",
            icon: "warning",
            iconBg: "bg-red-100 dark:bg-red-900/30 text-red-600",
            title: `Cheating: ${v.type?.replace(/_/g, ' ') || 'violation'}`,
            description: `${v.assignment?.candidate?.name || 'Unknown Candidate'} triggered: ${v.type?.replace(/_/g, ' ') || 'violation'}.`,
            time: v.detectedAt,
            badge: "Flagged",
            badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
            targetName: v.assignment?.test?.name || "Unknown Test",
            candidateId: v.assignment?.candidate?.displayId || "-",
            candidateDbId: v.assignment?.candidate?.id || "unknown",
            candidateName: v.assignment?.candidate?.name || "Unknown Candidate",
            assignmentId: v.assignmentId,
            sessionId: v.sessionId || "no-session",
        })),
        ...completions.map((c) => ({
            id: `c-${c.id}`,
            type: "completed",
            icon: "check_circle",
            iconBg: "bg-green-100 dark:bg-green-900/30 text-green-600",
            title: "Test Completed",
            description: `${c.candidate?.name || 'Unknown'} finished "${c.test?.name || 'Unknown'}".`,
            time: c.completedAt!,
            badge: "Finished",
            badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
            targetName: c.test?.name || "Unknown Test",
            candidateId: c.candidate?.displayId || "-",
            candidateDbId: c.candidate?.id || "unknown",
            candidateName: c.candidate?.name || "Unknown Candidate",
            assignmentId: c.id,
            sessionId: "no-session",
        })),
        ...startedStats.map((s) => ({
            id: `s-${s.id}`,
            type: "started",
            icon: "play_circle",
            iconBg: "bg-amber-100 dark:bg-amber-900/30 text-amber-600",
            title: "Test Started",
            description: `${s.candidate?.name || 'Unknown'} started "${s.test?.name || 'Unknown'}".`,
            time: s.startedAt!,
            badge: "In Progress",
            badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
            targetName: s.test?.name || "Unknown Test",
            candidateId: s.candidate?.displayId || "-",
            candidateDbId: s.candidate?.id || "unknown",
            candidateName: s.candidate?.name || "Unknown Candidate",
            assignmentId: s.id,
            sessionId: "no-session",
        }))
    ];

    // 5. Sort descending by actual timestamp
    const sortedFeed = allActivities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // 6. Map to add relative time 
    const activityFeed = sortedFeed.map((item) => {
        const diffMs = new Date().getTime() - new Date(item.time).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const timeStr = diffMins < 60 ? `${diffMins}m ago` : diffMins < 1440 ? `${Math.floor(diffMins / 60)}h ago` : `${Math.floor(diffMins / 1440)}d ago`;

        return {
            ...item,
            relativeTime: timeStr,
            rawTime: item.time.toISOString()
        };
    });

    return <ActivityClient initialData={activityFeed} />;
}
