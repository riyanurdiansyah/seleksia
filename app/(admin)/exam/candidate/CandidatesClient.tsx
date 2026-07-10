"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import ConfirmDialog from "../../components/ConfirmDialog";
import DataTable, { ColumnDef } from "../../components/DataTable";
import Breadcrumb from "../../components/Breadcrumb";
import Select2 from "../../components/Select2";
import * as XLSX from "xlsx";

/* ===== Types ===== */
interface Candidate {
    id: string;
    displayId: string;
    name: string;
    email: string;
    phone: string | null;
    role: "user" | "admin" | "proctor";
    batch: string | null;
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
    const [editCandidate, setEditCandidate] = useState<any>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [newCandidate, setNewCandidate] = useState({
        name: "",
        email: "",
        phone: "",
        role: "user" as "user" | "admin" | "proctor",
        batch: "",
        accessType: "range" as "range" | "permanent",
        accessStart: "",
        accessEnd: "",
    });

    // Import Excel States
    const [showImportModal, setShowImportModal] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [copiedAllImported, setCopiedAllImported] = useState(false);
    const [importResult, setImportResult] = useState<{
        success: boolean;
        insertedCount: number;
        skippedCount: number;
        skipped: { name: string; email: string; reason: string }[];
        importedCandidates: { displayId: string; name: string; email: string; password: string }[];
    } | null>(null);

