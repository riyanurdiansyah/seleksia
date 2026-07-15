"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Breadcrumb from "../../../components/Breadcrumb";

export default function EditArtikelPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

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

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                const res = await fetch(`/api/articles/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setFormData({
                        title: data.title || "",
                        slug: data.slug || "",
                        content: data.content || "",
                        excerpt: data.excerpt || "",
                        coverImage: data.coverImage || "",
                        seoTitle: data.seoTitle || "",
                        seoDescription: data.seoDescription || "",
                        seoKeywords: data.seoKeywords || "",
                        status: data.status || "draft",
                    });
                } else {
                    alert("Artikel tidak ditemukan");
                    router.push("/konten");
                }
            } catch (error) {
                console.error("Fetch Error", error);
            } finally {
                setFetching(false);
            }
        };

        if (id) {
            fetchArticle();
        }
    }, [id, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`/api/articles/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                router.push("/konten");
            } else {
                const err = await res.json();
                alert(err.error || "Gagal mengupdate artikel");
            }
        } catch (error) {
            console.error("Save Error", error);
            alert("Terjadi kesalahan saat mengupdate artikel.");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex flex-col items-center py-20 text-[var(--color-text-muted)] gap-3">
                <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Memuat data artikel...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">
                    Edit Artikel
                </h1>
                <Breadcrumb />
            </div>

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
                        Simpan Perubahan
                    </button>
                </div>
            </form>
        </div>
    );
}
