"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Breadcrumb from "../components/Breadcrumb";

interface SubMenuItem {
    id: string;
    name: string;
    path: string | null;
    icon: string | null;
}

interface MenuItem {
    id: string;
    name: string;
    path: string | null;
    icon: string | null;
    submenus?: SubMenuItem[];
}

export default function MasterParentPage() {
    const [submenus, setSubmenus] = useState<SubMenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [parentName, setParentName] = useState("Master Data");

    useEffect(() => {
        const fetchMenus = async () => {
            const role = sessionStorage.getItem("candidateRole") || "admin";
            try {
                const res = await fetch(`/api/menus/sidebar?role=${role}`);
                if (res.ok) {
                    const data: MenuItem[] = await res.json();
                    // Find the menu item that corresponds to 'master' (either has path '/master' or name matches 'Master')
                    const masterMenu = data.find(
                        (m) =>
                            (m.path && m.path.toLowerCase().includes("master")) ||
                            m.name.toLowerCase() === "master"
                    );
                    if (masterMenu) {
                        setParentName(masterMenu.name);
                        setSubmenus(masterMenu.submenus || []);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch submenus", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMenus();
    }, []);

    const getMenuDescription = (path: string | null) => {
        if (!path) return "Akses menu pengelolaan dan pengaturan sistem.";
        const p = path.toLowerCase();
        if (p.includes("/master/user")) return "Kelola data pengguna, kandidat, proctor, dan administrator secara terpusat.";
        if (p.includes("/master/roles")) return "Atur level kewenangan, nama role jabatan, dan deskripsi otorisasi sistem.";
        if (p.includes("/master/rbac")) return "Matriks otorisasi hak akses menu untuk baca, tulis, ubah, dan hapus.";
        if (p.includes("/master/menu")) return "Konfigurasi struktur menu, penamaan, ikon material, dan urutan tampil.";
        return "Akses menu pengelolaan dan pengaturan sistem.";
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">
                        {parentName}
                    </h1>
                    <Breadcrumb />
                </div>
                <p className="text-[var(--color-text-sub)] text-sm font-medium">
                    Pilih salah satu menu di bawah ini untuk mengelola konfigurasi {parentName.toLowerCase()}.
                </p>
            </div>

            {/* Menu Grid */}
            {loading ? (
                <div className="flex flex-col items-center py-20 text-[var(--color-text-muted)] gap-3">
                    <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-semibold">Memuat menu...</span>
                </div>
            ) : submenus.length === 0 ? (
                <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-12 text-center">
                    <span className="material-symbols-outlined text-5xl text-[var(--color-text-muted)] mb-3 opacity-40">
                        folder_off
                    </span>
                    <p className="text-base font-semibold text-[var(--color-text-main)]">Tidak ada menu tersedia</p>
                    <p className="text-sm text-[var(--color-text-sub)] mt-1">Anda tidak memiliki akses ke sub-menu di kategori ini.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {submenus.map((sub) => (
                        <Link
                            key={sub.id}
                            href={sub.path || "#"}
                            className="group flex flex-col justify-between p-6 bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-elevated)] border border-[var(--color-border)] hover:border-primary/30 rounded-[var(--radius-xl)] shadow-[var(--shadow-card)] hover:shadow-[0_8px_30px_rgba(15,118,110,0.08)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                        >
                            {/* Decorative background gradient hover effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                            
                            <div className="space-y-4 relative z-10">
                                {/* Header with Icon and Arrow */}
                                <div className="flex items-center justify-between">
                                    <div className="size-12 rounded-xl flex items-center justify-center bg-[var(--color-primary-light)] text-primary border border-primary/10 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                            {sub.icon || "folder"}
                                        </span>
                                    </div>
                                    <span className="material-symbols-outlined text-[18px] text-[var(--color-text-muted)] group-hover:text-primary group-hover:translate-x-1.5 transition-all duration-300">
                                        arrow_forward
                                    </span>
                                </div>

                                {/* Text Details */}
                                <div className="space-y-1.5">
                                    <h3 className="text-base font-bold text-[var(--color-text-main)] group-hover:text-primary transition-colors leading-tight">
                                        {sub.name}
                                    </h3>
                                    <p className="text-[12px] text-[var(--color-text-sub)] leading-relaxed font-medium">
                                        {getMenuDescription(sub.path)}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
