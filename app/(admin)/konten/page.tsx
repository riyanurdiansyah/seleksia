"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Breadcrumb from "../components/Breadcrumb";

interface Article {
    id: string;
    title: string;
    slug: string;
    status: string;
    createdAt: string;
}

export default function ArtikelListPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">
                        Artikel (SEO)
                    </h1>
                    <Breadcrumb />
                </div>
                <Link
                    href="/konten/create"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Tambah Artikel
                </Link>
            </div>

            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)] border-b border-[var(--color-border)] uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Judul</th>
                                <th className="px-6 py-4">Slug</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Tanggal Dibuat</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-[var(--color-text-muted)]">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                            Memuat data...
                                        </div>
                                    </td>
                                </tr>
                            ) : articles.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-[var(--color-text-muted)]">
                                        Belum ada artikel.
                                    </td>
                                </tr>
                            ) : (
                                articles.map((article) => (
                                    <tr key={article.id} className="hover:bg-[var(--color-bg-elevated)]/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-[var(--color-text-main)]">
                                            {article.title}
                                        </td>
                                        <td className="px-6 py-4 text-[var(--color-text-sub)]">
                                            {article.slug}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                                article.status === "published" 
                                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                                                : "bg-amber-100 text-amber-700 border border-amber-200"
                                            }`}>
                                                {article.status === "published" ? "Dipublikasikan" : "Draft"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-[var(--color-text-sub)]">
                                            {new Date(article.createdAt).toLocaleDateString("id-ID")}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/konten/${article.id}/edit`}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                    title="Edit"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(article.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Hapus"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
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
        </div>
    );
}
