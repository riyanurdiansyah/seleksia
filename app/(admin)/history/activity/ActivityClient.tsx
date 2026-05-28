"use client";

import { useState } from "react";
import DataTable, { ColumnDef } from "../../components/DataTable";
import Breadcrumb from "../../components/Breadcrumb";

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
}

export default function ActivityClient({ initialData }: { initialData: ActivityItem[] }) {
    const [filterType, setFilterType] = useState<string>("all");

    // Filter logic
    const filteredData = initialData.filter((item) => {
        if (filterType === "all") return true;
        return item.type === filterType;
    });

    // We can use the custom DataTable to display these
    const columns: ColumnDef<ActivityItem>[] = [
        {
            header: "Activity",
            accessorKey: "title",
            sortable: true,
            filterable: true,
            cell: (row) => (
                <div className="flex items-center gap-4">
                    <div className={`size-10 rounded-full flex items-center justify-center flex-shrink-0 ${row.iconBg}`}>
                        <span className="material-symbols-outlined text-[20px]">{row.icon}</span>
                    </div>
                    <div>
                        <p className="font-semibold text-[var(--color-text-main)]">{row.title}</p>
                        <p className="text-xs text-[var(--color-text-sub)] mt-0.5">{row.description}</p>
                    </div>
                </div>
            )
        },
        {
            header: "Target/Test",
            accessorKey: "targetName",
            sortable: true,
            filterable: true,
            cell: (row) => (
                <span className="text-sm text-[var(--color-text-sub)] font-medium">
                    {row.targetName}
                </span>
            )
        },
        {
            header: "Candidate ID",
            accessorKey: "candidateId",
            sortable: true,
            filterable: true,
            cell: (row) => (
                <span className="text-xs font-mono text-[var(--color-text-sub)] bg-[var(--color-bg-elevated)] px-2 py-1 rounded-[var(--radius-xs)]">
                    {row.candidateId}
                </span>
            )
        },
        {
            header: "Status",
            accessorKey: "badge",
            sortable: true,
            filterable: true,
            cell: (row) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${row.badgeClass}`}>
                    {row.badge}
                </span>
            )
        },
        {
            header: "Time",
            accessorKey: "rawTime",
            sortable: true,
            filterable: false,
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-[var(--color-text-main)]">
                        {row.relativeTime}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                        {new Date(row.rawTime).toLocaleDateString()} {new Date(row.rawTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            )
        }
    ];

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
                            Monitor system events, completed tests, and flagged activities.
                        </p>
                    </div>
                    <Breadcrumb />
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-4 flex items-center justify-end">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Filter Type:</span>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-sub)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] cursor-pointer transition-all duration-300"
                    >
                        <option value="all">All Activity</option>
                        <option value="violation">Violations (Flagged)</option>
                        <option value="completed">Completed Tests</option>
                        <option value="started">Started Tests</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="min-h-[500px]">
                <DataTable data={filteredData} columns={columns} globalSearchPlaceholder="Search activity description, ID, or test name..." />
            </div>
        </div>
    );
}
