"use client";

import React, { useState, useEffect, Fragment } from "react";
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

import { 
    CustomScoringConfig, 
    PRESET_SCORING_SCHEMES, 
    ScoringBand, 
    StatusBand,
    DEFAULT_STATUS_BANDS,
    RecommendationRule, 
    GatekeeperRule 
} from "@/lib/competencyScoring";

export default function SettingsClient() {
    const [activeTab, setActiveTab] = useState<"email" | "scoring">("email");
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
    const [companyPhone, setCompanyPhone] = useState("");
    const [companySlug, setCompanySlug] = useState("");
    const [companyEmail, setCompanyEmail] = useState("");
    const [testRecipient, setTestRecipient] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testStatus, setTestStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
    const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
    const [accordionOpen, setAccordionOpen] = useState<string | null>(null);

    /* Company Scoring Scheme State */
    const [companyScoring, setCompanyScoring] = useState<CustomScoringConfig>(PRESET_SCORING_SCHEMES["5_tier_sales"]);
    const [selectedPreset, setSelectedPreset] = useState<string>("5_tier_sales");
    const [isScoringLoading, setIsScoringLoading] = useState(false);
    const [isScoringSaving, setIsScoringSaving] = useState(false);
    const [scoringSaveStatus, setScoringSaveStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

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
                        setCompanyPhone(res.data.phone || "");
                        setCompanySlug(res.data.slug || "");
                        setCompanyEmail(res.data.companyEmail || "");
                    }
                })
                .catch(err => console.error("Error loading SMTP settings:", err))
                .finally(() => setIsLoading(false));
        } else if (activeTab === "scoring") {
            setIsScoringLoading(true);
            setScoringSaveStatus(null);
            fetch("/api/settings/scoring")
                .then(res => res.json())
                .then(res => {
                    if (res.success && res.data?.scoringConfig) {
                        const cfg = res.data.scoringConfig;
                        if (!cfg.statusBands || cfg.statusBands.length === 0) {
                            cfg.statusBands = JSON.parse(JSON.stringify(DEFAULT_STATUS_BANDS));
                        }
                        setCompanyScoring(cfg);
                    }
                })
                .catch(err => console.error("Error loading company scoring:", err))
                .finally(() => setIsScoringLoading(false));
        }
    }, [activeTab]);

    /* Apply Preset to Company Scheme */
    const handleApplyPreset = (presetKey: string) => {
        const preset = PRESET_SCORING_SCHEMES[presetKey];
        if (preset) {
            setSelectedPreset(presetKey);
            setCompanyScoring(JSON.parse(JSON.stringify(preset)));
        }
    };

    /* Save Company Scoring Scheme */
    const handleSaveCompanyScoring = async () => {
        setIsScoringSaving(true);
        setScoringSaveStatus(null);
        try {
            const res = await fetch("/api/settings/scoring", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scoringConfig: companyScoring })
            });
            const data = await res.json();
            if (data.success) {
                setScoringSaveStatus({ type: "success", msg: "Skema penilaian default perusahaan berhasil disimpan dan akan diwariskan ke seluruh tes!" });
            } else {
                setScoringSaveStatus({ type: "error", msg: data.error || "Gagal menyimpan skema penilaian." });
            }
        } catch (err: any) {
            setScoringSaveStatus({ type: "error", msg: "Terjadi kesalahan jaringan." });
        } finally {
            setIsScoringSaving(false);
        }
    };



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
                    phone: companyPhone,
                })
            });
            const data = await res.json();
            if (data.success) {
                setSaveStatus({ type: "success", msg: "Pengaturan email & kontak perusahaan berhasil disimpan." });
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
                            Manage email server and default scoring rules.
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
                            onClick={() => setActiveTab("email")}
                            className={`py-3 border-b-2 font-medium text-sm transition-all flex items-center gap-2 ${
                                activeTab === "email" ? "border-primary text-primary" : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                            }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">mail</span>
                            Email Server (SMTP)
                        </button>
                        <button 
                            onClick={() => setActiveTab("scoring")}
                            className={`py-3 border-b-2 font-medium text-sm transition-all flex items-center gap-2 ${
                                activeTab === "scoring" ? "border-primary text-primary" : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                            }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">tune</span>
                            Default Scoring Scheme
                        </button>
                    </nav>
                </div>

                {/* Email Server (SMTP) Section */}
                {activeTab === "email" && (
                    <div className="p-6 space-y-6">
                        {/* Company Contact & Email Info Section */}
                        <div className="bg-primary/5 border border-primary/20 rounded-[var(--radius-md)] p-5 space-y-4">
                            <div className="flex items-center gap-2.5">
                                <span className="material-symbols-outlined text-primary text-[22px]">contact_support</span>
                                <div>
                                    <h4 className="text-sm font-bold text-[var(--color-text-main)]">Kontak & Identitas Perusahaan</h4>
                                    <p className="text-xs text-[var(--color-text-sub)]">Informasi ini akan disisipkan secara dinamis ke dalam template email undangan peserta.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                        Email Resmi Perusahaan (Slug Domain)
                                    </label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={companyEmail || (companySlug ? `${companySlug}@seleksia.com` : "support@seleksia.com")}
                                        className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-card)] border border-[var(--color-border)] text-sm font-mono font-bold text-primary cursor-not-allowed outline-none"
                                    />
                                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-medium">
                                        Gunakan variabel <code className="bg-[var(--color-bg-elevated)] px-1 py-0.5 rounded font-bold text-primary">{"{{company_email}}"}</code> di template.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                        No. Telepon / WhatsApp Bantuan (CS)
                                    </label>
                                    <input
                                        type="text"
                                        value={companyPhone}
                                        onChange={(e) => setCompanyPhone(e.target.value)}
                                        placeholder="Cth: 0812-3456-7890 / +6281234567890"
                                        className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all outline-none"
                                    />
                                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-medium">
                                        Gunakan variabel <code className="bg-[var(--color-bg-elevated)] px-1 py-0.5 rounded font-bold text-primary">{"{{company_phone}}"}</code> di template.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Title Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5 pt-2">
                            <div>
                                <h3 className="text-lg font-bold text-[var(--color-text-main)]">
                                    Konfigurasi Email Server (SMTP)
                                </h3>
                                <p className="text-sm text-[var(--color-text-sub)]">
                                    Atur pengiriman email undangan ujian peserta menggunakan server email (SMTP) perusahaan Anda sendiri (Opsional).
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

                {/* Default Scoring Scheme Section */}
                {activeTab === "scoring" && (
                    <div className="p-6 space-y-6 animate-fade-in">
                        {isScoringLoading ? (
                            <div className="flex items-center justify-center py-16 text-[var(--color-text-muted)] gap-2">
                                <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                                <span className="text-sm font-medium">Memuat skema penilaian perusahaan...</span>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Header & Presets Bar */}
                                <div className="bg-primary/5 border border-primary/20 rounded-[var(--radius-md)] p-5 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <span className="material-symbols-outlined text-primary text-[24px]">tune</span>
                                            <div>
                                                <h4 className="text-sm font-bold text-[var(--color-text-main)]">Skema Penilaian Default Perusahaan</h4>
                                                <p className="text-xs text-[var(--color-text-sub)]">
                                                    Standar ini otomatis berlaku ke seluruh tes online yang diselenggarakan perusahaan Anda, kecuali jika tes tersebut diatur secara khusus.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold text-[var(--color-text-sub)]">Preset Cepat:</span>
                                            <button
                                                type="button"
                                                onClick={() => handleApplyPreset("5_tier_sales")}
                                                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all border ${selectedPreset === "5_tier_sales" ? "bg-primary text-white border-primary shadow-xs" : "bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)] border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]"}`}
                                            >
                                                🎯 5-Tier Standard
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleApplyPreset("3_tier_simple")}
                                                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all border ${selectedPreset === "3_tier_simple" ? "bg-primary text-white border-primary shadow-xs" : "bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)] border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]"}`}
                                            >
                                                📊 3-Tier Simple
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleApplyPreset("academic_grade")}
                                                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all border ${selectedPreset === "academic_grade" ? "bg-primary text-white border-primary shadow-xs" : "bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)] border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]"}`}
                                            >
                                                🏆 Academic Grade (A-E)
                                            </button>
                                        </div>
                                    </div>

                                    {/* Scheme Name */}
                                    <div className="pt-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Nama Standar Penilaian Perusahaan</label>
                                        <input
                                            type="text"
                                            value={companyScoring.schemeName || ""}
                                            onChange={(e) => setCompanyScoring(prev => ({ ...prev, schemeName: e.target.value }))}
                                            placeholder="e.g. Standard Penilaian Talent Acquisition 2026"
                                            className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Section 1: Score Category Bands */}
                                <div className="p-5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-main)] flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[18px] text-amber-500">category</span>
                                                1. Rentang Nilai & Kategori Grade (Score Bands)
                                            </h4>
                                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed mt-0.5">
                                                Tentukan klasifikasi nilai total 0-100% dan penamaan kategori kelulusan perusahaan.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCompanyScoring(prev => ({
                                                    ...prev,
                                                    bands: [...(prev.bands || []), { min: 0, max: 50, label: "CUSTOM GRADE", description: "" }]
                                                }));
                                            }}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold bg-[var(--color-primary-light)] text-primary hover:bg-primary hover:text-white transition-all border border-primary/20"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">add</span>
                                            Tambah Rentang
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-[var(--color-border)] text-[11px] font-bold uppercase text-[var(--color-text-muted)] bg-[var(--color-bg-card)]">
                                                    <th className="p-2.5 w-24">Min (%)</th>
                                                    <th className="p-2.5 w-24">Max (%)</th>
                                                    <th className="p-2.5 w-48">Nama Label Kategori</th>
                                                    <th className="p-2.5">Deskripsi / Keterangan</th>
                                                    <th className="p-2.5 w-16 text-center">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(companyScoring.bands || []).map((band, idx) => (
                                                    <tr key={idx} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors">
                                                        <td className="p-2">
                                                            <input
                                                                type="number"
                                                                value={band.min}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    setCompanyScoring(prev => {
                                                                        const newBands = [...(prev.bands || [])];
                                                                        newBands[idx] = { ...newBands[idx], min: val };
                                                                        return { ...prev, bands: newBands };
                                                                    });
                                                                }}
                                                                className="w-full h-8 px-2 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)] text-center font-mono"
                                                                min="0"
                                                                max="100"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="number"
                                                                value={band.max}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    setCompanyScoring(prev => {
                                                                        const newBands = [...(prev.bands || [])];
                                                                        newBands[idx] = { ...newBands[idx], max: val };
                                                                        return { ...prev, bands: newBands };
                                                                    });
                                                                }}
                                                                className="w-full h-8 px-2 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)] text-center font-mono"
                                                                min="0"
                                                                max="100"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="text"
                                                                value={band.label}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setCompanyScoring(prev => {
                                                                        const newBands = [...(prev.bands || [])];
                                                                        newBands[idx] = { ...newBands[idx], label: val };
                                                                        return { ...prev, bands: newBands };
                                                                    });
                                                                }}
                                                                className="w-full h-8 px-2.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)]"
                                                                placeholder="e.g. VERY HIGH"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="text"
                                                                value={band.description || ""}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setCompanyScoring(prev => {
                                                                        const newBands = [...(prev.bands || [])];
                                                                        newBands[idx] = { ...newBands[idx], description: val };
                                                                        return { ...prev, bands: newBands };
                                                                    });
                                                                }}
                                                                className="w-full h-8 px-2.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs text-[var(--color-text-sub)]"
                                                                placeholder="Keterangan kategori..."
                                                            />
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setCompanyScoring(prev => ({
                                                                        ...prev,
                                                                        bands: (prev.bands || []).filter((_, i) => i !== idx)
                                                                    }));
                                                                }}
                                                                className="p-1 rounded text-[var(--color-text-muted)] hover:text-danger hover:bg-[var(--color-danger-light)] transition-colors"
                                                                title="Hapus Baris"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Section 2: Competency Status Rules */}
                                <div className="p-5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-main)] flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[18px] text-blue-500">stars</span>
                                                2. Aturan Status Tingkat Perkembangan (Competency Status)
                                            </h4>
                                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed mt-0.5">
                                                Atur status dan rentang skor untuk status perkembangan kompetensi (misal: Key Strength, Strength, Adequate, Development Area, Critical Development).
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCompanyScoring(prev => ({
                                                    ...prev,
                                                    statusBands: [...(prev.statusBands || DEFAULT_STATUS_BANDS), { min: 0, max: 59, label: "Critical Development", description: "Area kritis membutuhkan pengembangan.", color: "rose" }]
                                                }));
                                            }}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold bg-[var(--color-primary-light)] text-primary hover:bg-primary hover:text-white transition-all border border-primary/20"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">add</span>
                                            Tambah Baris
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-[var(--color-border)] text-[11px] font-bold uppercase text-[var(--color-text-muted)] bg-[var(--color-bg-card)]">
                                                    <th className="p-2.5 w-24">Min (%)</th>
                                                    <th className="p-2.5 w-24">Max (%)</th>
                                                    <th className="p-2.5 w-52">Label Status</th>
                                                    <th className="p-2.5">Keterangan Status</th>
                                                    <th className="p-2.5 w-16 text-center">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(companyScoring.statusBands || DEFAULT_STATUS_BANDS).map((sBand, idx) => (
                                                    <tr key={idx} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors">
                                                        <td className="p-2">
                                                            <input
                                                                type="number"
                                                                value={sBand.min}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    setCompanyScoring(prev => {
                                                                        const newBands = [...(prev.statusBands || DEFAULT_STATUS_BANDS)];
                                                                        newBands[idx] = { ...newBands[idx], min: val };
                                                                        return { ...prev, statusBands: newBands };
                                                                    });
                                                                }}
                                                                className="w-full h-8 px-2 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)] text-center font-mono"
                                                                min="0"
                                                                max="100"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="number"
                                                                value={sBand.max}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    setCompanyScoring(prev => {
                                                                        const newBands = [...(prev.statusBands || DEFAULT_STATUS_BANDS)];
                                                                        newBands[idx] = { ...newBands[idx], max: val };
                                                                        return { ...prev, statusBands: newBands };
                                                                    });
                                                                }}
                                                                className="w-full h-8 px-2 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)] text-center font-mono"
                                                                min="0"
                                                                max="100"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="text"
                                                                value={sBand.label}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setCompanyScoring(prev => {
                                                                        const newBands = [...(prev.statusBands || DEFAULT_STATUS_BANDS)];
                                                                        newBands[idx] = { ...newBands[idx], label: val };
                                                                        return { ...prev, statusBands: newBands };
                                                                    });
                                                                }}
                                                                className="w-full h-8 px-2.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)]"
                                                                placeholder="e.g. Key Strength"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="text"
                                                                value={sBand.description || ""}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setCompanyScoring(prev => {
                                                                        const newBands = [...(prev.statusBands || DEFAULT_STATUS_BANDS)];
                                                                        newBands[idx] = { ...newBands[idx], description: val };
                                                                        return { ...prev, statusBands: newBands };
                                                                    });
                                                                }}
                                                                className="w-full h-8 px-2.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs text-[var(--color-text-sub)]"
                                                                placeholder="Keterangan status..."
                                                            />
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setCompanyScoring(prev => ({
                                                                        ...prev,
                                                                        statusBands: (prev.statusBands || DEFAULT_STATUS_BANDS).filter((_, i) => i !== idx)
                                                                    }));
                                                                }}
                                                                className="p-1 rounded text-[var(--color-text-muted)] hover:text-danger hover:bg-[var(--color-danger-light)] transition-colors"
                                                                title="Hapus Baris"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Section 3: Hiring Recommendations Rules */}
                                <div className="p-5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-main)] flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[18px] text-emerald-500">verified</span>
                                                3. Aturan Rekomendasi Hiring Default
                                            </h4>
                                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed mt-0.5">
                                                Tentukan standar kelulusan kandidat (Overall Score) yang diterapkan secara default.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCompanyScoring(prev => ({
                                                    ...prev,
                                                    recommendations: [...(prev.recommendations || []), { type: "CUSTOM", label: "Disarankan", minOverallScore: 70, description: "" }]
                                                }));
                                            }}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold bg-[var(--color-primary-light)] text-primary hover:bg-primary hover:text-white transition-all border border-primary/20"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">add</span>
                                            Tambah Aturan
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-[var(--color-border)] text-[11px] font-bold uppercase text-[var(--color-text-muted)] bg-[var(--color-bg-card)]">
                                                    <th className="p-2.5 w-28">Min Score (%)</th>
                                                    <th className="p-2.5 w-60">Label Rekomendasi</th>
                                                    <th className="p-2.5">Penjelasan / Rationale</th>
                                                    <th className="p-2.5 w-16 text-center">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(companyScoring.recommendations || []).map((rec, idx) => (
                                                    <tr key={idx} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors">
                                                        <td className="p-2">
                                                            <input
                                                                type="number"
                                                                value={rec.minOverallScore}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    setCompanyScoring(prev => {
                                                                        const newRecs = [...(prev.recommendations || [])];
                                                                        newRecs[idx] = { ...newRecs[idx], minOverallScore: val };
                                                                        return { ...prev, recommendations: newRecs };
                                                                    });
                                                                }}
                                                                className="w-full h-8 px-2 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)] text-center font-mono"
                                                                min="0"
                                                                max="100"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="text"
                                                                value={rec.label}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setCompanyScoring(prev => {
                                                                        const newRecs = [...(prev.recommendations || [])];
                                                                        newRecs[idx] = { ...newRecs[idx], label: val };
                                                                        return { ...prev, recommendations: newRecs };
                                                                    });
                                                                }}
                                                                className="w-full h-8 px-2.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)]"
                                                                placeholder="e.g. Recommended"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="text"
                                                                value={rec.description || ""}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setCompanyScoring(prev => {
                                                                        const newRecs = [...(prev.recommendations || [])];
                                                                        newRecs[idx] = { ...newRecs[idx], description: val };
                                                                        return { ...prev, recommendations: newRecs };
                                                                    });
                                                                }}
                                                                className="w-full h-8 px-2.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs text-[var(--color-text-sub)]"
                                                                placeholder="Alasan / tindak lanjut rekomendasi..."
                                                            />
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setCompanyScoring(prev => ({
                                                                        ...prev,
                                                                        recommendations: (prev.recommendations || []).filter((_, i) => i !== idx)
                                                                    }));
                                                                }}
                                                                className="p-1 rounded text-[var(--color-text-muted)] hover:text-danger hover:bg-[var(--color-danger-light)] transition-colors"
                                                                title="Hapus Aturan"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Section 4: Gatekeeper Rules */}
                                <div className="p-5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-main)] flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[18px] text-purple-500">policy</span>
                                                4. Syarat Mutlak Perusahaan (Gatekeeper Rules)
                                            </h4>
                                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed mt-0.5">
                                                Kompetensi mutlak yang harus lulus di semua tes asesmen perusahaan Anda.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCompanyScoring(prev => ({
                                                    ...prev,
                                                    gatekeepers: [...(prev.gatekeepers || []), { competency: "Integrity", minScore: 80, action: "DEEP_DIVE", actionLabel: "Wawancara Khusus" }]
                                                }));
                                            }}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold bg-[var(--color-primary-light)] text-primary hover:bg-primary hover:text-white transition-all border border-primary/20"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">add</span>
                                            Tambah Gatekeeper
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-[var(--color-border)] text-[11px] font-bold uppercase text-[var(--color-text-muted)] bg-[var(--color-bg-card)]">
                                                    <th className="p-2.5 w-60">Nama Kompetensi Kunci</th>
                                                    <th className="p-2.5 w-28">Batas Min (%)</th>
                                                    <th className="p-2.5">Status / Aksi Jika Gagal (Custom Name)</th>
                                                    <th className="p-2.5 w-16 text-center">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(companyScoring.gatekeepers || []).map((gate, idx) => (
                                                    <tr key={idx} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors">
                                                        <td className="p-2">
                                                            <input
                                                                type="text"
                                                                value={gate.competency}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setCompanyScoring(prev => {
                                                                        const newGates = [...(prev.gatekeepers || [])];
                                                                        newGates[idx] = { ...newGates[idx], competency: val };
                                                                        return { ...prev, gatekeepers: newGates };
                                                                    });
                                                                }}
                                                                className="w-full h-8 px-2.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)]"
                                                                placeholder="e.g. Integrity, Compliance"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="number"
                                                                value={gate.minScore}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    setCompanyScoring(prev => {
                                                                        const newGates = [...(prev.gatekeepers || [])];
                                                                        newGates[idx] = { ...newGates[idx], minScore: val };
                                                                        return { ...prev, gatekeepers: newGates };
                                                                    });
                                                                }}
                                                                className="w-full h-8 px-2 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)] text-center font-mono"
                                                                min="0"
                                                                max="100"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="text"
                                                                value={gate.actionLabel || ""}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setCompanyScoring(prev => {
                                                                        const newGates = [...(prev.gatekeepers || [])];
                                                                        newGates[idx] = { ...newGates[idx], actionLabel: val };
                                                                        return { ...prev, gatekeepers: newGates };
                                                                    });
                                                                }}
                                                                className="w-full h-8 px-2.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-main)]"
                                                                placeholder="e.g. Wawancara Khusus / Review Lanjutan"
                                                            />
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setCompanyScoring(prev => ({
                                                                        ...prev,
                                                                        gatekeepers: (prev.gatekeepers || []).filter((_, i) => i !== idx)
                                                                    }));
                                                                }}
                                                                className="p-1 rounded text-[var(--color-text-muted)] hover:text-danger hover:bg-[var(--color-danger-light)] transition-colors"
                                                                title="Hapus Gatekeeper"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Status message */}
                                {scoringSaveStatus && (
                                    <div className={`p-4 rounded-xl flex items-center gap-2.5 text-xs font-bold ${
                                        scoringSaveStatus.type === "success" ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-200 dark:border-green-900" : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900"
                                    }`}>
                                        <span className="material-symbols-outlined text-[18px]">
                                            {scoringSaveStatus.type === "success" ? "check_circle" : "error"}
                                        </span>
                                        {scoringSaveStatus.msg}
                                    </div>
                                )}

                                {/* Bottom Save Bar */}
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => handleApplyPreset("5_tier_sales")}
                                        className="px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-primary-light)] text-primary border border-[var(--color-border-accent)] font-medium text-sm hover:bg-[var(--color-bg-hover)] transition-colors btn-press"
                                    >
                                        Reset ke Standar Seleksia
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveCompanyScoring}
                                        disabled={isScoringSaving}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">{isScoringSaving ? "progress_activity" : "save"}</span>
                                        {isScoringSaving ? "Menyimpan Standar Perusahaan..." : "Simpan Standar Perusahaan"}
                                    </button>
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
