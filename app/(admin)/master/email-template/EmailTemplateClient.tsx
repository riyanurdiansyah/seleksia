"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, CheckCircle, AlertCircle, Info, X } from "lucide-react";

type EmailTemplate = {
    id: string;
    name: string;
    subject: string;
    content: string;
    isDefault: boolean;
    createdAt: string;
};

export default function EmailTemplateClient() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        subject: "",
        content: "",
        isDefault: false
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await fetch("/api/email-templates");
            const data = await res.json();
            if (res.ok) setTemplates(data);
        } catch (error) {
            console.error("Failed to fetch templates:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (template?: EmailTemplate) => {
        if (template) {
            setEditingTemplate(template);
            setFormData({
                name: template.name,
                subject: template.subject,
                content: template.content,
                isDefault: template.isDefault
            });
        } else {
            setEditingTemplate(null);
            setFormData({
                name: "",
                subject: "Undangan Seleksi - {{company_name}}",
                content: `Halo <strong>{{candidate_name}}</strong>,<br/><br/>Anda telah diundang untuk mengikuti asesmen di platform <strong>{{company_name}}</strong>.<br/><br/>Berikut adalah informasi akun Anda untuk masuk ke sistem:<br/><br/>URL Login: <a href="{{login_url}}">{{login_url}}</a><br/>Username: {{username}}<br/>Password: {{password}}<br/>Waktu Pelaksanaan: {{waktu_pelaksanaan}}<br/><br/>Silakan masuk dan segera ganti kata sandi Anda demi keamanan.`,
                isDefault: templates.length === 0 // Make default if it's the first one
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingTemplate(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const url = editingTemplate
                ? `/api/email-templates/${editingTemplate.id}`
                : "/api/email-templates";

            const res = await fetch(url, {
                method: editingTemplate ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                fetchTemplates();
                handleCloseModal();
            } else {
                const err = await res.json();
                alert(err.error || "Terjadi kesalahan");
            }
        } catch (error) {
            console.error("Save error:", error);
            alert("Gagal menyimpan template");
        }
    };

    const handleDeleteClick = (id: string) => {
        setTemplateToDelete(id);
    };

    const confirmDelete = async () => {
        if (!templateToDelete) return;

        try {
            const res = await fetch(`/api/email-templates/${templateToDelete}`, { method: "DELETE" });
            if (res.ok) {
                fetchTemplates();
            }
        } catch (error) {
            console.error("Delete error:", error);
        } finally {
            setTemplateToDelete(null);
        }
    };

    // Mock data for preview
    const previewHtml = formData.content
        .replace(/\{\{candidate_name\}\}/g, "Budi Santoso")
        .replace(/\{\{name\}\}/g, "Budi Santoso")
        .replace(/\{\{company_name\}\}/g, "PT Contoh Perusahaan")
        .replace(/\{\{company_slug\}\}/g, "contoh-perusahaan")
        .replace(/\{\{company_email\}\}/g, "contoh-perusahaan@seleksia.com")
        .replace(/\{\{support_email\}\}/g, "contoh-perusahaan@seleksia.com")
        .replace(/\{\{company_phone\}\}/g, "0812-3456-7890")
        .replace(/\{\{phone\}\}/g, "0812-3456-7890")
        .replace(/\{\{login_url\}\}/g, "https://seleksia.com/login")
        .replace(/\{\{username\}\}/g, "budi@example.com")
        .replace(/\{\{email\}\}/g, "budi@example.com")
        .replace(/\{\{password\}\}/g, "PSK-001")
        .replace(/\{\{displayId\}\}/g, "PSK-001")
        .replace(/\{\{waktu_pelaksanaan\}\}/g, "02 Agustus 2026 08:00 - 10:00 WIB")
        .replace(/\{\{test_name\}\}/g, "Tes Kemampuan Umum");

    const insertVariable = (variableTag: string) => {
        setFormData(prev => ({
            ...prev,
            content: prev.content + variableTag
        }));
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Manajemen Template Email</h1>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="font-semibold text-slate-800">Daftar Template Undangan</h2>
                        <p className="text-sm text-slate-500">Sesuaikan template email undangan seleksi per perusahaan.</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Template
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Nama Template</th>
                                <th className="px-6 py-4">Subjek</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Memuat data...</td>
                                </tr>
                            ) : templates.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Belum ada template email</td>
                                </tr>
                            ) : (
                                templates.map((template) => (
                                    <tr key={template.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-800">{template.name}</td>
                                        <td className="px-6 py-4">{template.subject}</td>
                                        <td className="px-6 py-4 text-center">
                                            {template.isDefault ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Default
                                                </span>
                                            ) : (
                                                <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                    Alternatif
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(template)}
                                                    className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                {!template.isDefault && (
                                                    <button
                                                        onClick={() => handleDeleteClick(template.id)}
                                                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">
                                {editingTemplate ? "Edit Template" : "Tambah Template Baru"}
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form id="templateForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-700">Nama Template</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors text-sm"
                                    placeholder="Cth: Undangan Standar (Sistem)"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-700">Subjek Email</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors text-sm"
                                    placeholder="Cth: Undangan Seleksi - {{company_name}}"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Editor Konten Email</label>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex gap-3 mb-3">
                                    <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold mb-1">Variabel Dinamis yang Tersedia (Klik untuk Menyisipkan):</p>
                                        <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                                            {[
                                                { tag: "{{candidate_name}}", desc: "Nama Kandidat" },
                                                { tag: "{{company_name}}", desc: "Nama Perusahaan" },
                                                { tag: "{{company_email}}", desc: "Email Slug Perusahaan" },
                                                { tag: "{{company_phone}}", desc: "No Telp/WA Perusahaan" },
                                                { tag: "{{login_url}}", desc: "Link Login" },
                                                { tag: "{{username}}", desc: "Username/Email" },
                                                { tag: "{{password}}", desc: "Password" },
                                                { tag: "{{waktu_pelaksanaan}}", desc: "Jadwal Ujian" },
                                            ].map((v) => (
                                                <button
                                                    key={v.tag}
                                                    type="button"
                                                    onClick={() => insertVariable(v.tag)}
                                                    title={`Klik untuk masukkan ${v.desc}`}
                                                    className="bg-white hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 text-blue-700 font-semibold cursor-pointer transition-colors"
                                                >
                                                    {v.tag}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="flex flex-col border border-slate-300 rounded-lg overflow-hidden">
                                        <div className="bg-slate-100 px-3 py-2 border-b border-slate-300 text-xs font-bold text-slate-600 tracking-wider">
                                            HTML CODE
                                        </div>
                                        <textarea
                                            required
                                            rows={16}
                                            value={formData.content}
                                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                            className="w-full p-4 focus:outline-none focus:ring-inset focus:ring-2 focus:ring-teal-500/20 text-sm font-mono leading-relaxed resize-none bg-slate-50 text-slate-800"
                                            placeholder="Tulis konten email (HTML) di sini..."
                                        />
                                    </div>

                                    <div className="flex flex-col border border-slate-300 rounded-lg overflow-hidden">
                                        <div className="bg-slate-100 px-3 py-2 border-b border-slate-300 text-xs font-bold text-slate-600 tracking-wider">
                                            LIVE PREVIEW
                                        </div>
                                        <div
                                            className="flex-1 p-4 bg-white overflow-y-auto"
                                            style={{ minHeight: "350px" }}
                                        >
                                            <div
                                                className="email-preview-content"
                                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.isDefault}
                                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                                />
                                <div>
                                    <span className="block text-sm font-medium text-slate-700">Jadikan Template Utama (Default)</span>
                                    <span className="block text-xs text-slate-500">Template ini akan otomatis digunakan saat menambahkan kandidat baru.</span>
                                </div>
                            </label>
                        </form>

                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="templateForm"
                                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors cursor-pointer"
                            >
                                Simpan Template
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {templateToDelete && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 flex items-start gap-4">
                            <div className="bg-red-100 p-2.5 rounded-full flex-shrink-0 mt-1">
                                <AlertCircle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Hapus Template</h2>
                                <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                                    Apakah Anda yakin ingin menghapus template ini? Tindakan ini tidak dapat dibatalkan.
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setTemplateToDelete(null)}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