    // Generate and Download Excel Template
    const handleDownloadTemplate = () => {
        const headers = [
            "Nama (Wajib)",
            "Email (Wajib)",
            "Telepon (Opsional)",
            "Batch (Opsional)",
            "Role (user/admin/proctor - Opsional)",
            "Password (Opsional)",
            "Access Type (range/permanent - Opsional)",
            "Access Start (YYYY-MM-DD - Opsional)",
            "Access End (YYYY-MM-DD - Opsional)"
        ];
        
        const rows = [
            headers,
            [
                "Budi Santoso",
                "budi.santoso@example.com",
                "081234567890",
                "Management Trainee",
                "user",
                "BudiSec123",
                "range",
                "2026-06-01",
                "2026-06-30"
            ],
            [
                "Siti Aminah",
                "siti.aminah@example.com",
                "089876543210",
                "Engineering Intake 04",
                "user",
                "", // Blank for auto-generate
                "permanent",
                "",
                ""
            ],
            [
                "Rudi Hartono",
                "rudi.proctor@example.com",
                "",
                "",
                "proctor",
                "ProctorPass123",
                "permanent",
                "",
                ""
            ]
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        
        // Column widths
        worksheet["!cols"] = [
            { wch: 20 }, // Nama
            { wch: 28 }, // Email
            { wch: 18 }, // Telepon
            { wch: 22 }, // Batch
            { wch: 18 }, // Role
            { wch: 18 }, // Password
            { wch: 18 }, // Access Type
            { wch: 22 }, // Access Start
            { wch: 22 }  // Access End
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
        XLSX.writeFile(workbook, "template_import_kandidat.xlsx");
    };

    // Parse Excel File
    const parseExcelFile = (file: File) => {
        setImportError(null);
        setImportResult(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
                if (rows.length === 0) {
                    setImportError("File Excel kosong");
                    return;
                }

                const headers = rows[0] as string[];
                const namaIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes("nama"));
                const emailIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes("email"));
                const telIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes("telepon"));
                const batchIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes("batch"));
                const roleIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes("role"));
                const passIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes("password"));
                const accTypeIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes("access type"));
                const accStartIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes("access start"));
                const accEndIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes("access end"));

                if (namaIdx === -1 || emailIdx === -1) {
                    setImportError("Kolom 'Nama' dan 'Email' wajib ada dalam file Excel");
                    return;
                }

                const parsed = [];
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i] as any[];
                    if (!row || row.length === 0) continue;
                    
                    const name = row[namaIdx]?.toString().trim();
                    const email = row[emailIdx]?.toString().trim();
                    
                    if (!name && !email) continue;

                    const phone = telIdx !== -1 ? row[telIdx]?.toString().trim() || "" : "";
                    const batch = batchIdx !== -1 ? row[batchIdx]?.toString().trim() || "" : "";
                    const role = roleIdx !== -1 ? row[roleIdx]?.toString().trim().toLowerCase() || "user" : "user";
                    const password = passIdx !== -1 ? row[passIdx]?.toString().trim() || "" : "";
                    const accessType = accTypeIdx !== -1 ? row[accTypeIdx]?.toString().trim().toLowerCase() || "range" : "range";
                    const accessStart = accStartIdx !== -1 ? row[accStartIdx]?.toString().trim() || "" : "";
                    const accessEnd = accEndIdx !== -1 ? row[accEndIdx]?.toString().trim() || "" : "";

                    let status: "valid" | "invalid" = "valid";
                    let reason = "";

                    if (!name) {
                        status = "invalid";
                        reason = "Nama kosong";
                    } else if (!email) {
                        status = "invalid";
                        reason = "Email kosong";
                    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                        status = "invalid";
                        reason = "Format email tidak valid";
                    } else if (role !== "user" && role !== "admin" && role !== "proctor") {
                        status = "invalid";
                        reason = "Role tidak valid (harus user/admin/proctor)";
                    } else if (accessType !== "range" && accessType !== "permanent") {
                        status = "invalid";
                        reason = "Access Type tidak valid (harus range/permanent)";
                    } else if (accessType === "range" && (!accessStart || !accessEnd)) {
                        status = "invalid";
                        reason = "Tanggal akses wajib diisi jika tipe 'range'";
                    }

                    parsed.push({
                        name,
                        email,
                        phone,
                        batch,
                        role,
                        password,
                        accessType,
                        accessStart,
                        accessEnd,
                        status,
                        reason
                    });
                }

                if (parsed.length === 0) {
                    setImportError("Tidak ada data kandidat yang ditemukan");
                    return;
                }

                setParsedData(parsed);
            } catch (err) {
                console.error("Error parsing Excel:", err);
                setImportError("Gagal membaca file Excel. Pastikan format file benar.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        parseExcelFile(file);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            const fileExt = file.name.split('.').pop()?.toLowerCase();
            if (fileExt === 'xlsx' || fileExt === 'xls') {
                parseExcelFile(file);
            } else {
                setImportError("Hanya file Excel (.xlsx, .xls) yang diperbolehkan");
            }
        }
    };

    const handleImportSubmit = async () => {
        const validRows = parsedData.filter(p => p.status === "valid");
        if (validRows.length === 0) return;

        setImportLoading(true);
        setImportError(null);

        try {
            const res = await fetch("/api/candidates/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ candidates: validRows }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Gagal mengimpor data kandidat");
            }

            const result = await res.json();
            setImportResult(result);
            // Refresh data
            fetchCandidates(selectedCompany);
        } catch (err: any) {
            setImportError(err.message || "Terjadi kesalahan saat menyimpan data");
        } finally {
            setImportLoading(false);
        }
    };

    const handleCopyAllCredentials = () => {
        if (!importResult || !importResult.importedCandidates) return;
        const text = importResult.importedCandidates
            .map(c => `ID: ${c.displayId}\nNama: ${c.name}\nEmail: ${c.email}\nPassword: ${c.password}`)
            .join("\n\n=======================\n\n");
        navigator.clipboard.writeText(text);
        setCopiedAllImported(true);
        setTimeout(() => setCopiedAllImported(false), 2000);
    };

    const handleCloseImportModal = () => {
        setShowImportModal(false);
        setParsedData([]);
        setImportResult(null);
        setImportError(null);
        setImportLoading(false);
    };

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
                            <span>{row.accessStart ? new Date(row.accessStart).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "short" }) : ""} — {row.accessEnd ? new Date(row.accessEnd).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "short" }) : ""}</span>
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
                    <button onClick={() => {
                        const toLocalDatetime = (isoStr: string | null | undefined) => {
                            if (!isoStr) return "";
                            const d = new Date(isoStr);
                            // Force GMT+7 (-420 minutes) instead of browser's local timezone
                            return new Date(d.getTime() - (-420) * 60000).toISOString().substring(0, 16);
                        };

                        setEditCandidate({
                            id: row.id,
                            name: row.name,
                            email: row.email,
                            phone: row.phone || "",
                            role: row.role,
                            batch: row.batch || "",
                            accessType: row.accessType,
                            accessStart: toLocalDatetime(row.accessStart),
                            accessEnd: toLocalDatetime(row.accessEnd),
                            status: row.status,
                            password: ""
                        });
                        setNewCandidate({
                            name: row.name,
                            email: row.email,
                            phone: row.phone || "",
                            role: row.role,
                            batch: row.batch || "",
                            accessType: row.accessType,
                            accessStart: toLocalDatetime(row.accessStart),
                            accessEnd: toLocalDatetime(row.accessEnd),
                        } as any);
                        setShowAddModal(true);
                    }} className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-warning)] hover:bg-[var(--color-bg-hover)] transition-colors" title="Edit">
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
        if (!newCandidate.name || !newCandidate.email) return;
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
                accessType: "range",
                accessStart: "",
                accessEnd: "",
            });
            setShowAddModal(false);
        } catch (err) {
            console.error(err);
        }
    };
    /* Edit candidate */
    const handleEditSubmit = async () => {
        if (!editCandidate) return;
        const payload = { ...newCandidate, id: editCandidate.id };
        if (!payload.name || !payload.email) return;
        if (payload.role === "user" && payload.accessType === "range" && (!payload.accessStart || !payload.accessEnd)) return;

        try {
            const res = await fetch(`/api/candidates/${payload.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("Failed to update");
            const updated = await res.json();
            setCandidates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setShowAddModal(false);
            setEditCandidate(null);
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
            c.createdAt ? new Date(c.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "short" }) : "—"
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
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-100 rounded-md text-xs font-bold bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[14px]">cloud_download</span>
                            Export Excel
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowImportModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-100 rounded-md text-xs font-bold bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[14px]">cloud_upload</span>
                            Import Excel
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
                        onClick={() => { setShowAddModal(false); setEditCandidate(null); setNewCandidate({ name: "", email: "", phone: "", role: "user", batch: "", accessType: "range", accessStart: "", accessEnd: "" }); }}
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
                                        {editCandidate ? "Edit Account" : "Add New Account"}
                                    </h3>
                                    <p className="text-xs text-[var(--color-text-muted)]">
                                        Register a new user, proctor, or admin account
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowAddModal(false); setEditCandidate(null); setNewCandidate({ name: "", email: "", phone: "", role: "user", batch: "", accessType: "range", accessStart: "", accessEnd: "" }); }}
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
                                                type="datetime-local"
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
                                                type="datetime-local"
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
                                onClick={() => { setShowAddModal(false); setEditCandidate(null); setNewCandidate({ name: "", email: "", phone: "", role: "user", batch: "", accessType: "range", accessStart: "", accessEnd: "" }); }}
                                className="px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-primary-light)] text-primary border border-[var(--color-border-accent)] font-medium text-sm hover:bg-[var(--color-bg-hover)] transition-colors btn-press"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={editCandidate ? handleEditSubmit : handleAddCandidate}
                                disabled={
                                    !newCandidate.name ||
                                    !newCandidate.email ||
                                    (newCandidate.accessType === "range" &&
                                        (!newCandidate.accessStart || !newCandidate.accessEnd))
                                }
                                className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    check
                                </span>
                                {editCandidate ? "Save Changes" : (newCandidate.role === "admin" ? "Create Admin" : newCandidate.role === "proctor" ? "Create Proctor" : "Add Candidate")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Candidates Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-[8px] z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0" onClick={handleCloseImportModal} />
                    
                    {/* Modal */}
                    <div className="relative w-full max-w-4xl bg-[var(--color-bg-card)] rounded-3xl border border-[var(--color-border-strong)] shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-slide-in-up max-h-[90vh] flex flex-col">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)] flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[var(--color-primary-light)] rounded-[var(--radius-sm)] text-primary">
                                    <span className="material-symbols-outlined">cloud_upload</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--color-text-main)]">
                                        Import Candidates from Excel
                                    </h3>
                                    <p className="text-xs text-[var(--color-text-muted)]">
                                        Upload Excel file with user lists to register them in bulk
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseImportModal}
                                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer animate-fade-in"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            
                            {importError && (
                                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-danger text-xs font-semibold">
                                    <span className="material-symbols-outlined text-[18px]">error</span>
                                    <div>{importError}</div>
                                </div>
                            )}

                            {/* SUCCESS SUMMARY RESULT */}
                            {importResult ? (
                                <div className="space-y-6">
                                    {/* Summary Card */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                                            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-600">
                                                <span className="material-symbols-outlined">task_alt</span>
                                            </div>
                                            <div>
                                                <p className="text-xs text-[var(--color-text-muted)]">Berhasil Diimpor</p>
                                                <p className="text-lg font-bold text-emerald-600">{importResult.insertedCount} Kandidat</p>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                                            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-600">
                                                <span className="material-symbols-outlined">warning</span>
                                            </div>
                                            <div>
                                                <p className="text-xs text-[var(--color-text-muted)]">Dilewati / Duplikat</p>
                                                <p className="text-lg font-bold text-amber-600">{importResult.skippedCount} Baris</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action on Success: Copy Credentials */}
                                    {importResult.importedCandidates && importResult.importedCandidates.length > 0 && (
                                        <div className="p-5 border border-[var(--color-border-strong)] rounded-2xl bg-[var(--color-bg-elevated)] space-y-3">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div>
                                                    <h4 className="text-xs font-black uppercase text-[var(--color-text-main)] flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[16px] text-primary">key</span>
                                                        Daftar Kredensial Login Baru
                                                    </h4>
                                                    <p className="text-[10px] text-[var(--color-text-muted)]">Salin kredensial ini untuk dikirimkan kepada peserta.</p>
                                                </div>
                                                <button
                                                    onClick={handleCopyAllCredentials}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-all cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">
                                                        {copiedAllImported ? "check" : "content_copy"}
                                                    </span>
                                                    {copiedAllImported ? "Tersalin!" : "Salin Semua Kredensial"}
                                                </button>
                                            </div>

                                            <div className="max-h-48 overflow-y-auto border border-[var(--color-border)] rounded-xl bg-[var(--color-bg-card)] text-xs font-mono p-3 space-y-2">
                                                {importResult.importedCandidates.map((c, idx) => (
                                                    <div key={idx} className="pb-2 border-b border-[var(--color-border)] last:border-b-0 last:pb-0 flex justify-between gap-4 items-center">
                                                        <div>
                                                            <span className="text-[var(--color-text-muted)]">[{c.displayId}]</span> <strong className="text-[var(--color-text-main)] font-semibold">{c.name}</strong> - <span className="text-primary">{c.email}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                                                            <span className="text-[10px] text-[var(--color-text-muted)]">Pass:</span>
                                                            <strong className="text-[var(--color-text-main)]">{c.password}</strong>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Skipped Table */}
                                    {importResult.skipped && importResult.skipped.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-black uppercase text-[var(--color-text-main)]">
                                                Baris yang Dilewati ({importResult.skipped.length})
                                            </h4>
                                            <div className="border border-[var(--color-border)] rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                                                <table className="w-full text-xs text-left border-collapse">
                                                    <thead className="bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] uppercase text-[10px] font-bold border-b border-[var(--color-border)]">
                                                        <tr>
                                                            <th className="p-3 text-left">Nama</th>
                                                            <th className="p-3 text-left">Email</th>
                                                            <th className="p-3 text-left">Alasan</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text-sub)]">
                                                        {importResult.skipped.map((s, idx) => (
                                                            <tr key={idx} className="hover:bg-[var(--color-bg-hover)]">
                                                                <td className="p-3 font-semibold text-[var(--color-text-main)]">{s.name}</td>
                                                                <td className="p-3">{s.email}</td>
                                                                <td className="p-3 text-danger">{s.reason}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : parsedData.length > 0 ? (
                                /* DATA PREVIEW AND VALIDATION BEFORE IMPORT */
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center flex-wrap gap-2">
                                        <div>
                                            <h4 className="text-sm font-bold text-[var(--color-text-main)]">
                                                Pratinjau Data ({parsedData.length} Baris Terdeteksi)
                                            </h4>
                                            <p className="text-xs text-[var(--color-text-muted)] text-left mt-0.5">
                                                Periksa kembali data di bawah sebelum melanjutkan impor.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setParsedData([])}
                                            className="px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-sub)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-main)] transition-all cursor-pointer"
                                        >
                                            Reset File
                                        </button>
                                    </div>

                                    {/* Preview Table */}
                                    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                                        <table className="w-full text-xs text-left border-collapse">
                                            <thead className="bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] uppercase text-[10px] font-bold border-b border-[var(--color-border)] sticky top-0 z-10">
                                                <tr>
                                                    <th className="p-3 text-left">Nama</th>
                                                    <th className="p-3 text-left">Email</th>
                                                    <th className="p-3 text-left">Role</th>
                                                    <th className="p-3 text-left">Batch</th>
                                                    <th className="p-3 text-left">Akses Login</th>
                                                    <th className="p-3 text-left">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text-sub)]">
                                                {parsedData.map((row, idx) => (
                                                    <tr key={idx} className={`hover:bg-[var(--color-bg-hover)] ${row.status === "invalid" ? "bg-red-500/5" : ""}`}>
                                                        <td className="p-3 font-semibold text-[var(--color-text-main)]">{row.name || "—"}</td>
                                                        <td className="p-3">{row.email || "—"}</td>
                                                        <td className="p-3 capitalize">{row.role || "user"}</td>
                                                        <td className="p-3 truncate max-w-[150px]">{row.batch || "—"}</td>
                                                        <td className="p-3">
                                                            {row.accessType === "permanent" ? (
                                                                <span className="inline-flex items-center gap-1 text-[var(--color-success)] font-medium">
                                                                    Permanent
                                                                </span>
                                                            ) : (
                                                                <span className="text-[var(--color-text-muted)]">
                                                                    {row.accessStart && row.accessEnd ? `${row.accessStart} s/d ${row.accessEnd}` : "Belum diatur"}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                            {row.status === "valid" ? (
                                                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                                    Valid
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-danger" title={row.reason}>
                                                                    Gagal: {row.reason}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {parsedData.some(p => p.status === "invalid") && (
                                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs text-left">
                                            <strong>Perhatian:</strong> Beberapa baris memiliki status error dan akan dilewati saat proses impor.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* INITIAL UPLOAD VIEW & RULES */
                                <div className="space-y-6">
                                    {/* Format Guidelines Card */}
                                    <div className="p-5 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent rounded-2xl border border-[var(--color-border)] space-y-4">
                                        <div className="flex items-center gap-2 text-primary">
                                            <span className="material-symbols-outlined text-[20px]">info</span>
                                            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-main)]">
                                                Panduan Format Kolom Excel
                                            </h4>
                                        </div>
                                        <p className="text-xs text-[var(--color-text-sub)] leading-relaxed text-left">
                                            Unduh file template di bawah, lalu isi datanya. Sistem akan mencocokkan kolom berdasarkan nama header (tidak sensitif huruf besar/kecil).
                                        </p>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-left">
                                            <div className="space-y-1.5">
                                                <h5 className="font-bold text-[var(--color-text-main)]">Kolom Wajib:</h5>
                                                <ul className="list-disc pl-4 space-y-1 text-[var(--color-text-muted)]">
                                                    <li><strong className="text-[var(--color-text-sub)]">Nama</strong>: Nama lengkap peserta.</li>
                                                    <li><strong className="text-[var(--color-text-sub)]">Email</strong>: Alamat email unik peserta (digunakan untuk login).</li>
                                                </ul>
                                            </div>
                                            <div className="space-y-1.5">
                                                <h5 className="font-bold text-[var(--color-text-main)]">Kolom Opsional & Aturan:</h5>
                                                <ul className="list-disc pl-4 space-y-1 text-[var(--color-text-muted)]">
                                                    <li><strong className="text-[var(--color-text-sub)]">Role</strong>: `user` (kandidat), `proctor`, atau `admin` (default: `user`).</li>
                                                    <li><strong className="text-[var(--color-text-sub)]">Password</strong>: Kolom password tidak perlu diisi. Password awal otomatis disamakan dengan ID Login.</li>
                                                    <li><strong className="text-[var(--color-text-sub)]">Access Type</strong>: `range` atau `permanent` (default: `range`).</li>
                                                    <li><strong className="text-[var(--color-text-sub)]">Access Start & End</strong>: Format `YYYY-MM-DD` (wajib jika Access Type = `range`).</li>
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="flex pt-2 border-t border-[var(--color-border)]">
                                            <button
                                                type="button"
                                                onClick={handleDownloadTemplate}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-main)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-bg-hover)] transition-all cursor-pointer btn-press"
                                            >
                                                <span className="material-symbols-outlined text-[16px] text-primary">download</span>
                                                Unduh Template Excel (.xlsx)
                                            </button>
                                        </div>
                                    </div>

                                    {/* Upload Area */}
                                    <div
                                        onDragEnter={handleDrag}
                                        onDragOver={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDrop={handleDrop}
                                        className={`flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-2xl text-center gap-3 transition-all duration-300 min-h-[220px] ${dragActive 
                                            ? "border-primary bg-[var(--color-primary-light)] text-primary" 
                                            : "border-[var(--color-border)] bg-[var(--color-bg-hover)]/20 text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
                                        }`}
                                    >
                                        <div className="p-3 bg-[var(--color-bg-elevated)] rounded-full border border-[var(--color-border)]">
                                            <span className="material-symbols-outlined text-[36px] text-primary">
                                                cloud_upload
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[var(--color-text-main)]">
                                                Tarik dan lepas file Excel Anda di sini
                                            </p>
                                            <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                                Mendukung format file .xlsx dan .xls
                                            </p>
                                        </div>
                                        <div className="mt-2">
                                            <label className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary-hover hover:shadow-lg transition-all cursor-pointer">
                                                Pilih File Dari Komputer
                                                <input
                                                    type="file"
                                                    onChange={handleFileUpload}
                                                    accept=".xlsx, .xls"
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)] flex-shrink-0 rounded-b-3xl">
                            <button
                                onClick={handleCloseImportModal}
                                className="px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-primary-light)] text-primary border border-[var(--color-border-accent)] font-medium text-sm hover:bg-[var(--color-bg-hover)] hover:text-primary transition-colors cursor-pointer"
                            >
                                {importResult ? "Selesai" : "Batal"}
                            </button>
                            {!importResult && parsedData.length > 0 && (
                                <button
                                    onClick={handleImportSubmit}
                                    disabled={importLoading || parsedData.filter(p => p.status === "valid").length === 0}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {importLoading ? (
                                        <>
                                            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Sedang Mengimpor...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-[18px]">check</span>
                                            Impor {parsedData.filter(p => p.status === "valid").length} Kandidat Valid
                                        </>
                                    )}
                                </button>
                            )}
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
