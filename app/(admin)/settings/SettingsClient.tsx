"use client";

import { useState, useEffect } from "react";
import Breadcrumb from "../components/Breadcrumb";

/* ===== Types ===== */
interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: "super_admin" | "admin" | "proctor";
    status: "active" | "inactive";
    lastLogin: string;
    createdAt: string;
}

/* ===== Mock Data ===== */
const initialAdmins: AdminUser[] = [
    {
        id: "ADM-001",
        name: "Admin User",
        email: "admin@seleksia.com",
        role: "super_admin",
        status: "active",
        lastLogin: "2026-02-28 10:30",
        createdAt: "2026-01-01",
    },
    {
        id: "ADM-002",
        name: "Dr. Emily Chen",
        email: "emily.chen@seleksia.com",
        role: "admin",
        status: "active",
        lastLogin: "2026-02-28 09:15",
        createdAt: "2026-01-15",
    },
    {
        id: "ADM-003",
        name: "Prof. James Wilson",
        email: "james.w@seleksia.com",
        role: "proctor",
        status: "active",
        lastLogin: "2026-02-27 14:00",
        createdAt: "2026-02-01",
    },
    {
        id: "ADM-004",
        name: "Sari Dewi",
        email: "sari.d@seleksia.com",
        role: "proctor",
        status: "inactive",
        lastLogin: "2026-02-20 08:45",
        createdAt: "2026-02-10",
    },
];

const roleConfig: Record<
    AdminUser["role"],
    { label: string; bg: string; text: string; icon: string }
> = {
    super_admin: {
        label: "Super Admin",
        bg: "bg-[var(--color-brand-navy)]/15",
        text: "text-[var(--color-brand-navy)]",
        icon: "shield",
    },
    admin: {
        label: "Admin",
        bg: "bg-[var(--color-primary-light)]",
        text: "text-primary",
        icon: "admin_panel_settings",
    },
    proctor: {
        label: "Proctor",
        bg: "bg-[var(--color-accent-light)]",
        text: "text-[var(--color-accent)]",
        icon: "supervisor_account",
    },
};

