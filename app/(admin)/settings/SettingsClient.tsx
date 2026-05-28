"use client";

import { useState } from "react";
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
        email: "admin@psikoest.com",
        role: "super_admin",
        status: "active",
        lastLogin: "2026-02-28 10:30",
        createdAt: "2026-01-01",
    },
    {
        id: "ADM-002",
        name: "Dr. Emily Chen",
        email: "emily.chen@psikoest.com",
        role: "admin",
        status: "active",
        lastLogin: "2026-02-28 09:15",
        createdAt: "2026-01-15",
    },
    {
        id: "ADM-003",
        name: "Prof. James Wilson",
        email: "james.w@psikoest.com",
        role: "proctor",
        status: "active",
        lastLogin: "2026-02-27 14:00",
        createdAt: "2026-02-01",
    },
    {
        id: "ADM-004",
        name: "Sari Dewi",
        email: "sari.d@psikoest.com",
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
    const [admins, setAdmins] = useState(initialAdmins);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newAdmin, setNewAdmin] = useState({
        name: "",
        email: "",
        role: "admin" as AdminUser["role"],
        password: "",
    });

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

            {/* Settings Tabs (visual only, admin tab active) */}
            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] relative overflow-hidden transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]">
                <div className="card-shimmer" />
                <div className="border-b border-[var(--color-border)]">
                    <nav className="flex px-6 gap-6">
                        <button className="py-3 border-b-2 border-primary text-primary font-medium text-sm">
                            Admin Accounts
                        </button>
                        <button className="py-3 border-b-2 border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] font-medium text-sm transition-colors">
                            General
                        </button>
                        <button className="py-3 border-b-2 border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] font-medium text-sm transition-colors">
                            Security
                        </button>
                        <button className="py-3 border-b-2 border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] font-medium text-sm transition-colors">
                            Notifications
                        </button>
                    </nav>
                </div>

                {/* Admin Accounts Section */}
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
                                    placeholder="e.g. john@psikoest.com"
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
