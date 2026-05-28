import DashboardClient from "./DashboardClient";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
    // 1. Total Participants
    const totalParticipants = await prisma.candidate.count({
        where: { role: "user" }
    });

    const activeAssignments = await prisma.testAssignment.count({
        where: {
            status: "in_progress"
        }
    });

    // 3. Completed Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedToday = await prisma.testAssignment.count({
        where: {
            status: "completed",
            completedAt: {
                gte: today
            }
        }
    });

    // 4. Score Distribution (Basic Implementation: count ranges of scores)
    const completedAssignmentsWithScores = await prisma.candidate.findMany({
        where: {
            score: { not: null }
        },
        select: {
            score: true
        }
    });

    let scoreRanges = {
        "0-20": 0,
        "21-40": 0,
        "41-60": 0,
        "61-80": 0,
        "81-100": 0
    };

    let totalScore = 0;
    let scoredCount = 0;

    completedAssignmentsWithScores.forEach(c => {
        if (c.score !== null) {
            totalScore += c.score;
            scoredCount++;
            if (c.score <= 20) scoreRanges["0-20"]++;
            else if (c.score <= 40) scoreRanges["21-40"]++;
            else if (c.score <= 60) scoreRanges["41-60"]++;
            else if (c.score <= 80) scoreRanges["61-80"]++;
            else scoreRanges["81-100"]++;
        }
    });

    const averageScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;
    const maxRangeValue = Math.max(...Object.values(scoreRanges), 1); // Avoid division by zero

    const barData = Object.entries(scoreRanges).map(([range, value]) => ({
        range,
        value,
        height: `${(value / maxRangeValue) * 100}%`,
        highlight: value === Math.max(...Object.values(scoreRanges)) && value > 0
    }));

    // 5. Recent Activity (Mix of recent completions and violations)
    const recentViolations = await prisma.violation.findMany({
        take: 5,
        orderBy: { detectedAt: 'desc' },
        include: {
            assignment: {
                include: { candidate: true }
            }
        }
    });

    const recentCompletions = await prisma.testAssignment.findMany({
        where: { status: 'completed' },
        take: 5,
        orderBy: { completedAt: 'desc' },
        include: { candidate: true, test: true }
    });

    const activityFeed = [
        ...recentViolations.map(v => ({
            id: `v-${v.id}`,
            type: "alert",
            icon: "warning",
            iconBg: "bg-red-100 dark:bg-red-900/30 text-red-600",
            title: "Cheating Detected",
            description: `${v.assignment.candidate.name} triggered: ${v.type.replace('_', ' ')}.`,
            time: v.detectedAt,
            badge: "Flagged",
            badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
            action: "View Evidence"
        })),
        ...recentCompletions.map(c => ({
            id: `c-${c.id}`,
            type: "completed",
            icon: "check",
            iconBg: "bg-green-100 dark:bg-green-900/30 text-green-600",
            title: "Test Completed",
            description: `${c.candidate.name} finished "${c.test.name}".`,
            time: c.completedAt!,
            badge: "Finished",
            badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
        }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6).map(item => {
        // Simple time formatting relative to now
        const diffMs = new Date().getTime() - new Date(item.time).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const timeStr = diffMins < 60 ? `${diffMins}m ago` : diffMins < 1440 ? `${Math.floor(diffMins / 60)}h ago` : `${Math.floor(diffMins / 1440)}d ago`;

        return {
            ...item,
            time: timeStr
        };
    });

    // 6. Upcoming Sessions
    const upcomingSessions = await prisma.testAssignment.findMany({
        where: { status: 'assigned' },
        take: 5,
        orderBy: { assignedAt: 'desc' },
        include: { candidate: true, test: true }
    });

    // Note: The original hardcoded upcoming sessions groups by batch/test. 
    // We'll approximate this by just showing the latest individual assignments, or grouping them.
    // For simplicity, let's just show the raw assignments.

    const upcomingData = upcomingSessions.map(sess => ({
        id: sess.id,
        testName: sess.test.name,
        time: new Date(sess.assignedAt).toLocaleDateString() + ' ' + new Date(sess.assignedAt).toLocaleTimeString(),
        candidateName: sess.candidate.name,
        proctor: "Auto-Proctored" // Or related admin if we had that mapping
    }));

    const stats = {
        totalParticipants,
        activeAssignments,
        completedToday,
        averageScore
    };

    return <DashboardClient
        stats={stats}
        barData={barData}
        activityFeed={activityFeed}
        upcomingSessions={upcomingData}
    />;
}
