"use client";

import { useState, useEffect, useCallback } from "react";
import ConfirmDialog from "../../components/ConfirmDialog";
import Breadcrumb from "../../components/Breadcrumb";

/* ===== Types ===== */
interface CandidateInfo {
    id: string;
    displayId: string;
    name: string;
    email: string;
    batch: string | null;
    role: string;
}

interface TestInfo {
    id: string;
    displayId: string;
    name: string;
    category: string;
    duration: number;
    status: string;
    questions: { id: string }[];
}

interface Assignment {
    id: string;
    candidateId: string;
    testId: string;
    status: "assigned" | "in_progress" | "completed" | "expired";
    sortOrder: number;
    assignedAt: string;
    startedAt: string | null;
    completedAt: string | null;
    candidate: CandidateInfo;
    test: TestInfo;
}

const categoryConfig: Record<string, { label: string; icon: string; color: string }> = {
    intelligence: { label: "Intelligence", icon: "psychology", color: "text-[var(--color-accent)] bg-[var(--color-accent-light)]" },
    personality: { label: "Personality", icon: "mood", color: "text-pink-600 bg-pink-50 dark:bg-pink-900/20" },
    aptitude: { label: "Aptitude", icon: "school", color: "text-[var(--color-warning)] bg-[var(--color-warning-light)]" },
    projective: { label: "Projective", icon: "draw", color: "text-teal-600 bg-teal-50 dark:bg-teal-900/20" },
};

