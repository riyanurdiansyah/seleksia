"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
    "/dashboard": { title: "Dashboard", subtitle: "Welcome back! Here's what's happening today." },
    "/candidate": { title: "Candidates", subtitle: "Manage and monitor all registered candidates." },
    "/exam": { title: "Exam Management", subtitle: "Akses menu pengelolaan exam." },
    "/exam/question": { title: "Exam Tests", subtitle: "Configure and manage assessment tests." },
    "/exam/assignment": { title: "Assignments", subtitle: "Track and manage test assignments." },
    "/exam/instruction": { title: "Instructions", subtitle: "Manage exam instructions and guidelines." },
    "/exam/monitoring": { title: "Monitoring", subtitle: "Real-time exam session monitoring." },
    "/history/activity": { title: "Activity Log", subtitle: "View system-wide activity history." },
    "/report": { title: "Reports", subtitle: "Analyze and export candidate results." },
    "/whatsapp": { title: "WhatsApp Blast", subtitle: "Send bulk notifications to candidates." },
    "/master/user": { title: "User Management", subtitle: "Manage system users." },
    "/master/roles": { title: "Role Management", subtitle: "Configure role settings." },
    "/master/rbac": { title: "Role Access Matrix", subtitle: "Manage detailed menu permissions." },
    "/master/menu": { title: "Menu Management", subtitle: "Manage system navigation menus and submenus." },
    "/settings": { title: "Settings", subtitle: "Configure your admin preferences." },
};

