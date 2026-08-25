"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Breadcrumb from "../components/Breadcrumb";

interface Article {
    id: string;
    title: string;
    slug: string;
    excerpt?: string;
    content?: string;
    coverImage?: string;
    status: string;
    createdAt: string;
}

export default function ArtikelListPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

    // Quick AI Modal state
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiTopic, setAiTopic] = useState("");
    const [aiKeywords, setAiKeywords] = useState("");
    const [aiTone, setAiTone] = useState("Professional yet engaging");
    const [aiGenerating, setAiGenerating] = useState(false);

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            const res = await fetch("/api/articles");
            if (res.ok) {
                const data = await res.json();
                setArticles(data);
            }
        } catch (error) {
            console.error("Failed to fetch articles", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus artikel ini?")) return;
        try {
            const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
            if (res.ok) {
                setArticles(articles.filter((a) => a.id !== id));
            } else {
                alert("Gagal menghapus artikel");
            }
        } catch (error) {
            console.error("Error deleting article", error);
        }
    };

    const handleQuickAiGenerate = async () => {
        if (!aiTopic.trim()) {
            return alert("Silakan masukkan topik artikel terlebih dahulu.");
        }

        setAiGenerating(true);
        try {
            // 1. Generate article content using Anthropic AI
            const res = await fetch("/api/articles/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: aiTopic, keywords: aiKeywords, tone: aiTone }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Gagal meng-generate artikel AI.");
            }

            const generatedData = await res.json();

            // 2. Save directly to DB as published article
            const saveRes = await fetch("/api/articles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: generatedData.title,
                    slug: generatedData.slug,
                    excerpt: generatedData.excerpt,
                    content: generatedData.content,
                    coverImage: generatedData.coverImage || "",
                    seoTitle: generatedData.seoTitle || "",
                    seoDescription: generatedData.seoDescription || "",
                    seoKeywords: generatedData.seoKeywords || "",
                    status: "published",
                }),
            });

            if (saveRes.ok) {
                setShowAiModal(false);
                setAiTopic("");
                setAiKeywords("");
                fetchArticles(); // refresh list
                alert("🎉 Artikel AI berhasil dibuat dan dipublikasikan!");
            } else {
                const saveErr = await saveRes.json();
                alert(saveErr.error || "Gagal menyimpan artikel ke database.");
            }
        } catch (error: any) {
            console.error("AI Generation Error", error);
            alert(error.message || "Terjadi kesalahan saat memanggil AI.");
        } finally {
            setAiGenerating(false);
        }
    };

    // Filter & Search Logic
    const filteredArticles = articles.filter((article) => {
        const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              article.slug.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" ? true : article.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalArticles = articles.length;
    const publishedCount = articles.filter((a) => a.status === "published").length;
    const draftCount = articles.filter((a) => a.status === "draft").length;

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black text-[var(--color-text-main)] tracking-tight flex items-center gap-2">
                        <span>Manajemen Konten & Artikel</span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            SEO Engine
                        </span>
                    </h1>
                    <p className="text-xs text-[var(--color-text-sub)]">Kelola artikel publikasi, tingkatkan performa SEO, dan buat konten berbasis AI secara cepat.</p>
                    <Breadcrumb />
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAiModal(true)}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-primary text-white text-xs font-bold shadow-md shadow-purple-500/20 hover:shadow-lg transition-all flex items-center gap-2 btn-press cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-base">auto_awesome</span>
                        Buat Artikel dengan AI
                    </button>
                    <Link
                        href="/konten/create"
                        className="px-4 py-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-primary text-[var(--color-text-main)] text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 btn-press"
                    >
                        <span className="material-symbols-outlined text-base">add</span>
                        Tambah Manual
                    </Link>
                </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-5 rounded-3xl shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Total Artikel</span>
                        <div className="text-3xl font-black text-[var(--color-text-main)]">{totalArticles}</div>
                    </div>
                    <div className="size-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">newspaper</span>
                    </div>
                </div>

                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-5 rounded-3xl shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Dipublikasikan</span>
                        <div className="text-3xl font-black text-emerald-600">{publishedCount}</div>
                    </div>
                    <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">check_circle</span>
                    </div>
                </div>

                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-5 rounded-3xl shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Draft</span>
                        <div className="text-3xl font-black text-amber-600">{draftCount}</div>
                    </div>
                    <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">edit_note</span>
                    </div>
                </div>

                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-5 rounded-3xl shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Portal Artikel</span>
                        <a href="/artikel" target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-1">
                            Kunjungi Portal <span className="material-symbols-outlined text-xs">open_in_new</span>
                        </a>
                    </div>
                    <div className="size-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">public</span>
                    </div>
                </div>
            </div>

            {/* Filter & Controls Bar */}
            <div className="bg-[var(--color-bg-card)] p-4 rounded-3xl border border-[var(--color-border)] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-1 items-center gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-md">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Cari judul artikel atau slug..."
                            className="w-full h-10 pl-10 pr-4 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-primary transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        className="h-10 px-3.5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-main)] outline-none focus:border-primary"
                        value={statusFilter}
                        onChange={(e: any) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Semua Status</option>
                        <option value="published">Dipublikasikan</option>
                        <option value="draft">Draft</option>
                    </select>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-[var(--color-bg-elevated)] border border-[var(--color-border)] p-1 rounded-2xl">
                    <button
                        onClick={() => setViewMode("grid")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                            viewMode === "grid" 
                                ? "bg-[var(--color-bg-card)] text-primary shadow-sm" 
                                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                        }`}
                    >
                        <span className="material-symbols-outlined text-sm">grid_view</span>
                        Grid Card
                    </button>
                    <button
                        onClick={() => setViewMode("table")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                            viewMode === "table" 
                                ? "bg-[var(--color-bg-card)] text-primary shadow-sm" 
                                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                        }`}
                    >
                        <span className="material-symbols-outlined text-sm">table_rows</span>
                        Tabel
                    </button>
                </div>
            </div>

            {/* Articles List Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
                    <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-semibold text-[var(--color-text-sub)]">Memuat daftar artikel...</p>
                </div>
            ) : filteredArticles.length === 0 ? (
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl p-12 text-center space-y-4">
                    <div className="size-16 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl">article</span>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-[var(--color-text-main)]">Tidak ada artikel ditemukan</h3>
                        <p className="text-xs text-[var(--color-text-sub)]">Coba ubah kata kunci pencarian atau buat artikel baru dengan AI Generator.</p>
                    </div>
                    <button
                        onClick={() => setShowAiModal(true)}
                        className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all inline-flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-base">auto_awesome</span>
                        Buat Artikel dengan AI Sekarang
                    </button>
                </div>
            ) : viewMode === "grid" ? (
                /* GRID CARD VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredArticles.map((article) => (
                        <div
                            key={article.id}
                            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                        >
                            {/* Image Header */}
                            <div className="h-44 w-full bg-[var(--color-bg-elevated)] relative overflow-hidden">
                                {article.coverImage ? (
                                    <img
                                        src={article.coverImage}
                                        alt={article.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-5xl text-primary/30">article</span>
                                    </div>
                                )}
                                <div className="absolute top-3 right-3">
                                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider shadow-sm ${
                                        article.status === "published"
                                            ? "bg-emerald-500 text-white"
                                            : "bg-amber-500 text-white"
                                    }`}>
                                        {article.status === "published" ? "Publish" : "Draft"}
                                    </span>
                                </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                                        <span className="material-symbols-outlined text-xs">calendar_today</span>
                                        {new Date(article.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                    </div>
                                    <h2 className="text-base font-bold text-[var(--color-text-main)] group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                                        {article.title}
                                    </h2>
                                    <p className="text-xs text-[var(--color-text-sub)] line-clamp-2 leading-relaxed">
                                        {article.excerpt || "Tidak ada ringkasan."}
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
                                    <a
                                        href={`/artikel/${article.slug}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                    >
                                        Pratinjau <span className="material-symbols-outlined text-xs">arrow_forward</span>
                                    </a>

                                    <div className="flex items-center gap-1">
                                        <Link
                                            href={`/konten/${article.id}/edit`}
                                            className="p-2 rounded-xl bg-[var(--color-bg-elevated)] hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 transition-colors"
                                            title="Edit Artikel"
                                        >
                                            <span className="material-symbols-outlined text-sm">edit</span>
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(article.id)}
                                            className="p-2 rounded-xl bg-[var(--color-bg-elevated)] hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 transition-colors"
                                            title="Hapus Artikel"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* TABLE VIEW */
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">
                                    <th className="p-4 pl-6">Artikel</th>
                                    <th className="p-4">Slug</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Tanggal Dibuat</th>
                                    <th className="p-4 pr-6 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text-sub)]">
                                {filteredArticles.map((article) => (
                                    <tr key={article.id} className="hover:bg-[var(--color-bg-hover)] transition-colors">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-xl bg-[var(--color-bg-elevated)] overflow-hidden flex-shrink-0 border border-[var(--color-border)]">
                                                    {article.coverImage ? (
                                                        <img src={article.coverImage} alt={article.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-primary/40">
                                                            <span className="material-symbols-outlined text-lg">article</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-[var(--color-text-main)] block line-clamp-1">{article.title}</span>
                                                    <span className="text-[10px] text-[var(--color-text-muted)] block line-clamp-1">{article.excerpt}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono text-[10px] text-primary">{article.slug}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                article.status === "published"
                                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                            }`}>
                                                {article.status === "published" ? "Publish" : "Draft"}
                                            </span>
                                        </td>
                                        <td className="p-4 font-medium text-[var(--color-text-main)]">
                                            {new Date(article.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <a
                                                    href={`/artikel/${article.slug}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-1.5 rounded-lg bg-[var(--color-bg-elevated)] hover:text-primary transition-colors"
                                                    title="Lihat Artikel"
                                                >
                                                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                </a>
                                                <Link
                                                    href={`/konten/${article.id}/edit`}
                                                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                    title="Edit"
                                                >
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(article.id)}
                                                    className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                                    title="Hapus"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Quick AI Generator Modal */}
            {showAiModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden relative animate-slide-in-up">
                        
                        {/* Close button */}
                        {!aiGenerating && (
                            <button
                                onClick={() => setShowAiModal(false)}
                                className="absolute right-5 top-5 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        )}

                        {/* Modal Header */}
                        <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-6 text-white">
                            <div className="flex items-center gap-2 text-yellow-300 text-xs font-bold uppercase tracking-wider mb-1">
                                <span className="material-symbols-outlined text-base">auto_awesome</span>
                                Anthropic Claude AI Generator
                            </div>
                            <h3 className="text-xl font-extrabold">Buat Artikel Instan dengan AI</h3>
                            <p className="text-xs text-purple-200 mt-1">AI akan menuliskan artikel SEO lengkap dengan gambar sampul & langsung mempublikasikannya.</p>
                        </div>

                        {/* Modal Form */}
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-main)] mb-1.5">
                                    Topik Utama Artikel *
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Strategi Efektif Rekrutmen Karyawan Generasi Z"
                                    className="w-full h-11 px-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] outline-none focus:border-primary"
                                    value={aiTopic}
                                    onChange={(e) => setAiTopic(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-main)] mb-1.5">
                                    Tone of Voice
                                </label>
                                <select
                                    className="w-full h-10 px-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-main)] outline-none focus:border-primary"
                                    value={aiTone}
                                    onChange={(e) => setAiTone(e.target.value)}
                                >
                                    <option value="Professional yet engaging">Profesional & Menarik</option>
                                    <option value="Casual and Friendly">Santai & Edukatif</option>
                                    <option value="Persuasive & Analytical">Persuasif & Analitis</option>
                                    <option value="Authoritative HR Guide">Panduan HR Pakar</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-main)] mb-1.5">
                                    Keywords SEO (Opsional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="rekrutmen gen z, hr indonesia, cbt"
                                    className="w-full h-10 px-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] outline-none focus:border-primary"
                                    value={aiKeywords}
                                    onChange={(e) => setAiKeywords(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-[var(--color-bg-elevated)] border-t border-[var(--color-border)] flex items-center justify-end gap-3">
                            <button
                                type="button"
                                disabled={aiGenerating}
                                onClick={() => setShowAiModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--color-text-sub)] hover:text-[var(--color-text-main)]"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={aiGenerating}
                                onClick={handleQuickAiGenerate}
                                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all flex items-center gap-2 disabled:opacity-50 btn-press"
                            >
                                {aiGenerating ? (
                                    <>
                                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Menulis & Menyimpan Artikel...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-base">magic_button</span>
                                        <span>Generate & Publikasikan</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
