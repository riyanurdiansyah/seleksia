"use client";

import { useState, useEffect } from "react";
import Breadcrumb from "../components/Breadcrumb";
import ReportModal from "../components/ReportModal";

interface UserReport {
    id: string;
    companyId: string | null;
    candidateId: string | null;
    reporterName: string;
    reporterEmail: string;
    category: string;
    subject: string;
    message: string;
    status: string;
    adminNote: string | null;
    createdAt: string;
    updatedAt: string;
    company?: { id: string; name: string; slug: string } | null;
    candidate?: { id: string; name: string; email: string; role: string } | null;
}

const CATEGORY_MAP: Record<string, { label: string; icon: string; bg: string }> = {
    bug: { label: "Bug / Teknis", icon: "bug_report", bg: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
    feature_request: { label: "Usulan Fitur", icon: "lightbulb", bg: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" },
    billing: { label: "Tagihan & Pembayaran", icon: "payments", bg: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
    general: { label: "Umum / Bantuan", icon: "help_outline", bg: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
};

const STATUS_MAP: Record<string, { label: string; bg: string }> = {
    pending: { label: "Pending", bg: "bg-amber-500 text-white" },
    in_progress: { label: "Dalam Proses", bg: "bg-blue-500 text-white" },
    resolved: { label: "Selesai", bg: "bg-emerald-500 text-white" },
    closed: { label: "Ditutup", bg: "bg-slate-500 text-white" },
};

export default function ReportsManagementPage() {
    const [reports, setReports] = useState<UserReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");

    // Modal state for viewing & responding to report
    const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editStatus, setEditStatus] = useState("pending");
    const [editAdminNote, setEditAdminNote] = useState("");
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        checkAccessAndFetch();
    }, []);

    const checkAccessAndFetch = async () => {
        const role = localStorage.getItem("candidateRole") || "user";
        try {
            const accessRes = await fetch(`/api/rbac/check?path=/reports&role=${role}`);
            if (accessRes.ok) {
                const accessData = await accessRes.json();
                if (!accessData.canRead && role !== "superadmin") {
                    setHasAccess(false);
                    setLoading(false);
                    return;
                }
            }
            await fetchReports();
        } catch (err) {
            console.error("Access check error:", err);
            setHasAccess(false);
            setLoading(false);
        }
    };

    const fetchReports = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/reports");
            if (res.ok) {
                const data = await res.json();
                setReports(data);
            } else {
                setHasAccess(false);
            }
        } catch (error) {
            console.error("Fetch reports error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDetail = (report: UserReport) => {
        setSelectedReport(report);
        setEditStatus(report.status);
        setEditAdminNote(report.adminNote || "");
    };

    const handleSaveReport = async () => {
        if (!selectedReport) return;

        setUpdating(true);
        try {
            const res = await fetch(`/api/reports/${selectedReport.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: editStatus,
                    adminNote: editAdminNote,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setReports(reports.map((r) => (r.id === selectedReport.id ? data.report : r)));
                setSelectedReport(null);
            } else {
                alert("Gagal mengupdate status laporan.");
            }
        } catch (error) {
            console.error("Update report error:", error);
            alert("Terjadi kesalahan saat mengupdate laporan.");
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteReport = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus laporan ini?")) return;

        try {
            const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
            if (res.ok) {
                setReports(reports.filter((r) => r.id !== id));
                if (selectedReport?.id === id) setSelectedReport(null);
            } else {
                alert("Gagal menghapus laporan.");
            }
        } catch (error) {
            console.error("Delete report error:", error);
        }
    };

    // Filter Logic
    const filteredReports = reports.filter((r) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            r.reporterName.toLowerCase().includes(query) ||
            r.reporterEmail.toLowerCase().includes(query) ||
            r.subject.toLowerCase().includes(query) ||
            r.message.toLowerCase().includes(query) ||
            (r.company?.name || "").toLowerCase().includes(query);

        const matchesStatus = statusFilter === "all" ? true : r.status === statusFilter;
        const matchesCategory = categoryFilter === "all" ? true : r.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesCategory;
    });

    const totalCount = reports.length;
    const pendingCount = reports.filter((r) => r.status === "pending").length;
    const inProgressCount = reports.filter((r) => r.status === "in_progress").length;
    const resolvedCount = reports.filter((r) => r.status === "resolved" || r.status === "closed").length;

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in space-y-4">
                <div className="size-16 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl">lock</span>
                </div>
                <h2 className="text-xl font-bold text-[var(--color-text-main)]">Akses Ditolak (Superadmin Only)</h2>
                <p className="text-xs text-[var(--color-text-sub)] max-w-md">
                    Halaman Manajemen Laporan User ini secara default hanya dapat diakses oleh pengguna dengan role Superadmin.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black text-[var(--color-text-main)] tracking-tight flex items-center gap-2">
                        <span>Laporan & Feedback User</span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                            Superadmin Panel
                        </span>
                    </h1>
                    <p className="text-xs text-[var(--color-text-sub)]">Pantau kendala teknis, pertanyaan, dan masukan fitur yang dikirimkan oleh pengguna aplikasi Seleksia.</p>
                    <Breadcrumb />
                </div>

                <div className="flex items-center gap-3 self-start md:self-auto">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all flex items-center gap-1.5 btn-press cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-base">add</span>
                        Buat Laporan Manual
                    </button>
                    <button
                        onClick={fetchReports}
                        className="px-4 py-2 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] hover:border-primary text-xs font-bold text-[var(--color-text-main)] transition-all flex items-center gap-1.5 btn-press"
                    >
                        <span className="material-symbols-outlined text-sm">refresh</span>
                        Refresh Data
                    </button>
                </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-5 rounded-3xl shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Total Laporan</span>
                        <div className="text-3xl font-black text-[var(--color-text-main)]">{totalCount}</div>
                    </div>
                    <div className="size-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">support_agent</span>
                    </div>
                </div>

                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-5 rounded-3xl shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Pending</span>
                        <div className="text-3xl font-black text-amber-600">{pendingCount}</div>
                    </div>
                    <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">hourglass_empty</span>
                    </div>
                </div>

                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-5 rounded-3xl shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Dalam Proses</span>
                        <div className="text-3xl font-black text-blue-600">{inProgressCount}</div>
                    </div>
                    <div className="size-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">engineering</span>
                    </div>
                </div>

                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-5 rounded-3xl shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Selesai</span>
                        <div className="text-3xl font-black text-emerald-600">{resolvedCount}</div>
                    </div>
                    <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">check_circle</span>
                    </div>
                </div>
            </div>

            {/* Filter & Controls Bar */}
            <div className="bg-[var(--color-bg-card)] p-4 rounded-3xl border border-[var(--color-border)] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-1 flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[240px]">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Cari subjek, pesan, pelapor, atau nama perusahaan..."
                            className="w-full h-10 pl-10 pr-4 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-primary transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        className="h-10 px-3.5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-main)] outline-none focus:border-primary"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Semua Status</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">Dalam Proses</option>
                        <option value="resolved">Selesai</option>
                        <option value="closed">Ditutup</option>
                    </select>

                    {/* Category Filter */}
                    <select
                        className="h-10 px-3.5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-main)] outline-none focus:border-primary"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="all">Semua Kategori</option>
                        <option value="bug">🐛 Bug / Teknis</option>
                        <option value="feature_request">💡 Usulan Fitur</option>
                        <option value="billing">💳 Tagihan & Pembayaran</option>
                        <option value="general">❓ Umum / Bantuan</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">
                                <th className="p-4 pl-6">Tanggal</th>
                                <th className="p-4">Pelapor & Perusahaan</th>
                                <th className="p-4">Kategori</th>
                                <th className="p-4">Subjek / Kendala</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 pr-6 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text-sub)]">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-[var(--color-text-muted)]">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            <span>Memuat laporan user...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredReports.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-[var(--color-text-muted)] italic">
                                        Belum ada laporan dari pengguna.
                                    </td>
                                </tr>
                            ) : (
                                filteredReports.map((report) => {
                                    const catInfo = CATEGORY_MAP[report.category] || CATEGORY_MAP.general;
                                    const statusInfo = STATUS_MAP[report.status] || STATUS_MAP.pending;

                                    return (
                                        <tr key={report.id} className="hover:bg-[var(--color-bg-hover)] transition-colors">
                                            <td className="p-4 pl-6 font-medium text-[var(--color-text-main)] whitespace-nowrap">
                                                {new Date(report.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                            </td>

                                            <td className="p-4">
                                                <div>
                                                    <span className="font-bold text-[var(--color-text-main)] block">{report.reporterName}</span>
                                                    <span className="text-[10px] text-[var(--color-text-muted)] block">{report.reporterEmail}</span>
                                                    {report.company && (
                                                        <span className="inline-block text-[9px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1">
                                                            🏢 {report.company.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold inline-flex items-center gap-1 ${catInfo.bg}`}>
                                                    <span className="material-symbols-outlined text-xs">{catInfo.icon}</span>
                                                    {catInfo.label}
                                                </span>
                                            </td>

                                            <td className="p-4">
                                                <div className="max-w-md">
                                                    <span className="font-bold text-[var(--color-text-main)] block line-clamp-1">{report.subject}</span>
                                                    <span className="text-[10px] text-[var(--color-text-muted)] block line-clamp-2 mt-0.5">{report.message}</span>
                                                </div>
                                            </td>

                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusInfo.bg}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </td>

                                            <td className="p-4 pr-6 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => handleOpenDetail(report)}
                                                        className="px-3 py-1.5 rounded-xl bg-primary text-white text-[11px] font-bold hover:shadow-md transition-all btn-press"
                                                    >
                                                        Detail & Tanggapi
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteReport(report.id)}
                                                        className="p-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 transition-colors"
                                                        title="Hapus Laporan"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail & Response Modal */}
            {selectedReport && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative animate-slide-in-up">
                        
                        <button
                            onClick={() => setSelectedReport(null)}
                            className="absolute right-5 top-5 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>

                        <div className="bg-gradient-to-br from-[#1A3C40] to-[#0c5c64] p-6 text-white">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Detail Laporan User #{selectedReport.id.slice(-6)}</span>
                            <h3 className="text-xl font-extrabold mt-1">{selectedReport.subject}</h3>
                            <div className="mt-3 flex items-center gap-3 text-xs text-emerald-100/80">
                                <span>Pelapor: <strong>{selectedReport.reporterName}</strong> ({selectedReport.reporterEmail})</span>
                                {selectedReport.company && <span>• Perusahaan: <strong>{selectedReport.company.name}</strong></span>}
                            </div>
                        </div>

                        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                            
                            {/* Message Box */}
                            <div>
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                    Isi Pesan Laporan
                                </label>
                                <div className="p-4 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] leading-relaxed whitespace-pre-wrap">
                                    {selectedReport.message}
                                </div>
                            </div>

                            {/* Status Selector */}
                            <div>
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-main)] mb-1.5">
                                    Update Status Penanganan
                                </label>
                                <select
                                    className="w-full h-10 px-3.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)] outline-none focus:border-primary"
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value)}
                                >
                                    <option value="pending">⏳ Pending (Belum Ditindaklanjuti)</option>
                                    <option value="in_progress">⚙️ Dalam Proses (Sedang Ditangani)</option>
                                    <option value="resolved">✅ Selesai (Telah Ditangani)</option>
                                    <option value="closed">🔒 Ditutup</option>
                                </select>
                            </div>

                            {/* Admin Resolution Note */}
                            <div>
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-main)] mb-1.5">
                                    Catatan / Tanggapan Admin (Admin Note)
                                </label>
                                <textarea
                                    rows={4}
                                    placeholder="Tuliskan catatan internal penyelesaian atau tindak lanjut tim Seleksia..."
                                    className="w-full p-3.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] outline-none focus:border-primary"
                                    value={editAdminNote}
                                    onChange={(e) => setEditAdminNote(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-[var(--color-bg-elevated)] border-t border-[var(--color-border)] flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => handleDeleteReport(selectedReport.id)}
                                className="px-4 py-2 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 text-xs font-bold hover:bg-red-100 transition-colors"
                            >
                                Hapus Laporan
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedReport(null)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--color-text-sub)] hover:text-[var(--color-text-main)]"
                                >
                                    Tutup
                                </button>
                                <button
                                    type="button"
                                    disabled={updating}
                                    onClick={handleSaveReport}
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold text-xs shadow-md shadow-primary/20 transition-all flex items-center gap-1.5 disabled:opacity-50 btn-press cursor-pointer"
                                >
                                    {updating ? (
                                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <span className="material-symbols-outlined text-base">save</span>
                                    )}
                                    Simpan Perubahan Status
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Manual Report Modal */}
            <ReportModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    fetchReports();
                }}
            />
        </div>
    );
}