const assignmentStatusConfig: Record<string, { label: string; bg: string; text: string; icon: string }> = {
    assigned: { label: "Assigned", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", icon: "assignment" },
    in_progress: { label: "In Progress", bg: "bg-[var(--color-warning-light)]", text: "text-[var(--color-warning)]", icon: "pending" },
    completed: { label: "Completed", bg: "bg-[var(--color-success-light)]", text: "text-[var(--color-success)]", icon: "task_alt" },
    expired: { label: "Expired", bg: "bg-[var(--color-bg-elevated)]", text: "text-[var(--color-text-muted)]", icon: "schedule" },
};

export default function AssignmentsClient() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [candidates, setCandidates] = useState<CandidateInfo[]>([]);
    const [tests, setTests] = useState<TestInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; candidateName: string; testName: string } | null>(null);

    // Assign form
    const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
    const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
    const [candidateSearch, setCandidateSearch] = useState("");
    const [testSearch, setTestSearch] = useState("");
    const [assigning, setAssigning] = useState(false);

    // Filters
    const [filterSearch, setFilterSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");

    /* Fetch all data */
    const fetchData = useCallback(async () => {
        try {
            const [aRes, cRes, tRes] = await Promise.all([
                fetch("/api/assignments"),
                fetch("/api/candidates"),
                fetch("/api/tests"),
            ]);
            if (aRes.ok) setAssignments(await aRes.json());
            if (cRes.ok) setCandidates(await cRes.json());
            if (tRes.ok) {
                const allTests = await tRes.json();
                // Only show published tests for assignment
                setTests(allTests.filter((t: TestInfo) => t.status === "published"));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* Filter assignments */
    const filtered = assignments.filter((a) => {
        const matchSearch =
            a.candidate.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
            a.candidate.displayId.toLowerCase().includes(filterSearch.toLowerCase()) ||
            a.test.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
            a.test.displayId.toLowerCase().includes(filterSearch.toLowerCase());
        const matchStatus = filterStatus === "all" || a.status === filterStatus;
        return matchSearch && matchStatus;
    });

    /* Group by candidate, sorted by sortOrder */
    const groupedByCandidate = filtered.reduce<Record<string, Assignment[]>>((acc, a) => {
        const key = a.candidate.id;
        if (!acc[key]) acc[key] = [];
        acc[key].push(a);
        return acc;
    }, {});

    // Sort each candidate's assignments by sortOrder
    Object.values(groupedByCandidate).forEach((arr) => {
        arr.sort((a, b) => a.sortOrder - b.sortOrder);
    });

    /* Assign tests to candidates */
    const handleAssign = async () => {
        if (selectedCandidates.size === 0 || selectedTests.size === 0) return;
        setAssigning(true);
        try {
            const res = await fetch("/api/assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    candidateIds: Array.from(selectedCandidates),
                    testIds: Array.from(selectedTests),
                }),
            });
            if (!res.ok) throw new Error("Failed");
            const newAssignments: Assignment[] = await res.json();
            setAssignments((prev) => {
                const existingIds = new Set(prev.map((a) => a.id));
                const fresh = newAssignments.filter((a) => !existingIds.has(a.id));
                return [...fresh, ...prev];
            });
            setSelectedCandidates(new Set());
            setSelectedTests(new Set());
            setShowAssignModal(false);
        } catch (err) {
            console.error(err);
        } finally {
            setAssigning(false);
        }
    };

    /* Delete assignment */
    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed");
            setAssignments((prev) => prev.filter((a) => a.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    /* Toggle selection helpers */
    const toggleCandidate = (id: string) => {
        setSelectedCandidates((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleTest = (id: string) => {
        setSelectedTests((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleAllCandidates = () => {
        const filteredCandidates = candidates.filter((c) => c.role === "user" && (c.name.toLowerCase().includes(candidateSearch.toLowerCase()) || c.displayId.toLowerCase().includes(candidateSearch.toLowerCase())));
        if (selectedCandidates.size === filteredCandidates.length) {
            setSelectedCandidates(new Set());
        } else {
            setSelectedCandidates(new Set(filteredCandidates.map((c) => c.id)));
        }
    };

    const toggleAllTests = () => {
        const filteredTests = tests.filter((t) => t.name.toLowerCase().includes(testSearch.toLowerCase()) || t.displayId.toLowerCase().includes(testSearch.toLowerCase()));
        if (selectedTests.size === filteredTests.length) {
            setSelectedTests(new Set());
        } else {
            setSelectedTests(new Set(filteredTests.map((t) => t.id)));
        }
    };

    /* Filtered lists for modal */
    const modalCandidates = candidates.filter((c) =>
        c.role === "user" &&
        (c.name.toLowerCase().includes(candidateSearch.toLowerCase()) ||
            c.displayId.toLowerCase().includes(candidateSearch.toLowerCase()))
    );

    const modalTests = tests.filter((t) =>
        t.name.toLowerCase().includes(testSearch.toLowerCase()) ||
        t.displayId.toLowerCase().includes(testSearch.toLowerCase())
    );

    return (
        <>
            {/* Page Header */}
            <div className="flex flex-col gap-4 animate-slide-in-up">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">Assignments</h1>
                        <p className="text-sm text-[var(--color-text-sub)] mt-1 font-medium">Assign psychotest batteries to candidates.</p>
                    </div>
                    <Breadcrumb />
                </div>
                <div className="flex justify-end">
                    <button onClick={() => { setSelectedCandidates(new Set()); setSelectedTests(new Set()); setCandidateSearch(""); setTestSearch(""); setShowAssignModal(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press">
                        <span className="material-symbols-outlined text-[18px]">assignment_add</span>
                        Assign Tests
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Assignments", count: assignments.length, icon: "assignment", color: "text-primary bg-[var(--color-primary-light)]" },
                    { label: "Assigned", count: assignments.filter((a) => a.status === "assigned").length, icon: "assignment", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
                    { label: "In Progress", count: assignments.filter((a) => a.status === "in_progress").length, icon: "pending", color: "text-[var(--color-warning)] bg-[var(--color-warning-light)]" },
                    { label: "Completed", count: assignments.filter((a) => a.status === "completed").length, icon: "task_alt", color: "text-[var(--color-success)] bg-[var(--color-success-light)]" },
                ].map((s) => (
                    <div key={s.label} className="bg-[var(--color-bg-card)] p-4 rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] flex items-center gap-3 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:translate-y-[-2px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
                        <div className={`p-2 rounded-[var(--radius-sm)] ${s.color}`}>
                            <span className="material-symbols-outlined">{s.icon}</span>
                        </div>
                        <div>
                            <p className="text-xs text-[var(--color-text-muted)]">{s.label}</p>
                            <p className="text-xl font-bold text-[var(--color-text-main)]">{s.count}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-4 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-text-muted)]">
                        <span className="material-symbols-outlined text-[20px]">search</span>
                    </span>
                    <input value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] focus:bg-[var(--color-bg-card)] transition-all duration-300" placeholder="Search candidates or tests..." />
                </div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-sub)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] cursor-pointer transition-all duration-300">
                    <option value="all">All Status</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="expired">Expired</option>
                </select>
            </div>

            {/* Assignments List - Grouped by Candidate */}
            {loading ? (
                <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-[var(--color-text-muted)] block animate-spin mb-2">progress_activity</span>
                    <p className="text-[var(--color-text-muted)]">Loading assignments...</p>
                </div>
            ) : Object.keys(groupedByCandidate).length === 0 ? (
                <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-[var(--color-text-muted)] block mb-2">assignment</span>
                    <p className="text-[var(--color-text-muted)] mb-1">No assignments found</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Click &quot;Assign Tests&quot; to get started.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(groupedByCandidate).map(([, candidateAssignments]) => {
                        const candidate = candidateAssignments[0].candidate;
                        return (
                            <div key={candidate.id} className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden relative transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:translate-y-[-2px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] hover:border-[var(--color-border-strong)]">
                                <div className="card-shimmer"></div>
                                {/* Candidate Header */}
                                <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-hover)]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm shadow-[var(--shadow-sm)]">
                                            {candidate.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-[var(--color-text-main)]">{candidate.name}</p>
                                                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{candidate.displayId}</span>
                                            </div>
                                            <p className="text-xs text-[var(--color-text-muted)]">
                                                {candidate.email}
                                                {candidate.batch && <span> • Batch {candidate.batch}</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium text-[var(--color-text-muted)]">{candidateAssignments.length} test{candidateAssignments.length > 1 ? "s" : ""}</span>
                                </div>

                                {/* Test assignments */}
                                <div className="divide-y divide-[var(--color-border)]">
                                    {candidateAssignments.map((a, idx) => {
                                        const cat = categoryConfig[a.test.category] || categoryConfig.intelligence;
                                        const st = assignmentStatusConfig[a.status];
                                        return (
                                            <div key={a.id} className="px-5 py-3 flex items-center justify-between hover:bg-[var(--color-bg-hover)] transition-colors">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    {/* Order number badge */}
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${a.status === "completed"
                                                            ? "bg-[var(--color-success-light)] text-[var(--color-success)]"
                                                            : a.status === "in_progress"
                                                                ? "bg-[var(--color-warning-light)] text-[var(--color-warning)]"
                                                                : "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"
                                                        }`}>
                                                        {a.status === "completed" ? (
                                                            <span className="material-symbols-outlined text-[12px]">check</span>
                                                        ) : (
                                                            idx + 1
                                                        )}
                                                    </div>
                                                    <div className={`p-1.5 rounded-[var(--radius-sm)] ${cat.color} flex-shrink-0`}>
                                                        <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-[var(--color-text-main)] truncate">{a.test.name}</p>
                                                        <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
                                                            <span className="font-mono">{a.test.displayId}</span>
                                                            <span>•</span>
                                                            <span>Order #{idx + 1}</span>
                                                            <span>•</span>
                                                            <span>{a.test.questions.length} questions</span>
                                                            <span>•</span>
                                                            <span>{a.test.duration} min</span>
                                                            <span>•</span>
                                                            <span>{new Date(a.assignedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${st.bg} ${st.text}`}>
                                                        <span className="material-symbols-outlined text-[12px]">{st.icon}</span>
                                                        {st.label}
                                                    </span>
                                                    <button onClick={() => setDeleteTarget({ id: a.id, candidateName: a.candidate.name, testName: a.test.name })} className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-danger hover:bg-[var(--color-danger-light)] transition-colors" title="Remove assignment">
                                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* =============== ASSIGN MODAL =============== */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-[8px] z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0" onClick={() => setShowAssignModal(false)} />
                    <div className="relative w-full max-w-4xl bg-[var(--color-bg-card)] rounded-3xl border border-[var(--color-border-strong)] shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-slide-in-up max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)] flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[var(--color-primary-light)] rounded-[var(--radius-sm)] text-primary">
                                    <span className="material-symbols-outlined">assignment_add</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--color-text-main)]">Assign Tests to Candidates</h3>
                                    <p className="text-xs text-[var(--color-text-muted)]">Select candidates and tests to assign</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAssignModal(false)} className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Two-column selection */}
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[var(--color-border)]">
                            {/* Left: Candidates */}
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="p-4 border-b border-[var(--color-border)] flex-shrink-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold text-[var(--color-text-main)] flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px] text-primary">group</span>
                                            Candidates
                                            <span className="text-xs font-normal text-[var(--color-text-muted)]">({selectedCandidates.size} selected)</span>
                                        </h4>
                                        <button onClick={toggleAllCandidates} className="text-[10px] text-primary hover:underline font-medium">
                                            {selectedCandidates.size === modalCandidates.length ? "Deselect All" : "Select All"}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-[var(--color-text-muted)]">
                                            <span className="material-symbols-outlined text-[16px]">search</span>
                                        </span>
                                        <input value={candidateSearch} onChange={(e) => setCandidateSearch(e.target.value)} className="w-full h-8 pl-8 pr-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" placeholder="Search candidates..." />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                                    {modalCandidates.length === 0 ? (
                                        <p className="text-xs text-[var(--color-text-muted)] text-center py-6">No candidates found</p>
                                    ) : (
                                        modalCandidates.map((c) => (
                                            <button key={c.id} onClick={() => toggleCandidate(c.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] text-left transition-all ${selectedCandidates.has(c.id) ? "bg-[var(--color-primary-light)] border border-[var(--color-border-accent)]" : "hover:bg-[var(--color-bg-hover)] border border-transparent"}`}>
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selectedCandidates.has(c.id) ? "bg-primary border-primary text-white" : "border-[var(--color-border)]"}`}>
                                                    {selectedCandidates.has(c.id) && <span className="material-symbols-outlined text-[14px]">check</span>}
                                                </div>
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0 shadow-[var(--shadow-sm)]">
                                                    {c.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-medium text-[var(--color-text-main)] truncate">{c.name}</p>
                                                    <p className="text-[10px] text-[var(--color-text-muted)] truncate">{c.displayId} • {c.email}{c.batch ? ` • Batch ${c.batch}` : ""}</p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Right: Tests */}
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="p-4 border-b border-[var(--color-border)] flex-shrink-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold text-[var(--color-text-main)] flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px] text-primary">quiz</span>
                                            Tests
                                            <span className="text-xs font-normal text-[var(--color-text-muted)]">({selectedTests.size} selected)</span>
                                        </h4>
                                        <button onClick={toggleAllTests} className="text-[10px] text-primary hover:underline font-medium">
                                            {selectedTests.size === modalTests.length ? "Deselect All" : "Select All"}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-[var(--color-text-muted)]">
                                            <span className="material-symbols-outlined text-[16px]">search</span>
                                        </span>
                                        <input value={testSearch} onChange={(e) => setTestSearch(e.target.value)} className="w-full h-8 pl-8 pr-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" placeholder="Search tests..." />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                                    {modalTests.length === 0 ? (
                                        <p className="text-xs text-[var(--color-text-muted)] text-center py-6">No published tests found</p>
                                    ) : (
                                        modalTests.map((t) => {
                                            const cat = categoryConfig[t.category] || categoryConfig.intelligence;
                                            return (
                                                <button key={t.id} onClick={() => toggleTest(t.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] text-left transition-all ${selectedTests.has(t.id) ? "bg-[var(--color-primary-light)] border border-[var(--color-border-accent)]" : "hover:bg-[var(--color-bg-hover)] border border-transparent"}`}>
                                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selectedTests.has(t.id) ? "bg-primary border-primary text-white" : "border-[var(--color-border)]"}`}>
                                                        {selectedTests.has(t.id) && <span className="material-symbols-outlined text-[14px]">check</span>}
                                                    </div>
                                                    <div className={`p-1.5 rounded-[var(--radius-sm)] ${cat.color} flex-shrink-0`}>
                                                        <span className="material-symbols-outlined text-[14px]">{cat.icon}</span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-medium text-[var(--color-text-main)] truncate">{t.name}</p>
                                                        <p className="text-[10px] text-[var(--color-text-muted)] truncate">{t.displayId} • {t.questions.length} questions • {t.duration} min</p>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between p-6 border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)] flex-shrink-0 rounded-b-3xl">
                            <div className="text-xs text-[var(--color-text-muted)]">
                                <span className="font-semibold text-[var(--color-text-sub)]">{selectedCandidates.size}</span> candidate{selectedCandidates.size !== 1 ? "s" : ""} × <span className="font-semibold text-[var(--color-text-sub)]">{selectedTests.size}</span> test{selectedTests.size !== 1 ? "s" : ""} = <span className="font-bold text-primary">{selectedCandidates.size * selectedTests.size}</span> assignment{selectedCandidates.size * selectedTests.size !== 1 ? "s" : ""}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowAssignModal(false)} className="px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-primary-light)] text-primary border border-[var(--color-border-accent)] font-medium text-sm hover:bg-[var(--color-bg-hover)] transition-colors btn-press">
                                    Cancel
                                </button>
                                <button onClick={handleAssign} disabled={selectedCandidates.size === 0 || selectedTests.size === 0 || assigning} className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press disabled:opacity-50 disabled:cursor-not-allowed">
                                    <span className="material-symbols-outlined text-[18px]">{assigning ? "progress_activity" : "assignment_turned_in"}</span>
                                    {assigning ? "Assigning..." : "Assign"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Remove Assignment"
                message={`Are you sure you want to remove "${deleteTarget?.testName}" from "${deleteTarget?.candidateName}"? This action cannot be undone.`}
                confirmLabel="Remove"
                variant="danger"
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => {
                    if (deleteTarget) {
                        handleDelete(deleteTarget.id);
                        setDeleteTarget(null);
                    }
                }}
            />
        </>
    );
}
