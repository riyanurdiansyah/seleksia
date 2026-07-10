"use client";
import { globalDialog } from "@/app/providers/DialogProvider";

import { useState, useEffect } from "react";
import DataTable, { ColumnDef } from "../../components/DataTable";
import Breadcrumb from "../../components/Breadcrumb";

interface RoleStat {
    id: string;
    name: string;
    userCount: number;
    isSystem: boolean;
}

export default function RolesClient() {
    const [roles, setRoles] = useState<RoleStat[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/roles");
            if (res.ok) {
                const data = await res.json();
                setRoles(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const columns: ColumnDef<RoleStat>[] = [
        {
            header: "Nama Role",
            accessorKey: "name",
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-[var(--color-primary-light)] text-primary flex items-center justify-center font-bold">
                        {row.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-[var(--color-text-main)] text-sm">{row.name}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-medium">System Enum: {row.id}</span>
                    </div>
                </div>
            )
        },
        {
            header: "Jumlah Pengguna",
            accessorKey: "userCount",
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--color-text-muted)] text-[16px]">group</span>
                    <span className="font-bold text-[var(--color-text-sub)]">{row.userCount} users</span>
                </div>
            )
        },
        {
            header: "Tipe",
            accessorKey: "isSystem",
            cell: (row) => (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--color-primary-light)] text-primary border border-primary/20">
                    System Role
                </span>
            )
        },
        {
            header: "Aksi",
            accessorKey: "id",
            cell: (row) => (
                <button
                    onClick={async () => await globalDialog.alert(`Role ${row.name} adalah role bawaan sistem (enum) dan tidak dapat diubah dari antarmuka ini.`)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-sub)] hover:text-primary hover:border-[var(--color-border-accent)] transition-all cursor-pointer"
                >
                    Lihat Detail
                </button>
            )
        }
    ];

    return (
        <div className="space-y-6 animate-slide-in-up">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">
                        Manajemen Role
                    </h1>
                    <Breadcrumb />
                </div>
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-[var(--color-text-sub)] text-sm font-medium">
                        Lihat daftar role sistem dan statistik pengguna untuk masing-masing role.
                    </p>
                    {/* Tambah Role Button (Disabled for Enum) */}
            </div>
            </div>

            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6">
                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        className="flex items-center gap-1.5 px-4 py-2 border border-gray-100 rounded-xl text-xs font-bold bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 cursor-pointer shadow-sm btn-press"
                    >
                        <span className="material-symbols-outlined text-[14px] text-gray-400 font-bold">cloud_download</span>
                        Export
                    </button>
                    </div>
                </div>
                <div className="w-full sm:w-auto">
                    <button
                    onClick={async () => await globalDialog.alert("Penambahan role kustom memerlukan modifikasi skema database (enum Role). Silakan hubungi developer untuk mengubah struktur tabel menjadi dinamis.")}
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-extrabold text-white bg-[#0f766e] hover:bg-[#115e59] transition-all shadow-[0_4px_15px_rgba(15,118,110,0.3)] hover:shadow-[0_6px_20px_rgba(15,118,110,0.4)] hover:translate-y-[-2px] active:translate-y-0 w-full sm:w-auto btn-press cursor-pointer"
                    >
                    <span className="material-symbols-outlined text-[18px] font-bold">add</span>
                    Tambah Role
                    </button>
                </div>
                </div>
                
                {/* Table */}
                {loading ? (
                    <div className="flex flex-col items-center py-20 text-[var(--color-text-muted)] gap-3">
                        <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-semibold">Memuat role...</span>
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={roles}
                        globalSearchPlaceholder="Cari role..."
                    />
                )}
            </div>

        </div>
    );
}
