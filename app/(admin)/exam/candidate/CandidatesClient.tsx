"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import ConfirmDialog from "../../components/ConfirmDialog";
import DataTable, { ColumnDef } from "../../components/DataTable";
import Breadcrumb from "../../components/Breadcrumb";
import Select2 from "../../components/Select2";

/* ===== Helpers ===== */
function generatePassword(length = 10): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pw = "";
    for (let i = 0; i < length; i++) {
        pw += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pw;
}

/* ===== Types ===== */
interface Candidate {
    id: string;
    displayId: string;
    name: string;
    email: string;
    phone: string | null;
    role: "user" | "admin" | "proctor";
    batch: string | null;
    password: string;
    accessType: "range" | "permanent";
    accessStart: string | null;
    accessEnd: string | null;
    status: "registered" | "testing" | "completed" | "flagged";
    score: number | null;
    createdAt: string;
}

const statusConfig: Record<
    Candidate["status"],
    { label: string; bg: string; text: string }
> = {
    registered: {
        label: "Registered",
        bg: "bg-blue-100 dark:bg-blue-900/40",
        text: "text-blue-800 dark:text-blue-300",
    },
    testing: {
        label: "Testing",
        bg: "bg-[var(--color-warning-light)]",
        text: "text-[var(--color-warning)]",
    },
    completed: {
        label: "Completed",
        bg: "bg-[var(--color-success-light)]",
        text: "text-[var(--color-success)]",
    },
    flagged: {
        label: "Flagged",
        bg: "bg-[var(--color-danger-light)]",
        text: "text-danger",
    },
};