export default function AdminHeader() {
    const pathname = usePathname();
    const [notifOpen, setNotifOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    const pageInfo = pageTitles[pathname] || pageTitles["/dashboard"];

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const mockNotifications = [
        { id: 1, icon: "warning", iconClass: "text-amber-500", bg: "bg-amber-50", title: "Cheating Detected", desc: "Reza triggered tab-switch violation", time: "2m ago" },
        { id: 2, icon: "check_circle", iconClass: "text-emerald-500", bg: "bg-emerald-50", title: "Test Completed", desc: "Siti Rahayu finished Cognitive Test", time: "5m ago" },
        { id: 3, icon: "person_add", iconClass: "text-blue-500", bg: "bg-blue-50", title: "New Candidate", desc: "3 new candidates registered", time: "10m ago" },
    ];

    return (
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 z-100
            bg-[rgba(255,255,255,0.7)] backdrop-blur-[12px] border-b border-[var(--color-border)] sticky top-0">

            {/* Left: Page Title */}
            <div className="flex flex-col justify-center">
                <h2 className="text-[var(--color-text-main)] text-[15px] font-semibold leading-tight tracking-tight">
                    {pageInfo.title}
                </h2>
                <p className="text-[var(--color-text-muted)] text-[11px] font-medium mt-0.5 hidden md:block">
                    {pageInfo.subtitle}
                </p>
            </div>

            {/* Center: Search */}
            <div className="hidden md:flex flex-1 max-w-sm mx-8">
                <div className={`relative w-full transition-all duration-300 ${searchFocused ? "translate-y-[-1px]" : ""}`}>
                    <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-[18px] text-[var(--color-text-muted)]">search</span>
                    </span>
                    <input
                        className="w-full h-10 pl-10 pr-14 rounded-full text-[13px] text-[var(--color-text-main)]
                            placeholder-[var(--color-text-muted)] outline-none transition-all duration-300
                            bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-5 py-2.5
                            focus:bg-[var(--color-bg-card)] focus:border-primary
                            focus:shadow-[0_8px_30px_rgba(0,0,0,0.15),0_0_0_4px_var(--color-primary-light)]
                            focus:translate-y-[-1px]"
                        placeholder="Search candidates, tests, IDs..."
                        type="text"
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                    />
                    <kbd className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5
                        bg-[var(--color-bg-hover)] border border-[var(--color-border)] rounded text-[10px] font-bold text-[var(--color-text-muted)] pointer-events-none">
                        ⌘F
                    </kbd>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5">
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setNotifOpen(!notifOpen)}
                        className="rounded-[var(--radius-sm)] p-2 flex items-center justify-center
                            text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-main)]
                            transition-all relative cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[20px]">notifications</span>
                        <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full border border-white" />
                    </button>

                    {notifOpen && (
                        <div className="absolute right-0 top-12 w-80 rounded-[var(--radius-md)] z-50
                            bg-[var(--color-bg-card)] border border-[var(--color-border-strong)]
                            shadow-[0_10px_30px_rgba(0,0,0,0.4)] overflow-hidden">
                            <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-elevated)]">
                                <span className="text-[var(--color-text-main)] text-[13px] font-semibold">Notifications</span>
                                <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded">3 new</span>
                            </div>
                            <div className="py-1">
                                {mockNotifications.map(n => (
                                    <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors">
                                        <div className={`size-8 rounded-xl ${n.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                            <span className={`material-symbols-outlined text-[16px] ${n.iconClass}`}
                                                style={{ fontVariationSettings: "'FILL' 1" }}>{n.icon}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[var(--color-text-main)] text-[12px] font-semibold">{n.title}</p>
                                            <p className="text-[var(--color-text-muted)] text-[11px] mt-0.5 truncate">{n.desc}</p>
                                        </div>
                                        <span className="text-[var(--color-text-muted)] text-[10px] flex-shrink-0 mt-0.5">{n.time}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="px-4 py-3 border-t border-[var(--color-border)]">
                                <button className="w-full text-center text-[11px] font-bold text-primary hover:text-primary-hover cursor-pointer transition-colors">
                                    View all notifications →
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="w-px h-6 bg-[var(--color-border)] mx-1" />

                {/* Profile */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => setProfileOpen(!profileOpen)}
                        className="flex items-center gap-2.5 pl-1 pr-2.5 py-1.5 rounded-xl
                            hover:bg-[var(--color-bg-hover)] transition-all cursor-pointer"
                    >
                        {/* Avatar */}
                        <div className="size-8 rounded-full flex items-center justify-center font-bold text-[13px] text-white
                            bg-gradient-to-br from-primary to-accent shadow-[var(--shadow-sm)]
                            hover:scale-105 hover:shadow-[0_4px_12px_var(--color-primary-glow)] transition-all">
                            A
                        </div>
                        <div className="hidden md:flex flex-col items-start">
                            <span className="text-[var(--color-text-main)] text-[12px] font-semibold leading-tight">Admin User</span>
                            <span className="text-[var(--color-text-muted)] text-[10px]">Super Admin</span>
                        </div>
                        <span className="material-symbols-outlined text-[14px] text-[var(--color-text-muted)] hidden md:block">expand_more</span>
                    </button>

                    {profileOpen && (
                        <div className="absolute right-0 top-12 w-52 rounded-[var(--radius-md)] z-50
                            bg-[var(--color-bg-card)] border border-[var(--color-border-strong)]
                            shadow-[0_10px_30px_rgba(0,0,0,0.4)] overflow-hidden">
                            <div className="px-4 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
                                <p className="text-[var(--color-text-main)] text-[13px] font-semibold">Admin User</p>
                                <p className="text-[var(--color-text-muted)] text-[11px]">admin@psikoest.com</p>
                            </div>
                            <div className="py-1">
                                {[
                                    { icon: "person", label: "My Profile" },
                                    { icon: "settings", label: "Settings" },
                                ].map(item => (
                                    <button key={item.label}
                                        className="w-full flex items-center gap-3 px-4 py-2.5
                                            hover:bg-[var(--color-bg-hover)] text-[var(--color-text-sub)]
                                            hover:text-[var(--color-text-main)] transition-colors cursor-pointer">
                                        <span className="material-symbols-outlined text-[16px] text-[var(--color-text-muted)]">{item.icon}</span>
                                        <span className="text-[12px] font-medium">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="border-t border-[var(--color-border)] py-1">
                                <button
                                    onClick={() => { sessionStorage.clear(); window.location.href = "/"; }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5
                                        text-danger hover:bg-[var(--color-danger-light)]
                                        transition-colors cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[16px]">logout</span>
                                    <span className="text-[12px] font-medium">Sign Out</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
