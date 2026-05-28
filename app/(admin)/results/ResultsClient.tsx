"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import DataTable, { ColumnDef } from "../components/DataTable";
import Breadcrumb from "../components/Breadcrumb";

interface ResultData {
    id: string; // The assignment ID
    candidateName: string;
    candidateId: string;
    testName: string;
    category: string;
    batch: string;
    completedAt: string;
    timeUsedSeconds: number;
    answeredCount: number;
    violations: number;
    autoSubmitted: boolean;
}

const categoryConfig: Record<string, { label: string; icon: string; color: string }> = {
    intelligence: { label: "Intelligence", icon: "psychology", color: "text-brand-teal bg-brand-sky/20 dark:bg-brand-sky/5" },
    personality: { label: "Personality", icon: "mood", color: "text-pink-600 bg-pink-50 dark:bg-pink-900/20" },
    aptitude: { label: "Aptitude", icon: "school", color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
    projective: { label: "Projective", icon: "draw", color: "text-teal-600 bg-teal-50 dark:bg-teal-900/20" },
};

export default function ResultsClient({ initialData }: { initialData: ResultData[] }) {
    const columns = useMemo<ColumnDef<ResultData>[]>(() => [
        {
            header: "Candidate",
            accessorKey: "candidateName",
            sortable: true,
            filterable: true,
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-[var(--shadow-sm)]">
                        {row.candidateName.charAt(0)}
                    </div>
                    <div>
                        <p className="font-semibold text-[var(--color-text-main)] group-hover:text-primary transition-colors cursor-pointer">{row.candidateName}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] font-mono mt-0.5">{row.candidateId}</p>
                    </div>
                </div>
            )
        },
        {
            header: "Test Details",
            accessorKey: "testName",
            sortable: true,
            filterable: true,
            cell: (row) => {
                const cat = categoryConfig[row.category] || categoryConfig.intelligence;
                return (
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-[var(--radius-xs)] ${cat.color} flex-shrink-0`}>
                            <span className="material-symbols-outlined text-[14px]">{cat.icon}</span>
                        </div>
                        <div className="min-w-0">
                            <span className="text-sm font-medium text-[var(--color-text-sub)] truncate">{row.testName}</span>
                            <div className="flex gap-1.5 items-center mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                                <span>Batch {row.batch}</span>
                                <span>•</span>
                                <span>{row.answeredCount} Answered</span>
                            </div>
                        </div>
                    </div>
                );
            }
        },
        {
            header: "Time Used",
            accessorKey: "timeUsedSeconds",
            sortable: true,
            filterable: false,
            cell: (row) => {
                const m = Math.floor(row.timeUsedSeconds / 60);
                const s = row.timeUsedSeconds % 60;
                return (
                    <span className="text-xs font-mono text-[var(--color-text-sub)] bg-[var(--color-bg-elevated)] px-2 py-1 rounded-[var(--radius-xs)]">
                        {m}m {s}s
                    </span>
                );
            }
        },
        {
            header: "Flags",
            accessorKey: "violations",
            sortable: true,
            filterable: false,
            cell: (row) => (
                <div className="flex flex-col items-start gap-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${row.violations > 0 ? "bg-[var(--color-danger-light)] text-[var(--color-danger)]" : "bg-[var(--color-success-light)] text-[var(--color-success)]"}`}>
                        {row.violations} Violations
                    </span>
                    {row.autoSubmitted && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-[var(--color-warning-light)] text-[var(--color-warning)]">
                            Auto-Submitted
                        </span>
                    )}
                </div>
            )
        },
        {
            header: "Date Completed",
            accessorKey: "completedAt",
            sortable: true,
            filterable: false,
            cell: (row) => (
                <span className="text-sm text-[var(--color-text-sub)]">
                    {new Date(row.completedAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
            )
        },
        {
            header: "Actions",
            sortable: false,
            filterable: false,
            className: "text-right w-24",
            cell: (row) => (
                <Link href={`/admin/results/${row.id}`} className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold bg-gradient-to-br from-primary to-accent text-white hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] transition-all inline-block shadow-[0_4px_15px_var(--color-primary-glow)] btn-press">
                    View Details
                </Link>
            )
        }
    ], []);

    return (
        <div className="space-y-6 animate-slide-in-up">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">
                            Test Results
                        </h1>
                        <p className="text-sm text-[var(--color-text-sub)] mt-1 font-medium">
                            View detailed test scores, answers, and behavior logs for each candidate.
                        </p>
                    </div>
                    <Breadcrumb />
                </div>
            </div>

            {/* Table */}
            <div className="min-h-[500px]">
                <DataTable data={initialData} columns={columns} globalSearchPlaceholder="Search candidates or tests..." />
            </div>
        </div>
    );
}
