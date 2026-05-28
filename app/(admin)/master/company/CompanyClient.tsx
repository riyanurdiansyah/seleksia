"use client";

import { useState, useEffect } from "react";
import DataTable, { ColumnDef } from "../../components/DataTable";
import Breadcrumb from "../../components/Breadcrumb";
import Modal from "../../components/Modal";

interface CompanyItem {
  id: string;
  name: string;
  slug?: string;
}

export default function CompanyClient() {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [formData, setFormData] = useState({ id: "", name: "" });

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      } else {
        setErrorMsg("Gagal mengambil data perusahaan.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleOpenCreate = () => {
    setFormData({ id: "", name: "" });
    setIsEditing(false);
    setIsModalOpen(true);
    setErrorMsg("");
  };

  const handleOpenEdit = (company: CompanyItem) => {
    setFormData({ id: company.id, name: company.name });
    setIsEditing(true);
    setIsModalOpen(true);
    setErrorMsg("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus perusahaan ini?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
      if (res.ok) {
        showSuccess("Perusahaan berhasil dihapus.");
        fetchCompanies();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Gagal menghapus perusahaan.");
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
      const url = isEditing ? `/api/companies/${formData.id}` : "/api/companies";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name, ...(isEditing ? { id: formData.id } : {}) })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menyimpan data.");
      }
      showSuccess(isEditing ? "Perusahaan diperbarui." : "Perusahaan baru ditambahkan.");
      setIsModalOpen(false);
      fetchCompanies();
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

  const columns: ColumnDef<CompanyItem>[] = [
    { header: "ID", accessorKey: "id", sortable: true, filterable: true },
    { header: "Nama Perusahaan", accessorKey: "name", sortable: true, filterable: true },
    {
      header: "Aksi",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenEdit(row)}
            className="size-7 flex items-center justify-center rounded-[var(--radius-xs)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-sub)] hover:text-primary hover:border-primary transition-all btn-press"
            title="Edit"
          >
            <span className="material-symbols-outlined text-[15px]">edit</span>
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="size-7 flex items-center justify-center rounded-[var(--radius-xs)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-sub)] hover:text-red-500 hover:border-red-500 hover:bg-red-50 transition-all btn-press"
            title="Hapus"
          >
            <span className="material-symbols-outlined text-[15px]">delete</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-slide-in-up relative">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">
            Manajemen Perusahaan
          </h1>
          <Breadcrumb />
        </div>
        <p className="text-[var(--color-text-sub)] text-sm font-medium">
          Atur data perusahaan yang terdaftar dalam sistem.
        </p>
      </div>

      {/* Alerts */}
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
              onClick={handleOpenCreate}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-extrabold text-white bg-[#0f766e] hover:bg-[#115e59] transition-all shadow-[0_4px_15px_rgba(15,118,110,0.3)] hover:shadow-[0_6px_20px_rgba(15,118,110,0.4)] hover:translate-y-[-2px] active:translate-y-0 w-full sm:w-auto btn-press cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] font-bold">add</span>
              Tambah Perusahaan
            </button>
          </div>
        </div>
        
        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center py-20 text-[var(--color-text-muted)] gap-3">
            <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold">Memuat perusahaan...</span>
          </div>
        ) : (
          <DataTable columns={columns} data={companies} globalSearchPlaceholder="Cari perusahaan..." />
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? "Edit Perusahaan" : "Tambah Perusahaan Baru"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-[var(--color-danger-light)] border border-[var(--color-danger)]/20 rounded-[var(--radius-sm)]">
              <p className="text-xs text-[var(--color-danger)] font-semibold">{errorMsg}</p>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Nama Perusahaan</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-main)] text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              required
            />
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
              {isEditing ? "Simpan Perubahan" : "Tambah Perusahaan"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
