"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DashboardStats {
    totalParticipants: number;
    activeAssignments: number;
    completedToday: number;
    averageScore: number;
}

interface BarData {
    range: string;
    value: number;
    height: string;
    highlight: boolean;
}

interface ActivityItem {
    id: string;
    type: string;
    icon: string;
    iconBg: string;
    title: string;
    description: string;
    time: string;
    badge: string;
    badgeClass: string;
    action?: string;
}

interface UpcomingSession {
    id: string;
    testName: string;
    time: string;
    candidateName: string;
    proctor: string;
}

interface DashboardClientProps {
    stats: DashboardStats;
    barData: BarData[];
    activityFeed: ActivityItem[];
    upcomingSessions: UpcomingSession[];
}

const statCards = [
    {
        key: "totalParticipants" as const,
        label: "Total Kandidat",
        icon: "group",
        change: "+5%",
        changeLabel: "dari bulan lalu",
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
        changeBg: "bg-[var(--color-primary-light)] text-primary",
        suffix: "",
    },
    {
        key: "completedToday" as const,
        label: "Selesai Hari Ini",
        icon: "task_alt",
        change: "+10%",
        changeLabel: "dari kemarin",
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        changeBg: "bg-[var(--color-primary-light)] text-primary",
        suffix: "",
    },
    {
        key: "activeAssignments" as const,
        label: "Ujian Aktif",
        icon: "play_circle",
        change: "+2%",
        changeLabel: "dari minggu lalu",
        iconBg: "bg-amber-100",
        iconColor: "text-amber-600",
        changeBg: "bg-[var(--color-primary-light)] text-primary",
        suffix: "",
    },
    {
        key: "averageScore" as const,
        label: "Rata-rata Nilai",
        icon: "analytics",
        change: "Sesuai Target",
        changeLabel: "performa keseluruhan",
        iconBg: "bg-purple-100",
        iconColor: "text-purple-600",
        changeBg: "bg-[var(--color-primary-light)] text-primary",
        suffix: "%",
    },
];