export default function CandidatesClient() {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [companies, setCompanies] = useState<{id: string, name: string}[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<string>("all");
    const [currentRole, setCurrentRole] = useState<string>("user");
    const [showAddModal, setShowAddModal] = useState(false);
    const [copiedPw, setCopiedPw] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [newCandidate, setNewCandidate] = useState({
        name: "",
        email: "",
        phone: "",
        role: "user" as "user" | "admin" | "proctor",
        batch: "",
        password: generatePassword(),
        accessType: "range" as "range" | "permanent",
        accessStart: "",
        accessEnd: "",
    });

    /* Fetch companies (superadmin only) */
    const fetchCompanies = useCallback(async () => {
        try {
            const res = await fetch("/api/companies");
            if (res.ok) {
                const data = await res.json();
                setCompanies(data);
            }
        } catch (err) {
            console.error("Failed to fetch companies", err);
        }
    }, []);

    /* Fetch candidates from API */
    const fetchCandidates = useCallback(async (companyId: string = "all") => {
        setLoading(true);
        try {
            const url = companyId && companyId !== "all"
                ? `/api/candidates?companyId=${companyId}`
                : "/api/candidates";
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setCandidates(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    /* Init: detect role, fetch companies if superadmin, then fetch candidates */
    useEffect(() => {
        const role = sessionStorage.getItem("candidateRole") || "user";
        setCurrentRole(role);

        if (role === "superadmin") {
            fetchCompanies();
        }

        fetchCandidates("all");
    }, [fetchCompanies, fetchCandidates]);

    /* Handle company filter change */
    const handleCompanyChange = useCallback((val: string) => {
        setSelectedCompany(val);
        fetchCandidates(val);
    }, [fetchCandidates]);

    const regeneratePassword = useCallback(() => {
        setNewCandidate((prev) => ({ ...prev, password: generatePassword() }));
    }, []);

    const copyPassword = useCallback(async () => {
        await navigator.clipboard.writeText(newCandidate.password);
        setCopiedPw(true);
        setTimeout(() => setCopiedPw(false), 2000);
    }, [newCandidate.password]);

    /* Filtering */
    const filtered = candidates.filter((c) => {
        const matchStatus =
            filterStatus === "all" || c.status === filterStatus;
        return matchStatus;
    });

    const columns = useMemo<ColumnDef<Candidate>[]>(() => [
        {
            header: "ID",
            accessorKey: "displayId",
            sortable: true,
            filterable: true,
            cell: (row) => <span className="font-mono text-[11px] text-[var(--color-text-muted)]">{row.displayId}</span>
        },
        {
            header: "Candidate",
            accessorKey: "name",
            sortable: true,
            filterable: true,
            cell: (row) => (
                <div>
                    <p className="font-medium text-[var(--color-text-main)]">{row.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{row.email}</p>
                </div>
            )
        },
        {
            header: "Role",
            accessorKey: "role",
            sortable: true,
            filterable: true,
            cell: (row) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${row.role === "admin"
                    ? "bg-brand-navy/15 dark:bg-brand-navy/30 text-brand-navy dark:text-brand-sky"
                    : row.role === "proctor"
                        ? "bg-brand-teal/15 dark:bg-brand-teal/30 text-brand-teal dark:text-brand-sky"
                        : "bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)]"
                    }`}>
                    {row.role === "admin" ? "Admin" : row.role === "proctor" ? "Proctor" : "User"}
                </span>
            )
        },
        {
            header: "Batch",
            accessorKey: "batch",
            sortable: true,
            filterable: true,
            cell: (row) => <span className="text-[var(--color-text-muted)]">{row.role !== "user" ? "—" : (row.batch || "—")}</span>
        },
        {
            header: "Login Access",
            accessorKey: "accessType",
            sortable: true,
            filterable: false,
            cell: (row) => (
                <span className="text-xs text-[var(--color-text-muted)]">
                    {row.accessType === "permanent" ? (
                        <span className="inline-flex items-center gap-1 text-[var(--color-success)]">
                            <span className="material-symbols-outlined text-[14px]">all_inclusive</span> Permanent
                        </span>
                    ) : (
                        <span>{row.accessStart ? new Date(row.accessStart).toLocaleDateString() : ""} — {row.accessEnd ? new Date(row.accessEnd).toLocaleDateString() : ""}</span>
                    )}
                </span>
            )
        },
        {
            header: "Status",
            accessorKey: "status",
            sortable: true,
            filterable: true,
            cell: (row) => {
                const s = statusConfig[row.status];
                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${s.bg} ${s.text}`}>
                        {s.label}
                    </span>
                );
            }
        },
        {
            header: "Score",
            accessorKey: "score",
            sortable: true,
            filterable: false,
            cell: (row) => (
                <span className="font-medium text-[var(--color-text-main)]">
                    {row.score !== null ? (
                        <span className={row.score >= 80 ? "text-[var(--color-success)]" : row.score >= 60 ? "text-[var(--color-warning)]" : "text-danger"}>
                            {row.score}/100
                        </span>
                    ) : (
                        <span className="text-[var(--color-text-muted)]">—</span>
                    )}
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
                    <button className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-primary hover:bg-[var(--color-bg-hover)] transition-colors" title="View Details">
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </button>
                    <button className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-warning)] hover:bg-[var(--color-bg-hover)] transition-colors" title="Edit">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => setDeleteTarget({ id: row.id, name: row.name })} className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-danger hover:bg-[var(--color-danger-light)] transition-colors" title="Delete">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            )
        }
    ], []);

    /* Add candidate */
    const handleAddCandidate = async () => {
        if (!newCandidate.name || !newCandidate.email || !newCandidate.password) return;
        if (newCandidate.role === "user" && newCandidate.accessType === "range" && (!newCandidate.accessStart || !newCandidate.accessEnd)) return;

        try {
            const res = await fetch("/api/candidates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newCandidate),
            });
            if (!res.ok) throw new Error("Failed to create");
            const created = await res.json();
            setCandidates((prev) => [created, ...prev]);
            setNewCandidate({
                name: "",
                email: "",
                phone: "",
                role: "user",
                batch: "",
                password: generatePassword(),
                accessType: "range",
                accessStart: "",
                accessEnd: "",
            });
            setShowAddModal(false);
        } catch (err) {
            console.error(err);
        }
    };

    /* Delete candidate */
    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/candidates/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
            setCandidates((prev) => prev.filter((c) => c.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const handleExportExcel = () => {
        const headers = ["ID", "Nama", "Email", "Telepon", "Role", "Status", "Batch", "Tanggal Dibuat"];
        const rows = candidates.map(c => [
            c.displayId,
            c.name,
            c.email,
            c.phone || "—",
            c.role,
            c.status,
            c.batch || "—",
            c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"
        ]);
        let excelContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
        excelContent += `<head><meta charset="utf-8" /><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Data Kandidat</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>`;
        excelContent += `<table><thead><tr>`;
        headers.forEach(h => {
            excelContent += `<th style="background-color: #0f766e; color: white; border: 1px solid #ddd; padding: 8px;">${h}</th>`;
        });
        excelContent += `</tr></thead><tbody>`;
        rows.forEach(row => {
            excelContent += `<tr>`;
            row.forEach(val => {
                excelContent += `<td style="border: 1px solid #ddd; padding: 6px;">${val}</td>`;
            });
            excelContent += `</tr>`;
        });
        excelContent += `</tbody></table></body></html>`;
        const blob = new Blob([excelContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `candidates_${new Date().toISOString().split('T')[0]}.xls`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            {/* Page Header */}
            <div className="flex flex-col gap-4 animate-slide-in-up">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">
                            Candidates
                        </h1>
                        <p className="text-sm text-[var(--color-text-sub)] mt-1 font-medium">
                            Manage test participants and their registration status.
                        </p>
                    </div>
                    <Breadcrumb />
                </div>
                
        
            </div>

            {/* Filters Bar */}
    
                {/* This section moved to Action Bar above */}
            

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(
                    [
                        {
                            label: "Total",
                            count: candidates.length,
                            icon: "groups",
                            color: "text-primary bg-[var(--color-primary-light)]",
                        },
                        {
                            label: "Registered",
                            count: candidates.filter(
                                (c) => c.status === "registered"
                            ).length,
                            icon: "how_to_reg",
                            color: "text-primary bg-[var(--color-primary-light)] dark:bg-blue-900/20",
                        },
                        {
                            label: "Testing",
                            count: candidates.filter(
                                (c) => c.status === "testing"
                            ).length,
                            icon: "timer",
                            color: "text-[var(--color-warning)] bg-[var(--color-warning-light)]",
                        },
                        {
                            label: "Flagged",
                            count: candidates.filter(
                                (c) => c.status === "flagged"
                            ).length,
                            icon: "flag",
                            color: "text-danger bg-[var(--color-danger-light)]",
                        },
                    ] as const
                ).map((s) => (
                    <div
                        key={s.label}
                        className="bg-[var(--color-bg-card)] p-4 rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] flex items-center gap-3 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:translate-y-[-2px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)]"
                    >
                        <div
                            className={`p-2 rounded-[var(--radius-sm)] ${s.color}`}
                        >
                            <span className="material-symbols-outlined">
                                {s.icon}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs text-[var(--color-text-muted)]">
                                {s.label}
                            </p>
                            <p className="text-xl font-bold text-[var(--color-text-main)]">
                                {s.count}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Candidates Table */}
            
            {/* Card Container */}
            <div className="bg-[var(--color-bg-card)] p-6 rounded-[var(--radius-md)] shadow-[var(--shadow-card)] border border-[var(--color-border)]">
                
                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    {/* Left: Filters and Excel */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Company Filter (superadmin only) */}
                        {currentRole === "superadmin" && (
                            <Select2
                                value={selectedCompany}
                                onChange={handleCompanyChange}
                                options={[
                                    { value: "all", label: "Semua Perusahaan" },
                                    ...companies.map(c => ({ value: c.id, label: c.name }))
                                ]}
                                placeholder="Pilih Perusahaan..."
                                className="w-52 text-left"
                            />
                        )}
                        {/* Status Filter */}
                        <Select2
                            value={filterStatus}
                            onChange={(val) => setFilterStatus(val)}
                            options={[
                                { value: "all", label: "All Status" },
                                { value: "registered", label: "Registered" },
                                { value: "testing", label: "Testing" },
                                { value: "completed", label: "Completed" },
                                { value: "flagged", label: "Flagged" }
                            ]}
                            className="w-44 text-left"
                        />
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-100 rounded-md text-xs font-bold bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all"
                        >
                            <span className="material-symbols-outlined text-[14px]">cloud_download</span>
                            Excel
                        </button>
                    </div>
                    {/* Right: Add Button */}
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press"
                    >
                        <span className="material-symbols-outlined text-[18px]">person_add</span>
                        Add Candidate
                    </button>
                </div>
                <DataTable data={filtered} columns={columns} globalSearchPlaceholder="Search candidates..." />
            </div>
                

            {/* Add Candidate Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-[8px] z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0"
                        onClick={() => setShowAddModal(false)}
                    />
                    {/* Modal */}
                    <div className="relative w-full max-w-lg bg-[var(--color-bg-card)] rounded-3xl border border-[var(--color-border-strong)] shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-slide-in-up max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)] flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[var(--color-primary-light)] rounded-[var(--radius-sm)] text-primary">
                                    <span className="material-symbols-outlined">
                                        person_add
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--color-text-main)]">
                                        Add New Account
                                    </h3>
                                    <p className="text-xs text-[var(--color-text-muted)]">
                                        Register a new user, proctor, or admin account
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] transition-colors"
                            >
                                <span className="material-symbols-outlined">
                                    close
                                </span>
                            </button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto flex-1">
                            {/* Role Selector */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                                    Role *
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {(["user", "proctor", "admin"] as const).map((role) => {
                                        const selected = newCandidate.role === role;
                                        const config = {
                                            user: { icon: "person", label: "User", desc: "Test participant" },
                                            proctor: { icon: "supervisor_account", label: "Proctor", desc: "Test supervisor" },
                                            admin: { icon: "admin_panel_settings", label: "Admin", desc: "System admin" },
                                        };
                                        const rc = config[role];
                                        return (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() =>
                                                    setNewCandidate((prev) => ({
                                                        ...prev,
                                                        role,
                                                        ...(role !== "user" ? { batch: "", accessType: "permanent" as const } : {}),
                                                    }))
                                                }
                                                className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] border-2 transition-all ${selected
                                                    ? "border-primary bg-[var(--color-primary-light)] text-primary"
                                                    : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-[22px]">
                                                    {rc.icon}
                                                </span>
                                                <div className="text-left">
                                                    <p className={`text-sm font-semibold ${selected ? "text-primary" : "text-[var(--color-text-main)]"}`}>
                                                        {rc.label}
                                                    </p>
                                                    <p className="text-[10px] text-[var(--color-text-muted)]">{rc.desc}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Name & Email */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                        Full Name *
                                    </label>
                                    <input
                                        value={newCandidate.name}
                                        onChange={(e) =>
                                            setNewCandidate((prev) => ({
                                                ...prev,
                                                name: e.target.value,
                                            }))
                                        }
                                        className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300"
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                        Email *
                                    </label>
                                    <input
                                        value={newCandidate.email}
                                        onChange={(e) =>
                                            setNewCandidate((prev) => ({
                                                ...prev,
                                                email: e.target.value,
                                            }))
                                        }
                                        className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300"
                                        placeholder="e.g. john@email.com"
                                        type="email"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                    Phone
                                </label>
                                <input
                                    value={newCandidate.phone}
                                    onChange={(e) =>
                                        setNewCandidate((prev) => ({
                                            ...prev,
                                            phone: e.target.value,
                                        }))
                                    }
                                    className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300"
                                    placeholder="e.g. +62 812-xxxx-xxxx"
                                    type="tel"
                                />
                            </div>

                            {/* Password with Generate */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                    Password *
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            value={newCandidate.password}
                                            onChange={(e) =>
                                                setNewCandidate((prev) => ({
                                                    ...prev,
                                                    password: e.target.value,
                                                }))
                                            }
                                            className="w-full h-10 px-4 pr-10 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm font-mono text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300"
                                            placeholder="Auto-generated password"
                                        />
                                        <button
                                            type="button"
                                            onClick={copyPassword}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--color-text-muted)] hover:text-primary transition-colors"
                                            title="Copy password"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">
                                                {copiedPw ? "check" : "content_copy"}
                                            </span>
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={regeneratePassword}
                                        className="h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-primary hover:bg-[var(--color-bg-hover)] transition-colors flex items-center gap-1.5"
                                        title="Generate new password"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            refresh
                                        </span>
                                        <span className="text-xs font-medium hidden sm:inline">Generate</span>
                                    </button>
                                </div>
                                <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                                    This password will be used for login. Save it before closing.
                                </p>
                            </div>

                            {/* Batch (only for user role) */}
                            {newCandidate.role === "user" && (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                        Assigned Batch
                                    </label>
                                    <Select2
                                        value={newCandidate.batch || ""}
                                        onChange={(val) =>
                                            setNewCandidate((prev) => ({
                                                ...prev,
                                                batch: val,
                                            }))
                                        }
                                        options={[
                                            { value: "Engineering Intake 04", label: "Engineering Intake 04" },
                                            { value: "Management Trainee", label: "Management Trainee" },
                                            { value: "Cognitive Ability 12", label: "Cognitive Ability 12" },
                                            { value: "Logic Reasoning 03", label: "Logic Reasoning 03" },
                                            { value: "Personality Matrix B", label: "Personality Matrix B" }
                                        ]}
                                        placeholder="Select batch..."
                                        className="w-full text-left"
                                    />
                                </div>
                            )}

                            {/* Login Access Period */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                                    Login Access Period *
                                </label>
                                {/* Access Type Toggle */}
                                <div className="flex rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] p-1 mb-3 border border-[var(--color-border)]">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setNewCandidate((prev) => ({
                                                ...prev,
                                                accessType: "range",
                                            }))
                                        }
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${newCandidate.accessType === "range"
                                            ? "bg-[var(--color-bg-card)] text-[var(--color-text-main)] shadow-[var(--shadow-sm)]"
                                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-sub)]"
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">date_range</span>
                                        Date Range
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setNewCandidate((prev) => ({
                                                ...prev,
                                                accessType: "permanent",
                                                accessStart: "",
                                                accessEnd: "",
                                            }))
                                        }
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${newCandidate.accessType === "permanent"
                                            ? "bg-[var(--color-bg-card)] text-[var(--color-text-main)] shadow-[var(--shadow-sm)]"
                                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-sub)]"
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">all_inclusive</span>
                                        Permanent
                                    </button>
                                </div>

                                {/* Date Range Inputs */}
                                {newCandidate.accessType === "range" ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] text-[var(--color-text-muted)] mb-1">
                                                Start Date
                                            </label>
                                            <input
                                                type="date"
                                                value={newCandidate.accessStart}
                                                onChange={(e) =>
                                                    setNewCandidate((prev) => ({
                                                        ...prev,
                                                        accessStart: e.target.value,
                                                    }))
                                                }
                                                className="w-full h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] text-[var(--color-text-muted)] mb-1">
                                                End Date
                                            </label>
                                            <input
                                                type="date"
                                                value={newCandidate.accessEnd}
                                                onChange={(e) =>
                                                    setNewCandidate((prev) => ({
                                                        ...prev,
                                                        accessEnd: e.target.value,
                                                    }))
                                                }
                                                className="w-full h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] bg-[var(--color-success-light)] border border-[var(--color-success)]">
                                        <span className="material-symbols-outlined text-[var(--color-success)] text-[20px]">
                                            verified
                                        </span>
                                        <p className="text-xs text-[var(--color-success)]">
                                            This account will have unlimited login access with no expiration.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)] flex-shrink-0 rounded-b-3xl">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-primary-light)] text-primary border border-[var(--color-border-accent)] font-medium text-sm hover:bg-[var(--color-bg-hover)] transition-colors btn-press"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddCandidate}
                                disabled={
                                    !newCandidate.name ||
                                    !newCandidate.email ||
                                    !newCandidate.password ||
                                    (newCandidate.accessType === "range" &&
                                        (!newCandidate.accessStart || !newCandidate.accessEnd))
                                }
                                className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    check
                                </span>
                                {newCandidate.role === "admin" ? "Create Admin" : newCandidate.role === "proctor" ? "Create Proctor" : "Add Candidate"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Candidate"
                message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
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