export default function SettingsClient() {
    const [activeTab, setActiveTab] = useState<"admins" | "email">("admins");
    const [admins, setAdmins] = useState(initialAdmins);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newAdmin, setNewAdmin] = useState({
        name: "",
        email: "",
        role: "admin" as AdminUser["role"],
        password: "",
    });

    /* SMTP settings state */
    const [useCustomSmtp, setUseCustomSmtp] = useState(false);
    const [smtpHost, setSmtpHost] = useState("");
    const [smtpPort, setSmtpPort] = useState("587");
    const [smtpUser, setSmtpUser] = useState("");
    const [smtpPass, setSmtpPass] = useState("");
    const [smtpSender, setSmtpSender] = useState("");
    const [testRecipient, setTestRecipient] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testStatus, setTestStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
    const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
    const [accordionOpen, setAccordionOpen] = useState<string | null>(null);

    /* Fetch SMTP settings on activeTab change */
    useEffect(() => {
        if (activeTab === "email") {
            setIsLoading(true);
            setSaveStatus(null);
            setTestStatus(null);
            fetch("/api/settings/email")
                .then(res => res.json())
                .then(res => {
                    if (res.success && res.data) {
                        setUseCustomSmtp(res.data.hasCustomSmtp);
                        setSmtpHost(res.data.smtpHost);
                        setSmtpPort(res.data.smtpPort ? String(res.data.smtpPort) : "587");
                        setSmtpUser(res.data.smtpUser);
                        setSmtpPass(res.data.smtpPass);
                        setSmtpSender(res.data.smtpSender);
                    }
                })
                .catch(err => console.error("Error loading SMTP settings:", err))
                .finally(() => setIsLoading(false));
        }
    }, [activeTab]);

    /* Save SMTP configuration */
    const handleSaveSmtp = async () => {
        setIsSaving(true);
        setSaveStatus(null);
        try {
            const res = await fetch("/api/settings/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    useCustomSmtp,
                    smtpHost,
                    smtpPort,
                    smtpUser,
                    smtpPass,
                    smtpSender,
                })
            });
            const data = await res.json();
            if (data.success) {
                setSaveStatus({ type: "success", msg: "Pengaturan SMTP berhasil disimpan." });
            } else {
                setSaveStatus({ type: "error", msg: data.error || "Gagal menyimpan pengaturan." });
            }
        } catch (err: any) {
            setSaveStatus({ type: "error", msg: "Terjadi kesalahan jaringan." });
        } finally {
            setIsSaving(false);
        }
    };

    /* Test SMTP connection */
    const handleTestSmtp = async () => {
        if (!testRecipient) {
            setTestStatus({ type: "error", msg: "Masukkan alamat email tujuan untuk uji coba." });
            return;
        }
        setIsTesting(true);
        setTestStatus(null);
        try {
            const res = await fetch("/api/settings/email/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    smtpHost,
                    smtpPort,
                    smtpUser,
                    smtpPass,
                    smtpSender,
                    targetEmail: testRecipient,
                })
            });
            const data = await res.json();
            if (data.success) {
                setTestStatus({ type: "success", msg: data.message || "Koneksi SMTP sukses! Email tes terkirim." });
            } else {
                setTestStatus({ type: "error", msg: data.error || "Gagal melakukan uji coba SMTP." });
            }
        } catch (err: any) {
            setTestStatus({ type: "error", msg: "Terjadi kesalahan jaringan saat melakukan test." });
        } finally {
            setIsTesting(false);
        }
    };

    /* Add admin */
    const handleAddAdmin = () => {
        if (!newAdmin.name || !newAdmin.email || !newAdmin.password) return;

        const nextId = `ADM-${String(admins.length + 1).padStart(3, "0")}`;
        const created: AdminUser = {
            id: nextId,
            name: newAdmin.name,
            email: newAdmin.email,
            role: newAdmin.role,
            status: "active",
            lastLogin: "—",
            createdAt: new Date().toISOString().split("T")[0],
        };
        setAdmins((prev) => [created, ...prev]);
        setNewAdmin({ name: "", email: "", role: "admin", password: "" });
        setShowAddModal(false);
    };

    /* Toggle status */
    const toggleStatus = (id: string) => {
        setAdmins((prev) =>
            prev.map((a) =>
                a.id === id
                    ? {
                        ...a,
                        status:
                            a.status === "active" ? "inactive" : "active",
                    }
                    : a
            )
        );
    };

    /* Delete admin */
    const handleDelete = (id: string) => {
        setAdmins((prev) => prev.filter((a) => a.id !== id));
    };

    return (
        <>
            {/* Page Header */}
            <div className="flex flex-col gap-4 animate-slide-in-up">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">
                            Settings
                        </h1>
                        <p className="text-sm text-[var(--color-text-sub)] mt-1 font-medium">
                            Manage admin accounts and system configuration.
                        </p>
                    </div>
                    <Breadcrumb />
                </div>
            </div>

            {/* Settings Tabs */}
            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] relative overflow-hidden transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]">
                <div className="card-shimmer" />
                <div className="border-b border-[var(--color-border)]">
                    <nav className="flex px-6 gap-6">
                        <button 
                            onClick={() => setActiveTab("admins")}
                            className={`py-3 border-b-2 font-medium text-sm transition-all ${
                                activeTab === "admins" ? "border-primary text-primary" : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                            }`}
                        >
                            Admin Accounts
                        </button>
                        <button 
                            onClick={() => setActiveTab("email")}
                            className={`py-3 border-b-2 font-medium text-sm transition-all ${
                                activeTab === "email" ? "border-primary text-primary" : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                            }`}
                        >
                            Email Server (SMTP)
                        </button>
                        <button className="py-3 border-b-2 border-transparent text-[var(--color-text-muted)] opacity-50 cursor-not-allowed font-medium text-sm">
                            General
                        </button>
                        <button className="py-3 border-b-2 border-transparent text-[var(--color-text-muted)] opacity-50 cursor-not-allowed font-medium text-sm">
                            Security
                        </button>
                        <button className="py-3 border-b-2 border-transparent text-[var(--color-text-muted)] opacity-50 cursor-not-allowed font-medium text-sm">
                            Notifications
                        </button>
                    </nav>
                </div>

                {/* Admin Accounts Section */}
                {activeTab === "admins" && (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-[var(--color-text-main)]">
                                    Admin Accounts
                                </h3>
                                <p className="text-sm text-[var(--color-text-sub)]">
                                    Manage who has access to the admin panel.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press btn-shine"
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    person_add
                                </span>
                                Add Admin
                            </button>
                        </div>

                        {/* Admin Cards */}
                        <div className="space-y-3">
                            {admins.map((admin) => {
                                const r = roleConfig[admin.role];
                                return (
                                    <div
                                        key={admin.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:translate-y-[-1px] hover:shadow-[var(--shadow-sm)] transition-all duration-[250ms]"
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Avatar */}
                                            <div
                                                className={`size-11 rounded-full flex items-center justify-center font-bold text-sm transition-all ${admin.status === "active"
                                                        ? "bg-gradient-to-br from-primary to-accent text-white shadow-[var(--shadow-sm)]"
                                                        : "bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]"
                                                    }`}
                                            >
                                                {admin.name
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")
                                                    .slice(0, 2)
                                                    .toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-[var(--color-text-main)]">
                                                        {admin.name}
                                                    </p>
                                                    {admin.status === "inactive" && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-[var(--color-text-sub)]">
                                                    {admin.email}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${r.bg} ${r.text}`}
                                                    >
                                                        <span className="material-symbols-outlined text-[12px]">
                                                            {r.icon}
                                                        </span>
                                                        {r.label}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--color-text-muted)]">
                                                        Last login: {admin.lastLogin}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 sm:flex-shrink-0">
                                            <button
                                                onClick={() =>
                                                    toggleStatus(admin.id)
                                                }
                                                className={`px-3 py-1.5 rounded-[var(--radius-xs)] text-xs font-medium transition-all btn-press ${admin.status === "active"
                                                        ? "bg-[var(--color-success-light)] text-[var(--color-success)] hover:shadow-[0_2px_8px_var(--color-success-glow)]"
                                                        : "bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]"
                                                    }`}
                                            >
                                                {admin.status === "active"
                                                    ? "Active"
                                                    : "Inactive"}
                                            </button>
                                            <button
                                                className="p-1.5 rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:text-amber-600 hover:bg-[var(--color-bg-hover)] transition-all btn-press"
                                                title="Edit"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">
                                                    edit
                                                </span>
                                            </button>
                                            {admin.role !== "super_admin" && (
                                                <button
                                                    onClick={() =>
                                                        handleDelete(admin.id)
                                                    }
                                                    className="p-1.5 rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-all btn-press"
                                                    title="Delete"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">
                                                        delete
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Email Server (SMTP) Section */}
                {activeTab === "email" && (
                    <div className="p-6 space-y-6">
                        {/* Title Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
                            <div>
                                <h3 className="text-lg font-bold text-[var(--color-text-main)]">
                                    Konfigurasi Email Server (SMTP)
                                </h3>
                                <p className="text-sm text-[var(--color-text-sub)]">
                                    Atur pengiriman email undangan ujian peserta menggunakan server email (SMTP) perusahaan Anda sendiri.
                                </p>
                            </div>
                            
                            {/* Toggle Switch */}
                            <div className="flex items-center gap-3 bg-[var(--color-bg-elevated)] px-4 py-2 rounded-xl border border-[var(--color-border)]">
                                <span className="text-xs font-bold text-[var(--color-text-sub)]">Aktifkan SMTP Kustom</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={useCustomSmtp}
                                        onChange={(e) => setUseCustomSmtp(e.target.checked)}
                                    />
                                    <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 text-sm text-[var(--color-text-muted)]">
                                <span className="material-symbols-outlined animate-spin text-3xl text-primary">autorenew</span>
                                Memuat konfigurasi...
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Form SMTP */}
                                <div className={`lg:col-span-2 space-y-4 transition-opacity duration-200 ${useCustomSmtp ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                                SMTP Host *
                                            </label>
                                            <input
                                                value={smtpHost}
                                                onChange={(e) => setSmtpHost(e.target.value)}
                                                disabled={!useCustomSmtp}
                                                className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all outline-none"
                                                placeholder="e.g. smtp.gmail.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                                SMTP Port *
                                            </label>
                                            <input
                                                value={smtpPort}
                                                onChange={(e) => setSmtpPort(e.target.value)}
                                                disabled={!useCustomSmtp}
                                                className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all outline-none"
                                                placeholder="e.g. 587 atau 465"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                                Email / Username SMTP *
                                            </label>
                                            <input
                                                value={smtpUser}
                                                onChange={(e) => setSmtpUser(e.target.value)}
                                                disabled={!useCustomSmtp}
                                                className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all outline-none"
                                                placeholder="e.g. recruitment@company.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                                Password / App Password *
                                            </label>
                                            <input
                                                value={smtpPass}
                                                onChange={(e) => setSmtpPass(e.target.value)}
                                                disabled={!useCustomSmtp}
                                                type="password"
                                                className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all outline-none"
                                                placeholder="Masukkan password atau token aplikasi"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                            Nama Pengirim (Display Name) *
                                        </label>
                                        <input
                                            value={smtpSender}
                                            onChange={(e) => setSmtpSender(e.target.value)}
                                            disabled={!useCustomSmtp}
                                            className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all outline-none"
                                            placeholder="e.g. HRD PT Seleksia Mandiri"
                                        />
                                        <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5 font-medium">
                                            Nama ini akan muncul sebagai pengirim email di inbox peserta ujian.
                                        </p>
                                    </div>

                                    {saveStatus && (
                                        <div className={`p-3.5 rounded-[var(--radius-sm)] text-xs font-semibold flex items-center gap-2 ${
                                            saveStatus.type === "success" ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                                        }`}>
                                            <span className="material-symbols-outlined text-[18px]">
                                                {saveStatus.type === "success" ? "check_circle" : "error"}
                                            </span>
                                            {saveStatus.msg}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 pt-3">
                                        <button
                                            onClick={handleSaveSmtp}
                                            disabled={isSaving || (useCustomSmtp && (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpSender))}
                                            className="px-5 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press btn-shine disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {isSaving ? (
                                                <>
                                                    <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span>
                                                    Menyimpan...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-[18px]">save</span>
                                                    Simpan Pengaturan
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Petunjuk & Test Connection */}
                                <div className="space-y-5">
                                    {/* Test Connection Box */}
                                    <div className="p-5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] space-y-3.5 shadow-sm">
                                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-main)] flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[18px] text-primary">verified</span>
                                            Uji Coba Koneksi
                                        </h4>
                                        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-medium">
                                            Kirim email tes ke alamat email tujuan untuk memastikan kredensial SMTP Anda bekerja sebelum disimpan.
                                        </p>
                                        <div className="space-y-2">
                                            <input
                                                value={testRecipient}
                                                onChange={(e) => setTestRecipient(e.target.value)}
                                                type="email"
                                                className="w-full h-9 px-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary outline-none transition-all"
                                                placeholder="email-tujuan@gmail.com"
                                            />
                                            <button
                                                onClick={handleTestSmtp}
                                                disabled={isTesting || !testRecipient || !smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpSender}
                                                className="w-full py-2 rounded-lg bg-[var(--color-primary-light)] text-primary border border-[var(--color-border-accent)] hover:bg-[var(--color-bg-hover)] text-xs font-bold transition-all btn-press disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                            >
                                                {isTesting ? (
                                                    <>
                                                        <span className="material-symbols-outlined animate-spin text-[15px]">autorenew</span>
                                                        Mengirim...
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-[15px]">send</span>
                                                        Kirim Email Uji Coba
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {testStatus && (
                                            <div className={`p-2.5 rounded-lg text-[10px] font-semibold flex items-start gap-1.5 ${
                                                testStatus.type === "success" ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                                            }`}>
                                                <span className="material-symbols-outlined text-[15px] flex-shrink-0">
                                                    {testStatus.type === "success" ? "check_circle" : "error"}
                                                </span>
                                                <span className="leading-tight">{testStatus.msg}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Accordion Petunjuk */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-muted)] pl-1">
                                            Panduan Koneksi SMTP
                                        </h4>
                                        
                                        {/* Accordion Gmail */}
                                        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-bg-elevated)]">
                                            <button 
                                                onClick={() => setAccordionOpen(accordionOpen === "gmail" ? null : "gmail")}
                                                className="w-full p-3 text-left text-xs font-bold text-[var(--color-text-main)] flex items-center justify-between hover:bg-[var(--color-bg-hover)] transition-all"
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-red-500 text-[18px]">mail</span>
                                                    Cara Koneksi Gmail / G-Suite
                                                </span>
                                                <span className="material-symbols-outlined text-[16px]">
                                                    {accordionOpen === "gmail" ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                                                </span>
                                            </button>
                                            {accordionOpen === "gmail" && (
                                                <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-bg-card)] text-[11px] text-[var(--color-text-sub)] space-y-2 leading-relaxed">
                                                    <p>Agar Gmail Anda bisa digunakan untuk SMTP, Anda wajib membuat <strong>App Password (Sandi Aplikasi)</strong>:</p>
                                                    <ol className="list-decimal pl-4 space-y-1 font-medium">
                                                        <li>Buka Akun Google Anda (<a href="https://myaccount.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">myaccount.google.com</a>).</li>
                                                        <li>Masuk ke menu <strong>Keamanan (Security)</strong>.</li>
                                                        <li>Aktifkan <strong>Verifikasi 2 Langkah (2-Step Verification)</strong> jika belum aktif.</li>
                                                        <li>Cari dan klik menu <strong>Sandi Aplikasi (App Passwords)</strong> di bagian bawah halaman Keamanan.</li>
                                                        <li>Masukkan nama aplikasi (misal: "Seleksia") lalu klik <strong>Buat (Create)</strong>.</li>
                                                        <li>Salin kode 16 digit kuning yang muncul. <strong>Gunakan kode ini sebagai Password SMTP Anda</strong>.</li>
                                                    </ol>
                                                    <div className="mt-2 pt-2 border-t border-dashed border-[var(--color-border)] space-y-1">
                                                        <p><strong>Rincian SMTP Gmail:</strong></p>
                                                        <p>• Host: <code className="bg-[var(--color-bg-elevated)] px-1 rounded">smtp.gmail.com</code></p>
                                                        <p>• Port TLS: <code className="bg-[var(--color-bg-elevated)] px-1 rounded">587</code> (atau SSL: <code className="bg-[var(--color-bg-elevated)] px-1 rounded">465</code>)</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Accordion Default Port */}
                                        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-bg-elevated)]">
                                            <button 
                                                onClick={() => setAccordionOpen(accordionOpen === "ports" ? null : "ports")}
                                                className="w-full p-3 text-left text-xs font-bold text-[var(--color-text-main)] flex items-center justify-between hover:bg-[var(--color-bg-hover)] transition-all"
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-blue-500 text-[18px]">dns</span>
                                                    Provider Lain & Port Default
                                                </span>
                                                <span className="material-symbols-outlined text-[16px]">
                                                    {accordionOpen === "ports" ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                                                </span>
                                            </button>
                                            {accordionOpen === "ports" && (
                                                <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-bg-card)] text-[11px] text-[var(--color-text-sub)] space-y-2 leading-relaxed">
                                                    <p><strong>Microsoft Outlook / Office 365:</strong></p>
                                                    <p>• Host: <code className="bg-[var(--color-bg-elevated)] px-1 rounded">smtp.office365.com</code></p>
                                                    <p>• Port: <code className="bg-[var(--color-bg-elevated)] px-1 rounded">587</code></p>
                                                    
                                                    <p className="mt-2"><strong>Yahoo Mail:</strong></p>
                                                    <p>• Host: <code className="bg-[var(--color-bg-elevated)] px-1 rounded">smtp.mail.yahoo.com</code></p>
                                                    <p>• Port: <code className="bg-[var(--color-bg-elevated)] px-1 rounded">465</code> atau <code className="bg-[var(--color-bg-elevated)] px-1 rounded">587</code> (butuh sandi aplikasi Yahoo)</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add Admin Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-[8px] z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0"
                        onClick={() => setShowAddModal(false)}
                    />
                    {/* Modal */}
                    <div className="relative w-full max-w-md bg-[var(--color-bg-card)] rounded-3xl border border-[var(--color-border-strong)] shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-slide-in-up">
                        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[var(--color-primary-light)] rounded-[var(--radius-sm)] text-primary">
                                    <span className="material-symbols-outlined">
                                        admin_panel_settings
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--color-text-main)]">
                                        Add Admin Account
                                    </h3>
                                    <p className="text-xs text-[var(--color-text-sub)]">
                                        Create a new admin or proctor account
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-1.5 rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-main)] transition-all btn-press"
                            >
                                <span className="material-symbols-outlined">
                                    close
                                </span>
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                    Full Name *
                                </label>
                                <input
                                    value={newAdmin.name}
                                    onChange={(e) =>
                                        setNewAdmin((prev) => ({
                                            ...prev,
                                            name: e.target.value,
                                        }))
                                    }
                                    className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] focus:bg-[var(--color-bg-card)] focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] focus:translate-y-[-1px] transition-all duration-300"
                                    placeholder="e.g. Dr. John Smith"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                    Email *
                                </label>
                                <input
                                    value={newAdmin.email}
                                    onChange={(e) =>
                                        setNewAdmin((prev) => ({
                                            ...prev,
                                            email: e.target.value,
                                        }))
                                    }
                                    className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] focus:bg-[var(--color-bg-card)] focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] focus:translate-y-[-1px] transition-all duration-300"
                                    placeholder="e.g. john@seleksia.com"
                                    type="email"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                    Password *
                                </label>
                                <input
                                    value={newAdmin.password}
                                    onChange={(e) =>
                                        setNewAdmin((prev) => ({
                                            ...prev,
                                            password: e.target.value,
                                        }))
                                    }
                                    className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] focus:bg-[var(--color-bg-card)] focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] focus:translate-y-[-1px] transition-all duration-300"
                                    placeholder="Minimum 8 characters"
                                    type="password"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                    Role
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(
                                        [
                                            "super_admin",
                                            "admin",
                                            "proctor",
                                        ] as const
                                    ).map((role) => {
                                        const rc = roleConfig[role];
                                        const selected = newAdmin.role === role;
                                        return (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() =>
                                                    setNewAdmin((prev) => ({
                                                        ...prev,
                                                        role,
                                                    }))
                                                }
                                                className={`flex flex-col items-center gap-1 p-3 rounded-[var(--radius-sm)] border-2 text-xs font-medium transition-all btn-press ${selected
                                                        ? "border-primary bg-[var(--color-primary-light)] text-primary shadow-[0_2px_8px_var(--color-primary-glow)]"
                                                        : "border-[var(--color-border)] text-[var(--color-text-sub)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-hover)]"
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-[20px]">
                                                    {rc.icon}
                                                </span>
                                                {rc.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-4 bg-[var(--color-bg-elevated)] border-t border-[var(--color-border)] rounded-b-3xl">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-primary-light)] text-primary border border-[var(--color-border-accent)] font-medium text-sm hover:bg-[var(--color-bg-hover)] transition-all btn-press"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddAdmin}
                                disabled={
                                    !newAdmin.name ||
                                    !newAdmin.email ||
                                    !newAdmin.password
                                }
                                className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press btn-shine disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    check
                                </span>
                                Create Account
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