export default function DashboardClient({
    stats,
    barData,
    activityFeed,
}: DashboardClientProps) {
    const [timerSeconds, setTimerSeconds] = useState(5048);
    const [isTimerRunning, setIsTimerRunning] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isTimerRunning) {
            interval = setInterval(() => setTimerSeconds((p) => p + 1), 1000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [isTimerRunning]);

    const formatTimer = (s: number) =>
        [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
            .map((n) => n.toString().padStart(2, "0"))
            .join(":");

    return (
        <div className={`space-y-6 animate-slide-in-up transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">
                        Selamat Datang 👋
                    </h1>
                    <p className="text-[var(--color-text-muted)] text-sm mt-1 font-medium">
                        Berikut adalah ringkasan platform ujian Anda hari ini.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <Link
                        href="/exam/candidate"
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-[var(--radius-sm)] text-[13px] font-semibold text-white
                            bg-gradient-to-br from-primary to-accent shadow-[0_4px_15px_var(--color-primary-glow)] border-none
                            hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] active:translate-y-0
                            transition-all btn-shine btn-press cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Tambah Kandidat
                    </Link>
                    <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-[var(--radius-sm)] text-[13px] font-semibold
                        bg-[var(--color-primary-light)] text-primary border border-[var(--color-border-accent)]
                        hover:bg-[var(--color-bg-hover)] shadow-[var(--shadow-sm)] transition-all btn-press cursor-pointer">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-text-muted)]">upload_file</span>
                        Impor
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {statCards.map((card) => (
                    <div
                        key={card.key}
                        className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[20px] p-[22px]
                            shadow-[0_4px_20px_rgba(0,0,0,0.15)] relative overflow-hidden cursor-pointer group
                            transition-all duration-300 hover:translate-y-[-5px] hover:border-primary
                            hover:shadow-[0_12px_30px_rgba(0,0,0,0.3)]"
                    >
                        {/* Decorative corner */}
                        <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-[radial-gradient(circle_at_top_right,rgba(5,150,105,0.05),transparent)] pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[13px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.03em]">{card.label}</span>
                                <div className={`w-9 h-9 rounded-[10px] ${card.iconBg} flex items-center justify-center`}>
                                    <span className={`material-symbols-outlined ${card.iconColor} text-[16px]`}
                                        style={{ fontVariationSettings: "'FILL' 1" }}>
                                        {card.icon}
                                    </span>
                                </div>
                            </div>
                            <div className="text-[26px] font-[800] tracking-[-0.04em] text-[var(--color-text-main)]">
                                {stats[card.key]}{card.suffix}
                            </div>
                            <div className="mt-3 flex items-center gap-1.5 text-[11px]">
                                <span className={`px-1.5 py-0.5 rounded-md font-bold ${card.changeBg}`}>{card.change}</span>
                                <span className="text-[var(--color-text-muted)]">{card.changeLabel}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Left 2/3 */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Score Distribution Chart */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)]">
                        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-hover)]">
                            <div>
                                <h3 className="text-[15px] font-bold text-[var(--color-text-main)] tracking-[-0.02em]">Score Distribution</h3>
                                <p className="text-[var(--color-text-muted)] text-[11px] mt-0.5">Candidate performance overview</p>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-xs)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]
                                text-[var(--color-text-sub)] text-[11px] font-semibold">
                                <span className="material-symbols-outlined text-[13px]">calendar_month</span>
                                Last 30 Days
                            </div>
                        </div>

                        <div className="p-5">
                            <div className="relative h-52 w-full flex items-end gap-4 px-2">
                                {/* Gridlines */}
                                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 z-0">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="w-full border-t border-[var(--color-border)]" />
                                    ))}
                                </div>
                                {barData.map((bar) => (
                                    <div key={bar.range} className="flex flex-col items-center flex-1 h-full justify-end z-10 group cursor-pointer">
                                        <div
                                            className="relative w-full max-w-[50px] rounded-[var(--radius-sm)] transition-all duration-300 hover:scale-105"
                                            style={{
                                                height: bar.height,
                                                background: bar.highlight
                                                    ? "linear-gradient(to top, var(--color-primary), var(--color-primary-hover))"
                                                    : "linear-gradient(to top, var(--color-primary-light), var(--color-primary-mid))",
                                                border: bar.highlight ? "none" : "1px solid var(--color-primary-mid)",
                                                boxShadow: bar.highlight ? "0 -4px 20px var(--color-primary-glow)" : "none",
                                            }}
                                        >
                                            <div className="opacity-0 group-hover:opacity-100 absolute -top-9 left-1/2 -translate-x-1/2
                                                bg-[var(--color-bg-elevated)] text-[var(--color-text-main)] text-[11px] font-bold rounded-[var(--radius-xs)] px-2.5 py-1
                                                transition-opacity whitespace-nowrap shadow-[var(--shadow-lg)] border border-[var(--color-border)] z-30">
                                                {bar.value} people
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-medium text-[var(--color-text-muted)] mt-2.5">{bar.range}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Activity Feed */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)]">
                        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-hover)]">
                            <div>
                                <h3 className="text-[15px] font-bold text-[var(--color-text-main)] tracking-[-0.02em]">Recent Activity</h3>
                                <p className="text-[var(--color-text-muted)] text-[11px] mt-0.5">Latest events across the platform</p>
                            </div>
                             <Link href="/admin/activity"
                                className="text-[11px] font-semibold text-primary hover:text-primary-hover flex items-center gap-0.5 transition-colors">
                                View all
                                <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                            </Link>
                        </div>
                        <div>
                            {activityFeed.length === 0 ? (
                                <div className="flex flex-col items-center py-10 text-[var(--color-text-muted)]">
                                    <span className="material-symbols-outlined text-4xl mb-2">history</span>
                                    <p className="text-[12px] font-medium">No recent activity</p>
                                </div>
                            ) : (
                                activityFeed.map((item) => {
                                    const isAlert = item.type === "alert";
                                    return (
                                        <div key={item.id}
                                            className="flex items-center gap-3.5 px-5 py-3.5 border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer group">
                                            <div className={`size-8 rounded-[var(--radius-xs)] flex items-center justify-center flex-shrink-0
                                                ${isAlert ? "bg-[var(--color-danger-light)]" : "bg-[var(--color-success-light)]"}`}>
                                                <span
                                                    className={`material-symbols-outlined text-[16px] ${isAlert ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"}`}
                                                    style={{ fontVariationSettings: "'FILL' 1" }}>
                                                    {item.icon}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[13px] font-bold text-[var(--color-text-main)]">{item.title}</p>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md
                                                        ${isAlert
                                                            ? "bg-[var(--color-danger-light)] text-[var(--color-danger)] border border-[var(--color-danger)]/20"
                                                            : "bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success)]/20"}`}>
                                                        {item.badge}
                                                    </span>
                                                </div>
                                                <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5 truncate">{item.description}</p>
                                            </div>
                                            <span className="text-[var(--color-text-muted)] text-[10px] flex-shrink-0">{item.time}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Right 1/3 */}
                <div className="space-y-5">

                    {/* Progress Gauge */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)]">
                        <div className="px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-hover)]">
                            <h3 className="text-[15px] font-bold text-[var(--color-text-main)] tracking-[-0.02em]">Exam Progress</h3>
                        </div>
                        <div className="p-5">
                            <div className="flex flex-col items-center py-2">
                                <div className="relative size-36">
                                    <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="40"
                                            stroke="var(--color-border)"
                                            strokeWidth="8" fill="transparent" />
                                        <circle cx="50" cy="50" r="40"
                                            stroke="url(#brandGrad)"
                                            strokeWidth="8" fill="transparent"
                                            strokeDasharray="155 251.2"
                                            strokeLinecap="round" />
                                        <defs>
                                            <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="var(--color-primary)" />
                                                <stop offset="100%" stopColor="var(--color-accent)" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-[var(--color-text-main)]">62%</span>
                                        <span className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider">Passed</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
                                 {[
                                    { label: "Passed", color: "bg-primary", val: "62%" },
                                    { label: "Active", color: "bg-[var(--color-warning)]", val: "28%" },
                                    { label: "Failed", color: "bg-[var(--color-danger)]", val: "10%" },
                                ].map(item => (
                                    <div key={item.label} className="flex flex-col items-center gap-1">
                                        <span className={`size-2 rounded-full ${item.color}`} />
                                        <span className="text-[var(--color-text-main)] font-bold text-[12px]">{item.val}</span>
                                        <span className="text-[var(--color-text-muted)] text-[10px] font-medium">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Active Tests */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)]">
                        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-hover)]">
                            <h3 className="text-[15px] font-bold text-[var(--color-text-main)] tracking-[-0.02em]">Active Tests</h3>
                            <Link href="/admin/tests"
                                className="size-7 rounded-[var(--radius-xs)] bg-[var(--color-primary-light)] border border-[var(--color-border-accent)] flex items-center justify-center
                                    text-primary hover:bg-primary/20 transition-colors cursor-pointer">
                                <span className="material-symbols-outlined text-[14px]">add</span>
                            </Link>
                        </div>
                        <div className="p-5">
                            <div className="space-y-0">
                                {[
                                    { name: "Cognitive Abilities", due: "Nov 26", color: "bg-[var(--color-primary-light)] text-primary border-[var(--color-border-accent)]", icon: "psychology" },
                                    { name: "English Proficiency", due: "Nov 28", color: "bg-[var(--color-accent-light)] text-[var(--color-accent)] border-[var(--color-border)]", icon: "translate" },
                                    { name: "Programming Quiz", due: "Nov 30", color: "bg-[var(--color-warning-light)] text-[var(--color-warning)] border-[var(--color-border)]", icon: "code" },
                                    { name: "Personality Assessment", due: "Dec 5", color: "bg-[var(--color-danger-light)] text-[var(--color-danger)] border-[var(--color-border)]", icon: "psychology_alt" },
                                ].map((test, i) => (
                                    <div key={i} className="flex items-center gap-3 py-3 border-b border-[var(--color-border)] last:border-b-0 group cursor-pointer
                                        hover:bg-[var(--color-bg-hover)] transition-colors -mx-5 px-5">
                                        <div className={`size-8 rounded-[var(--radius-xs)] flex items-center justify-center flex-shrink-0 border ${test.color}`}>
                                            <span className="material-symbols-outlined text-[14px]"
                                                style={{ fontVariationSettings: "'FILL' 1" }}>{test.icon}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[var(--color-text-sub)] text-[12px] font-semibold truncate group-hover:text-primary transition-colors">
                                                {test.name}
                                            </p>
                                            <p className="text-[var(--color-text-muted)] text-[10px] font-medium">Due: {test.due}</p>
                                        </div>
                                        <span className="material-symbols-outlined text-[14px] text-[var(--color-text-muted)] group-hover:text-primary transition-colors">
                                            chevron_right
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Session Timer */}
                    <div className="rounded-[var(--radius-md)] p-6 relative overflow-hidden shadow-[var(--shadow-lg)] border border-[var(--color-border-strong)]"
                        style={{ background: "linear-gradient(135deg, var(--color-brand-navy) 0%, var(--color-accent) 50%, var(--color-primary) 100%)" }}
                    >
                        {/* Decorative circles */}
                        <div className="absolute -top-6 -right-6 size-32 bg-white/[0.06] rounded-full pointer-events-none" />
                        <div className="absolute bottom-0 right-0 size-20 bg-white/[0.04] rounded-full pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-white/70 uppercase tracking-[0.15em]">Session Timer</span>
                                <div className={`size-2 rounded-full ${isTimerRunning ? "bg-[var(--color-success)]" : "bg-white/30"}`}
                                    style={isTimerRunning ? { boxShadow: "0 0 6px var(--color-success-glow)" } : {}} />
                            </div>
                            <div className="text-4xl font-black font-mono text-[var(--color-text-inverse)] tracking-tight tabular-nums">
                                {formatTimer(timerSeconds)}
                            </div>
                            <p className="text-white/60 text-[11px] mt-1 font-medium">Active since session start</p>
                            <div className="flex items-center gap-2 mt-5">
                                <button
                                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                                    className="size-9 rounded-[var(--radius-sm)] bg-white text-primary flex items-center justify-center
                                        shadow-[var(--shadow-md)] hover:bg-[var(--color-primary-light)] transition-all cursor-pointer hover:scale-105 btn-press"
                                >
                                    <span className="material-symbols-outlined text-[18px]"
                                        style={{ fontVariationSettings: "'FILL' 1" }}>
                                        {isTimerRunning ? "pause" : "play_arrow"}
                                    </span>
                                </button>
                                <button
                                    onClick={() => { setTimerSeconds(0); setIsTimerRunning(false); }}
                                    className="size-9 rounded-[var(--radius-sm)] bg-white/15 border border-white/20 text-white flex items-center justify-center
                                        hover:bg-white/25 transition-all cursor-pointer hover:scale-105 btn-press"
                                >
                                    <span className="material-symbols-outlined text-[18px]"
                                        style={{ fontVariationSettings: "'FILL' 1" }}>stop</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Reminder Card */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)]">
                        <div className="p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="size-6 rounded-[var(--radius-xs)] bg-[var(--color-primary-light)] border border-[var(--color-border-accent)] flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-[13px]"
                                        style={{ fontVariationSettings: "'FILL' 1" }}>event</span>
                                </div>
                                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Reminder</span>
                            </div>
                            <h4 className="text-[var(--color-text-main)] text-[13px] font-semibold mt-2 leading-snug">
                                System Review with Technical Leads
                            </h4>
                            <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">02:00 pm — 04:00 pm today</p>
                            <button className="mt-4 w-full py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white text-[12px] font-semibold
                                flex items-center justify-center gap-1.5 transition-all shadow-[0_4px_15px_var(--color-primary-glow)]
                                hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] active:translate-y-0
                                btn-shine btn-press cursor-pointer">
                                <span className="material-symbols-outlined text-[15px]"
                                    style={{ fontVariationSettings: "'FILL' 1" }}>videocam</span>
                                Join Meeting
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
