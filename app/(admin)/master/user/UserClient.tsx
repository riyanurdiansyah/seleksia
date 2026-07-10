"use client";
import { globalDialog } from "@/app/providers/DialogProvider";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import DataTable, { ColumnDef } from "../../components/DataTable";
import Breadcrumb from "../../components/Breadcrumb";
import Select2 from "../../components/Select2";

interface UserItem {
    id: string;
    displayId: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    batch: string | null;
    status: string;
    createdAt: string;
    companyId: string;
    company?: {
        name: string;
    };
    companyName?: string;
}

interface RBACAccess {
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}

export default function UserClient() {
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [access, setAccess] = useState<RBACAccess>({
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false
    });

    const [companies, setCompanies] = useState<{id: string, name: string}[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<string>("all");
    const [currentRole, setCurrentRole] = useState<string>("user");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [formData, setFormData] = useState({
        id: "",
        displayId: "",
        name: "",
        email: "",
        phone: "",
        role: "user",
        batch: "",
        companyId: ""
    });

    // Check RBAC first, then load users
    useEffect(() => {
        const init = async () => {
            const role = localStorage.getItem("candidateRole") || "user";
            
            try {
                // Check access
                const accessRes = await fetch(`/api/rbac/check?path=/master/user&role=${role}`);
                if (accessRes.ok) {
                    const accessData = await accessRes.json();
                    setAccess(accessData);
                    setCurrentRole(role);
                    
                    if (role === "superadmin") {
                        fetchCompanies();
                    }
                    
                    if (accessData.canRead) {
                        fetchUsers(role, "all");
                    } else {
                        setLoading(false);
                        setErrorMsg("Anda tidak memiliki akses untuk melihat halaman ini.");
                    }
                }
            } catch (err) {
                console.error("Init Error", err);
                setLoading(false);
            }
        };

        init();
    }, []);

    const fetchCompanies = async () => {
        try {
            const res = await fetch("/api/companies");
            if (res.ok) {
                const data = await res.json();
                setCompanies(data);
            }
        } catch (err) {
            console.error("Failed to fetch companies", err);
        }
    };

    const fetchUsers = async (r: string = currentRole, cId: string = selectedCompany) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/users?role=${r}&companyId=${cId}`);
            if (res.ok) {
                const data = await res.json();
                const mappedData = data.map((u: any) => ({
                    ...u,
                    companyName: u.company?.name || ""
                }));
                setUsers(mappedData);
            } else {
                setErrorMsg("Gagal mengambil data pengguna.");
            }
        } catch (err) {
            console.error(err);
            setErrorMsg("Terjadi kesalahan jaringan.");
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (val: string) => {
        setSelectedCompany(val);
        fetchUsers(currentRole, val);
    };

    const handleCopy = () => {
        const headers = [
            "ID Peserta",
            ...(currentRole === "superadmin" ? ["Perusahaan"] : []),
            "Nama Lengkap",
            "Email",
            "Nomor Telepon",
            "Role",
            "Status",
            "Batch"
        ];
        const rows = users.map(u => [
            u.displayId || "",
            ...(currentRole === "superadmin" ? [u.companyName || ""] : []),
            u.name || "",
            u.email || "",
            u.phone || "",
            u.role || "",
            u.status || "",
            u.batch || ""
        ]);
        const textContent = [
            headers.join("\t"),
            ...rows.map(row => row.join("\t"))
        ].join("\n");

        navigator.clipboard.writeText(textContent);
        showSuccess("Data berhasil disalin ke clipboard!");
    };

    const handleExportCSV = () => {
        const headers = [
            "ID Peserta",
            ...(currentRole === "superadmin" ? ["Perusahaan"] : []),
            "Nama Lengkap",
            "Email",
            "Nomor Telepon",
            "Role",
            "Status",
            "Batch",
            "Tanggal Dibuat"
        ];
        const rows = users.map(u => [
            u.displayId || "",
            ...(currentRole === "superadmin" ? [u.companyName || ""] : []),
            u.name || "",
            u.email || "",
            u.phone || "",
            u.role || "",
            u.status || "",
            u.batch || "",
            u.createdAt ? new Date(u.createdAt).toLocaleDateString("id-ID") : ""
        ]);
        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(val => {
                const escaped = String(val).replace(/"/g, '""');
                return `"${escaped}"`;
            }).join(","))
        ].join("\n");

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `data_pengguna_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportExcel = () => {
        const headers = [
            "ID Peserta",
            ...(currentRole === "superadmin" ? ["Perusahaan"] : []),
            "Nama Lengkap",
            "Email",
            "Nomor Telepon",
            "Role",
            "Status",
            "Batch",
            "Tanggal Dibuat"
        ];
        const rows = users.map(u => [
            u.displayId || "",
            ...(currentRole === "superadmin" ? [u.companyName || ""] : []),
            u.name || "",
            u.email || "",
            u.phone || "",
            u.role || "",
            u.status || "",
            u.batch || "",
            u.createdAt ? new Date(u.createdAt).toLocaleDateString("id-ID") : ""
        ]);

        let excelContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
        excelContent += `<head><meta charset="utf-8" /><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Data Pengguna</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>`;
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
        link.setAttribute("download", `data_pengguna_${new Date().toISOString().slice(0, 10)}.xls`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleOpenCreate = () => {
        if (!access.canCreate) return;
        setFormData({
            id: "",
            displayId: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
            name: "",
            email: "",
            phone: "",
            role: "user",
            batch: "",
            companyId: selectedCompany !== "all" ? selectedCompany : (companies.length > 0 ? companies[0].id : "")
        });
        setIsEditing(false);
        setIsModalOpen(true);
        setErrorMsg("");
    };

    const handleOpenEdit = (user: UserItem) => {
        if (!access.canUpdate) return;
        setFormData({
            id: user.id,
            displayId: user.displayId,
            name: user.name,
            email: user.email,
            phone: user.phone || "",
            role: user.role,
            batch: user.batch || "",
            companyId: user.companyId || ""
        });
        setIsEditing(true);
        setIsModalOpen(true);
        setErrorMsg("");
    };

    const handleDelete = async (id: string) => {
        if (!access.canDelete) return;
        if (!await globalDialog.confirm("Apakah Anda yakin ingin menghapus pengguna ini?")) return;
        
        setActionLoading(true);
        try {
            const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
            if (res.ok) {
                showSuccess("Pengguna berhasil dihapus.");
                fetchUsers();
            } else {
                const data = await res.json();
                setErrorMsg(data.error || "Gagal menghapus pengguna.");
            }
        } catch (err) {
            setErrorMsg("Terjadi kesalahan jaringan.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        setErrorMsg("");

        try {
            const url = isEditing ? `/api/users/${formData.id}` : "/api/users";
            const method = isEditing ? "PUT" : "POST";


            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, currentRole }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Gagal menyimpan data.");
            }

            showSuccess(isEditing ? "Data pengguna diperbarui." : "Pengguna baru ditambahkan.");
            setIsModalOpen(false);
            fetchUsers();
        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(""), 3000);
    };

    const columns: ColumnDef<UserItem>[] = [
        {
            header: "ID Peserta",
            accessorKey: "displayId",
            sortable: true,
            filterable: true,
            cell: (row) => <span className="font-semibold text-[var(--color-text-main)]">{row.displayId}</span>
        },
        ...(currentRole === "superadmin" ? [
            {
                header: "Instansi / Perusahaan",
                accessorKey: "companyName" as keyof UserItem,
                sortable: true,
                filterable: true,
                cell: (row: UserItem) => (
                    <span className="text-[12px] font-semibold text-[var(--color-text-sub)]">
                        {row.companyName || "—"}
                    </span>
                )
            }
        ] : []),
        {
            header: "Nama Lengkap",
            accessorKey: "name",
            sortable: true,
            filterable: true,
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-[var(--color-primary-light)] text-primary flex items-center justify-center font-bold">
                        {row.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-[var(--color-text-main)] text-[13px]">{row.name}</span>
                        <span className="text-[11px] text-[var(--color-text-muted)]">{row.email}</span>
                    </div>
                </div>
            )
        },
        {
            header: "Role",
            accessorKey: "role",
            sortable: true,
            filterable: true,
            cell: (row) => {
                const isSystem = row.role === "admin" || row.role === "proctor";
                return (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isSystem ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-[var(--color-primary-light)] text-primary border border-primary/20"}`}>
                        {row.role}
                    </span>
                );
            }
        },
        {
            header: "Status",
            accessorKey: "status",
            sortable: true,
            filterable: true,
            cell: (row) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${row.status === "registered" ? "bg-gray-100 text-gray-700" : row.status === "testing" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                    {row.status}
                </span>
            )
        },
        {
            header: "Aksi",
            sortable: true,
            filterable: true,
            cell: (row) => (
                <div className="flex items-center gap-2">
                    {access.canUpdate && (
                        <button
                            onClick={() => handleOpenEdit(row)}
                            className="size-7 flex items-center justify-center rounded-[var(--radius-xs)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-sub)] hover:text-primary hover:border-primary transition-all btn-press"
                            title="Edit"
                        >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>
                    )}
                    {access.canDelete && (
                        <button
                            onClick={() => handleDelete(row.id)}
                            className="size-7 flex items-center justify-center rounded-[var(--radius-xs)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-sub)] hover:text-red-500 hover:border-red-500 hover:bg-red-50 transition-all btn-press"
                            title="Hapus"
                        >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                    )}
                    {!access.canUpdate && !access.canDelete && (
                        <span className="text-[10px] text-[var(--color-text-muted)] italic">No Access</span>
                    )}
                </div>
            )
        }
    ];

    if (!access.canRead && !loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                <span className="material-symbols-outlined text-6xl text-[var(--color-danger)] mb-4">lock</span>
                <h2 className="text-xl font-bold text-[var(--color-text-main)]">Akses Ditolak</h2>
                <p className="text-[var(--color-text-sub)] mt-2">Anda tidak memiliki izin untuk melihat halaman ini berdasarkan Role Access Matrix (RBAC).</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-slide-in-up relative">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">
                        Manajemen Pengguna
                    </h1>
                    <Breadcrumb />
                </div>
                
                <p className="text-[var(--color-text-sub)] text-sm font-medium">
                    Kelola data kandidat, proctor, dan admin (terintegrasi RBAC).
                </p>
            </div>

            {/* Notification Alerts */}
            {successMsg && (
                <div className="flex items-center gap-3 p-4 bg-[var(--color-success-light)] border border-[var(--color-success)]/20 rounded-[var(--radius-lg)] animate-fade-in shadow-[var(--shadow-sm)]">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    <p className="text-sm text-primary font-semibold">{successMsg}</p>
                </div>
            )}
            {errorMsg && !isModalOpen && (
                <div className="flex items-center gap-3 p-4 bg-[var(--color-danger-light)] border border-[var(--color-danger)]/20 rounded-[var(--radius-lg)] animate-fade-in shadow-[var(--shadow-sm)]">
                    <span className="material-symbols-outlined text-[var(--color-danger)] text-xl">error</span>
                    <p className="text-sm text-[var(--color-danger)] font-semibold">{errorMsg}</p>
                </div>
            )}

            {/* Data Table Container */}
            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6">
                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    {/* Left Actions: Export Buttons Group and optional Company Dropdown */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">

                        {currentRole === "superadmin" && (
                                <Select2
                                    value={selectedCompany}
                                    onChange={handleFilterChange}
                                    options={[
                                        { value: "all", label: "Semua" },
                                        ...companies.map(c => ({ value: c.id, label: c.name }))
                                    ]}
                                    className="w-full sm:w-48 text-left"
                                />
                            )}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Excel Button */}
                            <button
                                type="button"
                                onClick={handleExportExcel}
                                className="flex items-center gap-1.5 px-4 py-2 border border-gray-100 rounded-xl text-xs font-bold bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 cursor-pointer shadow-sm btn-press"
                            >
                                <span className="material-symbols-outlined text-[14px] text-gray-400 font-bold">cloud_download</span>
                                Excel
                            </button>
                        </div>

                    </div>

                    {/* Right Actions: Add Button */}
                    <div className="w-full sm:w-auto">
                        {access.canCreate && (
                            <button
                                onClick={handleOpenCreate}
                                className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-extrabold text-white bg-[#0f766e] hover:bg-[#115e59] transition-all shadow-[0_4px_15px_rgba(15,118,110,0.3)] hover:shadow-[0_6px_20px_rgba(15,118,110,0.4)] hover:translate-y-[-2px] active:translate-y-0 w-full sm:w-auto btn-press cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[18px] font-bold">add</span>
                                Tambah Pengguna
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center py-20 text-[var(--color-text-muted)] gap-3">
                        <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-semibold">Memuat pengguna...</span>
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={users}
                        globalSearchPlaceholder="Cari pengguna berdasarkan ID, Nama, Email..."
                    />
                )}
            </div>

            {/* Form Modal */}
            {isModalOpen && typeof window !== "undefined" && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-in-up">
                        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-bg-card)] z-10">
                            <h3 className="text-lg font-bold text-[var(--color-text-main)]">
                                {isEditing ? "Edit Pengguna" : "Tambah Pengguna Baru"}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="size-8 rounded-full hover:bg-[var(--color-bg-hover)] flex items-center justify-center text-[var(--color-text-muted)] transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            {errorMsg && (
                                <div className="p-3 bg-[var(--color-danger-light)] border border-[var(--color-danger)]/20 rounded-[var(--radius-sm)]">
                                    <p className="text-xs text-[var(--color-danger)] font-semibold">{errorMsg}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">ID Peserta</label>
                                    <input
                                        type="text"
                                        value={formData.displayId}
                                        onChange={(e) => setFormData({ ...formData, displayId: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-main)] text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50 disabled:bg-[var(--color-bg-hover)] disabled:cursor-not-allowed"
                                        required
                                        disabled={isEditing}
                                    />
                                </div>
                                <div className="space-y-1.5 col-span-2 sm:col-span-1 text-left">
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Role</label>
                                    <Select2
                                        value={formData.role}
                                        onChange={(val) => setFormData({ ...formData, role: val })}
                                        options={[
                                            { value: "user", label: "User / Kandidat" },
                                            { value: "admin", label: "Admin" },
                                            { value: "proctor", label: "Proctor" }
                                        ]}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            
                            {currentRole === "superadmin" && (
                                <div className="space-y-1.5 text-left">
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Perusahaan / Instansi</label>
                                    <Select2
                                        value={formData.companyId}
                                        onChange={(val) => setFormData({ ...formData, companyId: val })}
                                        options={companies.map(c => ({ value: c.id, label: c.name }))}
                                        placeholder="Pilih Instansi"
                                        className="w-full"
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Nama Lengkap</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-main)] text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-main)] text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50 disabled:bg-[var(--color-bg-hover)] disabled:cursor-not-allowed"
                                    required
                                    disabled={isEditing}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Nomor Telepon</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-main)] text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Batch (Opsional)</label>
                                    <input
                                        type="text"
                                        value={formData.batch}
                                        onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-main)] text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50"
                                        disabled={formData.role !== "user"}
                                        placeholder={formData.role !== "user" ? "Hanya untuk User" : "cth: Gelombang 1"}
                                    />
                                </div>
                            </div>


                            <div className="pt-4 border-t border-[var(--color-border)] flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 rounded-[var(--radius-sm)] text-sm font-bold text-[var(--color-text-sub)] bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-hover)] transition-colors border border-[var(--color-border)]"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-5 py-2.5 rounded-[var(--radius-sm)] text-sm font-bold text-white bg-gradient-to-br from-primary to-accent hover:opacity-90 shadow-[0_4px_15px_var(--color-primary-glow)] transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {actionLoading && <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    {isEditing ? "Simpan Perubahan" : "Tambah Pengguna"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
