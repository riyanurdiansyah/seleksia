"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Breadcrumb from "../../components/Breadcrumb";

export default function CreateArtikelPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [aiTopic, setAiTopic] = useState("");
    const [aiKeywords, setAiKeywords] = useState("");
    const [aiTone, setAiTone] = useState("Professional");

    const [formData, setFormData] = useState({
        title: "",
        slug: "",
        content: "",
        excerpt: "",
        coverImage: "",
        seoTitle: "",
        seoDescription: "",
        seoKeywords: "",
        status: "draft",
    });

    const handleGenerateAI = async () => {
        if (!aiTopic) return alert("Silakan masukkan topik artikel terlebih dahulu.");
        
        setGenerating(true);
        try {
            const res = await fetch("/api/articles/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: aiTopic, keywords: aiKeywords, tone: aiTone }),
            });

            if (res.ok) {
                const data = await res.json();
                setFormData({
                    ...formData,
                    title: data.title || "",
                    slug: data.slug || "",
                    excerpt: data.excerpt || "",
                    content: data.content || "",
                    seoTitle: data.seoTitle || "",
                    seoDescription: data.seoDescription || "",
                    seoKeywords: data.seoKeywords || "",
                });
                alert("Artikel berhasil di-generate! Silakan periksa dan edit jika diperlukan.");
            } else {
                const err = await res.json();
                alert(err.error || "Gagal meng-generate artikel");
            }
        } catch (error) {
            console.error("Generate AI Error", error);
            alert("Terjadi kesalahan saat memanggil AI.");
        } finally {
            setGenerating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/articles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                router.push("/konten");
            } else {
                const err = await res.json();
                alert(err.error || "Gagal menyimpan artikel");
            }
        } catch (error) {
            console.error("Save Error", error);
            alert("Terjadi kesalahan saat menyimpan artikel.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">
                    Tambah Artikel
                </h1>
                <Breadcrumb />
            </div>

            {/* AI Generator Box */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-[var(--radius-lg)] border border-indigo-100 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-indigo-600 text-2xl">auto_awesome</span>
                    <h2 className="text-lg font-bold text-indigo-900">Generate dengan AI</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-indigo-900 mb-1">Topik Utama</label>
                        <input
                            type="text"
                            placeholder="Contoh: Pentingnya psikotes dalam rekrutmen"
                            className="w-full px-4 py-2 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-indigo-900 mb-1">Nada Tulisan (Tone)</label>
                        <select
                            className="w-full px-4 py-2 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            value={aiTone}
                            onChange={(e) => setAiTone(e.target.value)}
                        >
                            <option value="Professional">Profesional & Informatif</option>
                            <option value="Casual">Santai & Menarik</option>
                            <option value="Persuasive">Persuasif & Meyakinkan</option>
                        </select>
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-indigo-900 mb-1">Keywords SEO (Opsional)</label>
                        <input
                            type="text"
                            placeholder="Contoh: rekrutmen karyawan, psikotes online, seleksi kerja"
                            className="w-full px-4 py-2 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            value={aiKeywords}
                            onChange={(e) => setAiKeywords(e.target.value)}
                        />
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={generating}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {generating ? (
                        <>
                            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Sedang Membuat Artikel...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-sm">edit_document</span>
                            Buat Draft dengan AI
                        </>
                    )}
                </button>
            </div>

            {/* Manual Form */}
            <form onSubmit={handleSubmit} className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm overflow-hidden">
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4 md:col-span-2">
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-main)] mb-1">Judul Artikel *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors"
                                    value={formData.title}
                                    onChange={(e) => {
                                        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                                        setFormData({ ...formData, title: e.target.value, slug });
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-main)] mb-1">Slug URL *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 md:col-span-2">
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-main)] mb-1">Ringkasan (Excerpt) *</label>
                                <textarea
                                    required
                                    rows={2}
                                    className="w-full px-4 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors"
                                    value={formData.excerpt}
                                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-main)] mb-1">Konten Artikel (Markdown) *</label>
                                <textarea
                                    required
                                    rows={12}
                                    className="w-full px-4 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors font-mono"
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* SEO Fields */}
                        <div className="space-y-4 md:col-span-2 pt-4 border-t border-[var(--color-border)]">
                            <h3 className="text-lg font-semibold text-[var(--color-text-main)]">Pengaturan SEO</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-main)] mb-1">SEO Title</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors"
                                        value={formData.seoTitle}
                                        onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-main)] mb-1">SEO Keywords</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors"
                                        value={formData.seoKeywords}
                                        onChange={(e) => setFormData({ ...formData, seoKeywords: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-[var(--color-text-main)] mb-1">SEO Description</label>
                                    <textarea
                                        rows={2}
                                        className="w-full px-4 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors"
                                        value={formData.seoDescription}
                                        onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 md:col-span-2 pt-4 border-t border-[var(--color-border)]">
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-main)] mb-1">Status Publikasi</label>
                                <select
                                    className="w-full md:w-1/3 px-4 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="draft">Draft (Disembunyikan)</option>
                                    <option value="published">Publish (Tampilkan)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-[var(--color-bg-elevated)] border-t border-[var(--color-border)] flex items-center justify-end gap-3">
                    <Link
                        href="/konten"
                        className="px-4 py-2 text-sm font-medium text-[var(--color-text-sub)] hover:text-[var(--color-text-main)] transition-colors"
                    >
                        Batal
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <span className="material-symbols-outlined text-[18px]">save</span>
                        )}
                        Simpan Artikel
                    </button>
                </div>
            </form>
        </div>
    );
}
