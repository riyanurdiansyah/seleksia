"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, CheckCircle, AlertCircle, Info } from "lucide-react";

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
                content: `Halo <strong>{{candidate_name}}</strong>,<br/><br/>Anda telah diundang untuk mengikuti asesmen di platform <strong>{{company_name}}</strong>.<br/><br/>Berikut adalah informasi akun Anda untuk masuk ke sistem:<br/><br/>URL Login: <a href="{{login_url}}">{{login_url}}</a><br/>Username: {{username}}<br/>Password: {{password}}<br/><br/>Silakan masuk dan segera ganti kata sandi Anda demi keamanan.`,
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

    const handleDelete = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus template ini?")) return;
        
        try {
            const res = await fetch(`/api/email-templates/${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchTemplates();
            }
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    // Mock data for preview
    const previewHtml = formData.content
        .replace(/\{\{candidate_name\}\}/g, "Budi Santoso")
        .replace(/\{\{company_name\}\}/g, "PT Contoh Perusahaan")
        .replace(/\{\{login_url\}\}/g, "https://seleksia.com/login")
        .replace(/\{\{username\}\}/g, "budi@example.com")
        .replace(/\{\{password\}\}/g, "PSK-001");

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Manajemen Template Email</h1>
                    <p className="text-slate-500 text-sm mt-1">Kelola template email untuk undangan asesmen kandidat</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium whitespace-nowrap"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Template
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Nama Template</th>
                                <th className="px-6 py-4">Subjek Email</th>
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
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(template.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">
                                {editingTemplate ? "Edit Template" : "Tambah Template"}
                            </h2>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                                &times;
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            <form id="templateForm" onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-700">Nama Template</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors text-sm"
                                        placeholder="Cth: Undangan Standar"
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
                                            <p className="font-semibold mb-1">Variabel Dinamis yang Tersedia:</p>
                                            <div className="flex flex-wrap gap-2 text-xs font-mono">
                                                <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">{"{{candidate_name}}"}</span>
                                                <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">{"{{company_name}}"}</span>
                                                <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">{"{{login_url}}"}</span>
                                                <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">{"{{username}}"}</span>
                                                <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">{"{{password}}"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {/* HTML Editor */}
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

                                        {/* Live Preview */}
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
                        </div>
                        
                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="templateForm"
                                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                            >
                                Simpan Template
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
