"use client";

import { useState, useMemo } from "react";
import Breadcrumb from "../../components/Breadcrumb";
import Select2 from "../../components/Select2";

interface ActivityItem {
    id: string;
    type: string;
    icon: string;
    iconBg: string;
    title: string;
    description: string;
    badge: string;
    badgeClass: string;
    targetName: string;
    candidateId: string;
    relativeTime: string;
    rawTime: string;
    assignmentId: string;
    sessionId: string;
}

interface GroupedActivity {
    groupKey: string;
    sessionId: string;
    assignmentId: string;
    candidateId: string;
    targetName: string;
    title: string;
    description: string;
    icon: string;
    iconBg: string;
    badge: string;
    badgeClass: string;
    relativeTime: string;
    rawTime: string;
    type: string;
    items: ActivityItem[];
}

export default function ActivityClient({ initialData }: { initialData: ActivityItem[] }) {
    const [filterType, setFilterType] = useState<string>("all");
    const [globalSearch, setGlobalSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleRow = (groupKey: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(groupKey)) {
                next.delete(groupKey);
            } else {
                next.add(groupKey);
            }
            return next;
        });
    };

    // 1. Filter, Search & Group data
    const groupedData = useMemo(() => {
        // Step A: Filter by type
        let filtered = initialData;
        if (filterType !== "all") {
            filtered = initialData.filter((item) => item.type === filterType);
        }

        // Step B: Filter by search query
        if (globalSearch.trim() !== "") {
            const query = globalSearch.toLowerCase();
            filtered = filtered.filter((item) => {
                return (
                    item.title.toLowerCase().includes(query) ||
                    item.description.toLowerCase().includes(query) ||
                    item.targetName.toLowerCase().includes(query) ||
                    item.candidateId.toLowerCase().includes(query)
                );
            });
        }

        // Step C: Group by sessionId and assignmentId
        const groups: Record<string, GroupedActivity> = {};

        filtered.forEach((item) => {
            const groupKey = `${item.assignmentId}_${item.sessionId}`;
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    groupKey,
                    sessionId: item.sessionId,
                    assignmentId: item.assignmentId,
                    candidateId: item.candidateId,
                    targetName: item.targetName,
                    title: item.title,
                    description: item.description,
                    icon: item.icon,
                    iconBg: item.iconBg,
                    badge: item.badge,
                    badgeClass: item.badgeClass,
                    relativeTime: item.relativeTime,
                    rawTime: item.rawTime,
                    type: item.type,
                    items: [],
                };
            }
            groups[groupKey].items.push(item);
        });

        // Step D: Map and sort the groups
        return Object.values(groups).map((group) => {
            // Sort inner items by time descending
            group.items.sort((a, b) => new Date(b.rawTime).getTime() - new Date(a.rawTime).getTime());
            const latest = group.items[0];

            return {
                ...group,
                title: latest.title,
                description: group.items.length > 1
                    ? `${group.items.length} aktivitas terekam. Aktivitas terakhir: ${latest.title}`
                    : latest.description,
                icon: latest.icon,
                iconBg: latest.iconBg,
                badge: group.items.length > 1 ? `${group.items.length} Events` : latest.badge,
                badgeClass: group.items.length > 1
                    ? "bg-brand-navy/15 dark:bg-brand-navy/35 text-brand-navy dark:text-brand-sky font-bold"
                    : latest.badgeClass,
                relativeTime: latest.relativeTime,
                rawTime: latest.rawTime,
                type: latest.type,
            };
        }).sort((a, b) => new Date(b.rawTime).getTime() - new Date(a.rawTime).getTime());

    }, [initialData, filterType, globalSearch]);

    // 2. Pagination
    const totalPages = Math.ceil(groupedData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return groupedData.slice(start, start + itemsPerPage);
    }, [groupedData, currentPage, itemsPerPage]);

    return (
        <div className="space-y-6 animate-slide-in-up">
            {/* Page Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">
                            Activity Log
                        </h1>
                        <p className="text-sm text-[var(--color-text-sub)] mt-1 font-medium">
                            Pantau riwayat pengerjaan ujian, pelanggaran anti-cheat, dan aktivitas ujian terkelompok per sesi.
                        </p>
                    </div>
                    <Breadcrumb />
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:max-w-md">
                    <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-[20px] text-[var(--color-text-muted)]">search</span>
                    </span>
                    <input
                        type="text"
                        className="w-full h-10 pl-10 pr-4 rounded-full text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] outline-none bg-[var(--color-bg-elevated)] border border-[var(--color-border)] focus:border-primary focus:bg-[var(--color-bg-base)] transition-all font-medium"
                        placeholder="Cari berdasarkan kandidat, ujian, atau deskripsi..."
                        value={globalSearch}
                        onChange={(e) => {
                            setGlobalSearch(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] whitespace-nowrap">Filter Tipe:</span>
                    <Select2
                        value={filterType}
                        onChange={(val) => {
                            setFilterType(val);
                            setCurrentPage(1);
                        }}
                        options={[
                            { value: "all", label: "Semua Aktivitas" },
                            { value: "violation", label: "Pelanggaran (Flagged)" },
                            { value: "completed", label: "Ujian Selesai" },
                            { value: "started", label: "Ujian Dimulai" }
                        ]}
                        className="w-48 text-left"
                    />
                </div>
            </div>

            {/* Grouped Table */}
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#E6F4EA] text-[#1B835E] uppercase tracking-wide border-b border-[#1C835F]/20">
                            <tr>
                                <th className="px-5 py-3.5 text-[10px] font-bold w-10"></th>
                                <th className="px-5 py-3.5 text-[10px] font-bold">Aktivitas Terakhir</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold">Ujian</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold">ID Peserta</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold">Status</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-right">Waktu Terbaru</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <span className="material-symbols-outlined text-5xl text-gray-300">search_off</span>
                                            <p className="text-sm font-medium">Tidak ada riwayat aktivitas ditemukan.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((row) => {
                                    const isExpanded = expandedRows.has(row.groupKey);
                                    return (
                                        <>
                                            {/* Parent Row */}
                                            <tr
                                                key={row.groupKey}
                                                onClick={() => toggleRow(row.groupKey)}
                                                className={`border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-gray-800 dark:text-gray-200 ${
                                                    isExpanded ? "bg-slate-50/40 dark:bg-slate-800/20" : ""
                                                }`}
                                            >
                                                <td className="px-5 py-4 text-center">
                                                    <span className={`material-symbols-outlined text-[18px] text-[var(--color-text-muted)] transition-transform duration-200 block ${
                                                        isExpanded ? "rotate-180" : ""
                                                    }`}>
                                                        keyboard_arrow_down
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3.5">
                                                        <div className={`size-9 rounded-full flex items-center justify-center flex-shrink-0 ${row.iconBg}`}>
                                                            <span className="material-symbols-outlined text-[18px]">{row.icon}</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-[var(--color-text-main)]">{row.title}</p>
                                                            <p className="text-xs text-[var(--color-text-sub)] mt-0.5 line-clamp-1 max-w-[320px]">{row.description}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-xs font-semibold text-[var(--color-text-sub)]">{row.targetName}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-[10px] font-mono text-[var(--color-text-sub)] bg-[var(--color-bg-elevated)] px-2 py-1 rounded border border-[var(--color-border)]">
                                                        {row.candidateId}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${row.badgeClass}`}>
                                                        {row.badge}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs font-bold text-[var(--color-text-main)]">{row.relativeTime}</span>
                                                        <span className="text-[9px] text-[var(--color-text-muted)] mt-0.5 font-medium">
                                                            {new Date(row.rawTime).toLocaleDateString()} {new Date(row.rawTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Collapsible Child Details Row */}
                                            {isExpanded && (
                                                <tr key={`${row.groupKey}-child`}>
                                                    <td colSpan={6} className="bg-slate-50/40 dark:bg-slate-800/10 px-8 py-5 border-b border-gray-100 dark:border-slate-800">
                                                        <div className="pl-6 border-l-2 border-[#1B835E]/40 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-text-muted)]">
                                                                    Rincian Sesi Aktivitas ({row.items.length} aktivitas)
                                                                </h4>
                                                                {row.sessionId !== "no-session" && (
                                                                    <span className="text-[10px] font-mono text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded">
                                                                        Session ID: {row.sessionId}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="space-y-2.5">
                                                                {row.items.map((subItem) => (
                                                                    <div key={subItem.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-sm gap-2">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={`size-8 rounded-full flex items-center justify-center flex-shrink-0 ${subItem.iconBg}`}>
                                                                                <span className="material-symbols-outlined text-[15px]">{subItem.icon}</span>
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-bold text-xs text-[var(--color-text-main)]">{subItem.title}</p>
                                                                                <p className="text-[11px] text-[var(--color-text-sub)] mt-0.5">{subItem.description}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center justify-between sm:justify-end gap-4 text-right">
                                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${subItem.badgeClass}`}>
                                                                                {subItem.badge}
                                                                            </span>
                                                                            <div className="text-[10px] text-[var(--color-text-muted)] font-medium">
                                                                                <p className="font-semibold text-[var(--color-text-sub)]">{subItem.relativeTime}</p>
                                                                                <p>{new Date(subItem.rawTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {groupedData.length > 0 && (
                    <div className="px-5 py-3 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 bg-transparent">
                        <div className="flex items-center gap-3">
                            <div>
                                {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, groupedData.length)} of {groupedData.length}
                            </div>
                            <div className="relative">
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-[#1B835E] hover:bg-gray-50 transition-all duration-200 cursor-pointer shadow-sm focus:outline-none"
                                >
                                    {[5, 15, 25, 50].map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt} per halaman
                                        </option>
                                    ))}
                                </select>
                                <span className="material-symbols-outlined text-[16px] text-[#1B835E] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none select-none">
                                    expand_more
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="size-7 rounded flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-500"
                            >
                                <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                    .map((p, idx, arr) => {
                                        const prev = arr[idx - 1];
                                        const showEllipsis = prev && p - prev > 1;
                                        return (
                                            <>
                                                {showEllipsis && <span className="px-1">...</span>}
                                                <button
                                                    key={p}
                                                    onClick={() => setCurrentPage(p)}
                                                    className={`size-7 rounded flex items-center justify-center font-medium transition-all ${
                                                        currentPage === p
                                                            ? "bg-[#33997A] text-white"
                                                            : "bg-transparent text-gray-600 hover:bg-gray-100"
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            </>
                                        );
                                    })}
                            </div>
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="size-7 rounded flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-500"
                            >
                                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
