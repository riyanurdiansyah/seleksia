"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import ConfirmDialog from "../../components/ConfirmDialog";
import DataTable, { ColumnDef } from "../../components/DataTable";

interface Test {
    id: string;
    displayId: string;
    name: string;
}

interface Instruction {
    id: string;
    type: "general" | "specific";
    content: string;
    testId: string | null;
    test: {
        name: string;
    } | null;
    createdAt: string;
}

export default function InstructionsClient() {
    const [instructions, setInstructions] = useState<Instruction[]>([]);
    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [showModal, setShowModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Instruction | null>(null);

    const [form, setForm] = useState({
        id: "",
        type: "general" as "general" | "specific",
        content: "",
        testId: "",
    });

    const fetchData = useCallback(async () => {
        try {
            const [instRes, testsRes] = await Promise.all([
                fetch("/api/instructions", { cache: "no-store" }),
                fetch("/api/tests", { cache: "no-store" })
            ]);

            if (instRes.ok) setInstructions(await instRes.json());
            if (testsRes.ok) setTests(await testsRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filtered = instructions.filter((i) => {
        const matchType = filterType === "all" || i.type === filterType;
        return matchType;
    });

    const columns = useMemo<ColumnDef<Instruction>[]>(() => [
        {
            header: "Type",
            accessorKey: "type",
            sortable: true,
            filterable: true,
            cell: (row) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${row.type === "general" ? "bg-[var(--color-primary-light)] text-primary" : "bg-[var(--color-accent-light)] text-[var(--color-brand-navy)]"}`}>
                    {row.type}
                </span>
            )
        },
        {
            header: "Content",
            accessorKey: "content",
            sortable: true,
            filterable: true,
            cell: (row) => (
                <p className="text-sm text-[var(--color-text-main)] line-clamp-2 max-w-md">
                    {row.content}
                </p>
            )
        },
        {
            header: "Target Test",
            accessorKey: "testId",
            sortable: true,
            filterable: true,
            cell: (row) => (
                <span className="text-sm text-[var(--color-text-sub)]">
                    {row.type === "general" ? "All Tests" : row.test?.name || "Unknown"}
                </span>
            )
        },
        {
            header: "Actions",
            sortable: false,
            filterable: false,
            className: "text-right w-24",
            cell: (row) => (
                <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(row)} className="p-1.5 rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:text-primary hover:bg-[var(--color-bg-hover)] transition-colors" title="Edit">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => setDeleteTarget(row)} className="p-1.5 rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-colors" title="Delete">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            )
        }
    ], []);

    const handleSave = async () => {
        if (!form.content || (form.type === "specific" && !form.testId)) return;
        try {
            const isEdit = !!form.id;
            const res = await fetch(`/api/instructions${isEdit ? `/${form.id}` : ""}`, {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error("Failed to save");
            const saved = await res.json();

            setInstructions((prev) =>
                isEdit
                    ? prev.map((i) => (i.id === saved.id ? saved : i))
                    : [saved, ...prev]
            );

            setShowModal(false);
            setForm({ id: "", type: "general", content: "", testId: "" });
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/instructions/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
            setInstructions((prev) => prev.filter((i) => i.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const openEdit = (inst: Instruction) => {
        setForm({
            id: inst.id,
            type: inst.type,
            content: inst.content,
            testId: inst.testId || "",
        });
        setShowModal(true);
    };

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-in-up">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">Instructions</h1>
                    <p className="text-sm text-[var(--color-text-sub)] mt-1">Manage general and specific test instructions.</p>
                </div>
                <button
                    onClick={() => {
                        setForm({ id: "", type: "general", content: "", testId: "" });
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press"
                >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    Add Instruction
                </button>
            </div>

            <div className="flex items-center justify-end mt-6">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Filter Type:</span>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-sub)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] cursor-pointer transition-all duration-300"
                    >
                        <option value="all">All Types</option>
                        <option value="general">General</option>
                        <option value="specific">Specific</option>
                    </select>
                </div>
            </div>

            <div className="mt-4 flex-1 min-h-[400px]">
                <DataTable data={filtered} columns={columns} globalSearchPlaceholder="Search instructions..." />
            </div>

            {/* Modal Edit/Create */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-[8px] z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0" onClick={() => setShowModal(false)} />
                    <div className="relative w-full max-w-2xl bg-[var(--color-bg-card)] rounded-3xl border border-[var(--color-border-strong)] shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-slide-in-up max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)] flex-shrink-0 bg-[var(--color-bg-hover)]">
                            <h3 className="text-lg font-bold text-[var(--color-text-main)]">
                                {form.id ? "Edit Instruction" : "Add Instruction"}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1.5 rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-main)] transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Type</label>
                                <select
                                    value={form.type}
                                    onChange={(e) => setForm({ ...form, type: e.target.value as "general" | "specific" })}
                                    className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] cursor-pointer focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300"
                                >
                                    <option value="general">General (For all tests)</option>
                                    <option value="specific">Specific (For a specific test)</option>
                                </select>
                            </div>

                            {form.type === "specific" && (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Target Test *</label>
                                    <select
                                        value={form.testId}
                                        onChange={(e) => setForm({ ...form, testId: e.target.value })}
                                        className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] cursor-pointer focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300"
                                    >
                                        <option value="">Select a test</option>
                                        {tests.map(t => (
                                            <option key={t.id} value={t.id}>{t.displayId} - {t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Content *</label>
                                <textarea
                                    value={form.content}
                                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                                    rows={6}
                                    className="w-full px-4 py-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] focus:bg-[var(--color-bg-card)] focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] focus:translate-y-[-1px] resize-y transition-all duration-300"
                                    placeholder="Enter instructions (e.g. Kerjakan soal berikut dengan teliti...)"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-primary-light)] text-primary border border-[var(--color-border-accent)] font-medium text-sm hover:bg-[var(--color-bg-hover)] transition-all btn-press"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!form.content || (form.type === "specific" && !form.testId)}
                                className="px-4 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed btn-press"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Instruction"
                message={`Are you sure you want to delete this ${deleteTarget?.type} instruction? This cannot be undone.`}
                confirmLabel="Delete"
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
