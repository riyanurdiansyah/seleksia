"use client";

import { useState, useEffect } from "react";

interface MenuItem {
    id: string;
    name: string;
    path: string | null;
    icon: string | null;
    isActive: boolean;
    parentId: string | null;
    sortOrder: number;
    submenus?: MenuItem[];
}

const AVAILABLE_ICONS = [
    "grid_view", "dashboard", "group", "description", "assignment_turned_in",
    "menu_book", "monitoring", "menu", "history", "fact_check",
    "chat_bubble", "bar_chart_4_bars", "settings", "person",
    "account_circle", "home", "article", "list", "payments",
    "schedule", "notifications", "mail", "security", "warning",
    "error", "check_circle", "info", "help", "star", "favorite",
    "build", "shopping_cart", "calendar_today", "event",
    "folder", "image", "videocam", "audiotrack", "map", "place"
];

export default function MenuManagementPage() {
    const [menus, setMenus] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        path: "",
        icon: "",
        parentId: "",
        sortOrder: 0,
        isActive: true,
    });

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Expanded parents state
    const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

    const fetchMenus = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/menus");
            if (!res.ok) throw new Error("Failed to fetch menus");
            const data = await res.json();
            setMenus(data);

            // Do not expand parents by default as requested
            // const initialExpanded: Record<string, boolean> = {};
            // data.forEach((m: MenuItem) => {
            //     initialExpanded[m.id] = true;
            // });
            // setExpandedParents(initialExpanded);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenus();
    }, []);

    // Auto-expand when searching
    useEffect(() => {
        if (searchQuery.trim().length > 0) {
            const newExpanded = { ...expandedParents };
            menus.forEach((menu) => {
                const query = searchQuery.toLowerCase();
                const childMatches = menu.submenus?.some(
                    (sub) => sub.name.toLowerCase().includes(query) || (sub.path || "").toLowerCase().includes(query)
                );
                if (childMatches) {
                    newExpanded[menu.id] = true;
                }
            });
            setExpandedParents(newExpanded);
        }
    }, [searchQuery, menus]);

    const handleToggleExpand = (id: string) => {
        setExpandedParents((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleOpenCreate = () => {
        setEditingMenu(null);
        setFormData({
            name: "",
            path: "",
            icon: "menu",
            parentId: "",
            sortOrder: menus.length * 10,
            isActive: true,
        });
        setIsFormOpen(true);
        setError("");
    };

    const handleOpenEdit = (menu: MenuItem) => {
        setEditingMenu(menu);
        setFormData({
            name: menu.name,
            path: menu.path || "",
            icon: menu.icon || "",
            parentId: menu.parentId || "",
            sortOrder: menu.sortOrder,
            isActive: menu.isActive,
        });
        setIsFormOpen(true);
        setError("");
    };

    const handleToggleActive = async (menu: MenuItem) => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/menus/${menu.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !menu.isActive }),
            });
            if (!res.ok) throw new Error("Failed to toggle menu status");
            showSuccess(`Menu "${menu.name}" ${!menu.isActive ? "diaktifkan" : "dinonaktifkan"}`);
            fetchMenus();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus menu ini beserta seluruh submenunya?")) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/menus/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete menu");
            showSuccess("Menu berhasil dihapus");
            fetchMenus();
            if (isFormOpen && editingMenu?.id === id) {
                setIsFormOpen(false);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        setError("");

        try {
            const url = editingMenu ? `/api/menus/${editingMenu.id}` : "/api/menus";
            const method = editingMenu ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    parentId: formData.parentId || null,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save menu");
            }

            showSuccess(editingMenu ? "Menu berhasil diperbarui" : "Menu baru berhasil dibuat");
            setIsFormOpen(false);
            fetchMenus();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(""), 3000);
    };

    return (
        <div className="space-y-6 animate-slide-in-up">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">
                        Kelola Menu
                    </h1>
                    <p className="text-[var(--color-text-sub)] text-sm mt-1 font-medium">
                        Atur menu navigasi utama dan submenu (parent-child) untuk panel aplikasi.
                    </p>
                </div>
            </div>

            {/* Toolbar: Search, Filter, and Add Button */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[var(--color-bg-card)] p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] relative z-10">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
                    {/* Search */}
                    <div className="relative w-full sm:max-w-xs">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--color-text-muted)] text-[18px]">
                            search
                        </span>
                        <input
                            type="text"
                            placeholder="Cari menu atau path URL..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-full text-[13px] text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-primary focus:ring-2 focus:ring-[var(--color-primary-light)] transition-all"
                        />
                    </div>
                    
                    {/* Filter */}
                    <div className="relative w-full sm:w-auto">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full sm:w-auto py-2.5 pl-4 pr-9 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-full text-[13px] text-[var(--color-text-sub)] focus:outline-none focus:border-primary focus:ring-2 focus:ring-[var(--color-primary-light)] transition-all appearance-none cursor-pointer font-bold"
                        >
                            <option value="all">Semua Status</option>
                            <option value="active">Aktif</option>
                            <option value="inactive">Nonaktif</option>
                        </select>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--color-text-muted)] text-[18px] pointer-events-none">
                            expand_more
                        </span>
                    </div>
                </div>
                
                {/* Tambah Menu Button Redesign */}
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-extrabold text-white bg-[#0f766e] hover:bg-[#115e59] transition-all shadow-[0_4px_15px_rgba(15,118,110,0.3)] hover:shadow-[0_6px_20px_rgba(15,118,110,0.4)] hover:translate-y-[-2px] active:translate-y-0 cursor-pointer w-full md:w-auto btn-press"
                >
                    <span className="material-symbols-outlined text-[18px] font-bold">add</span>
                    Tambah Menu
                </button>
            </div>

            {/* Notification Alerts */}
            {successMsg && (
                <div className="flex items-center gap-3 p-4 bg-[var(--color-success-light)] border border-[var(--color-success)]/20 rounded-[var(--radius-lg)] animate-fade-in shadow-[var(--shadow-sm)]">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    <p className="text-sm text-primary font-semibold">{successMsg}</p>
                </div>
            )}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-[var(--color-danger-light)] border border-[var(--color-danger)]/20 rounded-[var(--radius-lg)] animate-fade-in shadow-[var(--shadow-sm)]">
                    <span className="material-symbols-outlined text-[var(--color-danger)] text-xl">error</span>
                    <p className="text-sm text-[var(--color-danger)] font-semibold">{error}</p>
                </div>
            )}

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Panel: Menu Tree Grid */}
                <div className="lg:col-span-2 bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden relative">
                    <div className="card-shimmer" />
                    <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-hover)]">
                        <h3 className="text-[var(--color-text-main)] text-[15px] font-bold">Struktur Menu</h3>
                        <span className="text-[11px] font-bold text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-2 py-0.5 rounded-full">
                            {menus.length} Root Menu
                        </span>
                    </div>

                    <div className="p-6">
                        {loading ? (
                            <div className="flex flex-col items-center py-20 text-[var(--color-text-muted)] gap-3">
                                <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs font-semibold">Memuat menu...</span>
                            </div>
                        ) : menus.length === 0 ? (
                            <div className="flex flex-col items-center py-20 text-[var(--color-text-muted)] gap-2">
                                <span className="material-symbols-outlined text-4xl">menu_open</span>
                                <p className="text-sm font-semibold">Belum ada menu yang dibuat</p>
                                <button
                                    onClick={handleOpenCreate}
                                    className="mt-2 text-xs font-bold text-primary hover:underline"
                                >
                                    Buat menu pertama sekarang
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {menus
                                    .filter((parent) => {
                                        // Check status filter
                                        if (statusFilter === "active" && !parent.isActive) return false;
                                        if (statusFilter === "inactive" && parent.isActive) return false;
                                        
                                        // Check search query
                                        const query = searchQuery.toLowerCase().trim();
                                        if (!query) return true;
                                        
                                        const parentMatches = parent.name.toLowerCase().includes(query) || (parent.path || "").toLowerCase().includes(query);
                                        const childMatches = parent.submenus?.some(sub => sub.name.toLowerCase().includes(query) || (sub.path || "").toLowerCase().includes(query));
                                        
                                        return parentMatches || childMatches;
                                    })
                                    .map((parent) => {
                                        const hasChildren = parent.submenus && parent.submenus.length > 0;
                                    const isExpanded = expandedParents[parent.id];

                                    return (
                                        <div key={parent.id} className="border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden transition-all duration-[250ms] hover:border-[var(--color-border-strong)]">
                                            {/* Parent Row */}
                                            <div className={`flex items-center justify-between p-4 transition-colors ${parent.isActive ? "bg-[var(--color-bg-elevated)]" : "bg-[var(--color-bg-hover)] opacity-70"}`}>
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    {hasChildren ? (
                                                        <button
                                                            onClick={() => handleToggleExpand(parent.id)}
                                                            className="size-7 rounded-[var(--radius-xs)] hover:bg-[var(--color-bg-hover)] flex items-center justify-center text-[var(--color-text-sub)] cursor-pointer transition-all"
                                                        >
                                                            <span className="material-symbols-outlined text-lg transition-transform duration-200" style={{ transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}>
                                                                keyboard_arrow_down
                                                            </span>
                                                        </button>
                                                    ) : (
                                                        <div className="size-7" />
                                                    )}
                                                    
                                                    {parent.icon && (
                                                        <div className="size-8 rounded-[var(--radius-xs)] bg-[var(--color-primary-light)] border border-[var(--color-border-accent)] flex items-center justify-center text-primary">
                                                            <span className="material-symbols-outlined text-lg font-bold">
                                                                {parent.icon}
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="min-w-0">
                                                        <p className="text-[var(--color-text-main)] text-[13px] font-bold truncate">
                                                            {parent.name}
                                                        </p>
                                                        <p className="text-[var(--color-text-muted)] text-[11px] font-medium truncate">
                                                            {parent.path || "No Link (Parent Only)"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {/* Status Badge */}
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${parent.isActive ? "bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success)]/20" : "bg-[var(--color-danger-light)] text-[var(--color-danger)] border-[var(--color-danger)]/20"}`}>
                                                        {parent.isActive ? "Aktif" : "Nonaktif"}
                                                    </span>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleToggleActive(parent)}
                                                            disabled={actionLoading}
                                                            className={`size-8 rounded-[var(--radius-xs)] flex items-center justify-center border transition-all cursor-pointer btn-press ${parent.isActive ? "bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-text-sub)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)]" : "bg-primary text-white border-transparent hover:bg-primary-hover"}`}
                                                            title={parent.isActive ? "Nonaktifkan" : "Aktifkan"}
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">
                                                                {parent.isActive ? "toggle_off" : "toggle_on"}
                                                            </span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenEdit(parent)}
                                                            className="size-8 rounded-[var(--radius-xs)] bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-sub)] hover:text-primary hover:border-[var(--color-border-accent)] flex items-center justify-center cursor-pointer transition-all btn-press"
                                                            title="Edit"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(parent.id)}
                                                            disabled={actionLoading}
                                                            className="size-8 rounded-[var(--radius-xs)] bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] hover:border-[var(--color-danger)]/20 flex items-center justify-center cursor-pointer transition-all btn-press"
                                                            title="Hapus"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Submenus (Children) */}
                                            {hasChildren && isExpanded && (
                                                <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-card)] p-2 space-y-1.5 pl-10">
                                                    {parent.submenus?.map((child) => (
                                                        <div
                                                            key={child.id}
                                                            className={`flex items-center justify-between p-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-all ${child.isActive ? "bg-[var(--color-bg-card)]" : "bg-[var(--color-bg-hover)] opacity-70"}`}
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                {child.icon && (
                                                                    <span className="material-symbols-outlined text-[var(--color-text-muted)] text-lg">
                                                                        {child.icon}
                                                                    </span>
                                                                )}
                                                                <div className="min-w-0">
                                                                    <p className="text-[var(--color-text-sub)] text-[12.5px] font-semibold truncate">
                                                                        {child.name}
                                                                    </p>
                                                                    <p className="text-[var(--color-text-muted)] text-[10.5px] font-medium truncate">
                                                                        {child.path}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${child.isActive ? "bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success)]/10" : "bg-[var(--color-danger-light)] text-[var(--color-danger)] border-[var(--color-danger)]/20"}`}>
                                                                    {child.isActive ? "Aktif" : "Nonaktif"}
                                                                </span>

                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => handleToggleActive(child)}
                                                                        disabled={actionLoading}
                                                                        className={`size-7.5 rounded-[var(--radius-xs)] flex items-center justify-center border transition-all cursor-pointer btn-press ${child.isActive ? "bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-text-sub)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)]" : "bg-primary text-white border-transparent hover:bg-primary-hover"}`}
                                                                        title={child.isActive ? "Nonaktifkan" : "Aktifkan"}
                                                                    >
                                                                        <span className="material-symbols-outlined text-[15px]">
                                                                            {child.isActive ? "toggle_off" : "toggle_on"}
                                                                        </span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleOpenEdit(child)}
                                                                        className="size-7.5 rounded-[var(--radius-xs)] bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-sub)] hover:text-primary hover:border-[var(--color-border-accent)] flex items-center justify-center cursor-pointer transition-all btn-press"
                                                                        title="Edit"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[15px]">edit</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(child.id)}
                                                                        disabled={actionLoading}
                                                                        className="size-7.5 rounded-[var(--radius-xs)] bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] hover:border-[var(--color-danger)]/20 flex items-center justify-center cursor-pointer transition-all btn-press"
                                                                        title="Hapus"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[15px]">delete</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Form Editor Panel */}
                <div className={`bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 space-y-6 transition-all duration-300 relative overflow-hidden ${isFormOpen ? "opacity-100 scale-100" : "opacity-50 scale-95 pointer-events-none hidden"}`}>
                    <div className="card-shimmer" />
                    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
                        <h3 className="text-[var(--color-text-main)] text-[15px] font-bold">
                            {editingMenu ? "Edit Menu" : "Tambah Menu Baru"}
                        </h3>
                        <button
                            onClick={() => setIsFormOpen(false)}
                            className="size-7 rounded-[var(--radius-xs)] hover:bg-[var(--color-bg-hover)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] cursor-pointer transition-all btn-press"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                Nama Menu / Submenu
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="cth: Manajemen Kandidat"
                                className="w-full px-4 py-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary-light)] focus:border-primary focus:bg-[var(--color-bg-card)] focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] focus:translate-y-[-1px] text-sm transition-all duration-300"
                                required
                            />
                        </div>

                        {/* Path */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                Path URL
                            </label>
                            <input
                                type="text"
                                value={formData.path}
                                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                                placeholder="cth: /admin/candidates"
                                className="w-full px-4 py-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary-light)] focus:border-primary focus:bg-[var(--color-bg-card)] focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] focus:translate-y-[-1px] text-sm transition-all duration-300"
                            />
                        </div>

                        {/* Icon */}
                        <div className="space-y-1.5 relative">
                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                Ikon Menu
                            </label>
                            
                            <button
                                type="button"
                                onClick={() => setShowIconPicker(!showIconPicker)}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
                            >
                                <div className="flex items-center gap-3 text-[var(--color-text-main)]">
                                    <span className="material-symbols-outlined text-primary text-xl">
                                        {formData.icon || "menu"}
                                    </span>
                                    <span className="text-sm font-medium">
                                        {formData.icon || "Pilih Ikon"}
                                    </span>
                                </div>
                                <span className="material-symbols-outlined text-[var(--color-text-muted)] text-sm">
                                    {showIconPicker ? "expand_less" : "expand_more"}
                                </span>
                            </button>

                            {showIconPicker && (
                                <div className="absolute z-50 mt-1 w-full p-4 bg-[var(--color-bg-card)] border border-[var(--color-border-strong)] rounded-[var(--radius-md)] shadow-[0_10px_30px_rgba(0,0,0,0.15)] animate-slide-in-up">
                                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                                        {AVAILABLE_ICONS.map((iconName) => (
                                            <button
                                                key={iconName}
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, icon: iconName });
                                                    setShowIconPicker(false);
                                                }}
                                                className={`p-2 rounded-[var(--radius-sm)] flex items-center justify-center transition-all cursor-pointer ${
                                                    formData.icon === iconName
                                                        ? "bg-[var(--color-primary-light)] border border-[var(--color-border-accent)] text-primary shadow-[var(--shadow-sm)]"
                                                        : "bg-[var(--color-bg-elevated)] border border-transparent text-[var(--color-text-sub)] hover:text-primary hover:bg-[var(--color-bg-hover)]"
                                                }`}
                                                title={iconName}
                                            >
                                                <span className="material-symbols-outlined text-lg">{iconName}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                                        <input
                                            type="text"
                                            value={formData.icon}
                                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                            placeholder="Atau ketik nama ikon manual..."
                                            className="w-full px-3 py-2 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-main)] text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-[var(--color-primary-light)]"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Parent Select */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                Parent Menu (Biarkan kosong jika ini Root)
                            </label>
                            <select
                                value={formData.parentId}
                                onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                                className="w-full px-4 py-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary-light)] focus:border-primary text-sm transition-all duration-300"
                            >
                                <option value="">Tanpa Parent (Root Menu)</option>
                                {menus
                                    .filter((m) => m.id !== editingMenu?.id) // Prevent self-referencing
                                    .map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {/* Sort Order */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                Urutan (Sort Order)
                            </label>
                            <input
                                type="number"
                                value={formData.sortOrder}
                                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                                placeholder="cth: 10"
                                className="w-full px-4 py-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary-light)] focus:border-primary focus:bg-[var(--color-bg-card)] focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] focus:translate-y-[-1px] text-sm transition-all duration-300"
                            />
                        </div>

                        {/* Toggle Switches */}
                        <div className="flex items-center justify-between p-3 border border-[var(--color-border)] rounded-[var(--radius-md)]">
                            <span className="text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider">Status Aktif</span>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                className={`size-8 rounded-[var(--radius-xs)] flex items-center justify-center border transition-all cursor-pointer btn-press ${formData.isActive ? "bg-primary text-white border-transparent hover:bg-primary-hover shadow-[0_2px_8px_var(--color-primary-glow)]" : "bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-text-muted)]"}`}
                            >
                                <span className="material-symbols-outlined text-lg">
                                    {formData.isActive ? "check" : "close"}
                                </span>
                            </button>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={actionLoading}
                            className="w-full py-3.5 px-4 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-extrabold text-sm transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] cursor-pointer mt-4 btn-press btn-shine"
                        >
                            {actionLoading ? (
                                <>
                                    <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    {editingMenu ? "Simpan Perubahan" : "Buat Menu"}
                                </>
                            )}
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
}
