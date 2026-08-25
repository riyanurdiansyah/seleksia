"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import Breadcrumb from "../../components/Breadcrumb";

const UNSPLASH_PRESETS = [
    { label: "Rekrutmen / HR", url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80" },
    { label: "Tim & Diskusi", url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80" },
    { label: "Wawancara Kerja", url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80" },
    { label: "Psikotes & AI", url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80" },
    { label: "Kantor Modern", url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80" }
];

export default function CreateArtikelPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
    const [showAiBox, setShowAiBox] = useState(true);

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
        status: "published",
    });

    const handleGenerateAI = async () => {
        if (!aiTopic) return alert("Silakan masukkan topik utama artikel terlebih dahulu.");

        setGenerating(true);
        try {
            const res = await fetch("/api/articles/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: aiTopic, keywords: aiKeywords, tone: aiTone }),
            });

            if (res.ok) {
                const data = await res.json();
                setFormData((prev) => ({
                    ...prev,
                    title: data.title || prev.title,
                    slug: data.slug || prev.slug,
                    excerpt: data.excerpt || prev.excerpt,
                    content: data.content || prev.content,
                    seoTitle: data.seoTitle || prev.seoTitle,
                    seoDescription: data.seoDescription || prev.seoDescription,
                    seoKeywords: data.seoKeywords || prev.seoKeywords,
                    coverImage: data.coverImage || prev.coverImage,
                }));
            } else {
                const err = await res.json();
                alert(err.error || "Gagal meng-generate artikel dengan AI");
            }
        } catch (error) {
            console.error("Generate AI Error", error);
            alert("Terjadi kesalahan saat menghubungi server AI.");
        } finally {
            setGenerating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.content) {
            return alert("Judul dan Konten Artikel wajib diisi.");
        }

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

    const insertMarkdown = (prefix: string, suffix: string = "") => {
        const textarea = document.getElementById("content-textarea") as HTMLTextAreaElement;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end) || "Teks di sini";
        const replacement = `${prefix}${selectedText}${suffix}`;
        const newText = text.substring(0, start) + replacement + text.substring(end);
        setFormData({ ...formData, content: newText });
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Link href="/konten" className="text-xs text-[var(--color-text-muted)] hover:text-primary transition-colors flex items-center gap-1 font-semibold">
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            Kembali ke Daftar Konten
                        </Link>
                    </div>
                    <h1 className="text-2xl font-black text-[var(--color-text-main)] tracking-tight flex items-center gap-2">
                        <span>Buat Artikel Baru</span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            SEO Studio
                        </span>
                    </h1>
                    <Breadcrumb />
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setShowAiBox(!showAiBox)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            showAiBox 
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200" 
                                : "bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)] border border-[var(--color-border)] hover:text-purple-600"
                        }`}
                    >
                        <span className="material-symbols-outlined text-base">auto_awesome</span>
                        {showAiBox ? "Sembunyikan AI Studio" : "Buka AI Studio"}
                    </button>
                </div>
            </div>

            {/* AI Generator Box Banner */}
            {showAiBox && (
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-6 md:p-8 text-white shadow-xl border border-purple-500/30 animate-slide-in-up">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-yellow-300">
                                    <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold tracking-tight">AI Content Writer (Anthropic Claude)</h2>
                                    <p className="text-xs text-purple-200">Ketik topik & kata kunci, AI akan otomatis membuatkan artikel SEO lengkap dengan gambar & meta tags.</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-purple-200 mb-1.5">Topik Utama Artikel *</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Pentingnya Psikotes Online dalam Rekrutmen Karyawan Modern"
                                    className="w-full h-10 px-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-purple-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white/15 transition-all"
                                    value={aiTopic}
                                    onChange={(e) => setAiTopic(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-purple-200 mb-1.5">Tone of Voice</label>
                                <select
                                    className="w-full h-10 px-4 rounded-xl bg-slate-800 text-white border border-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
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
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-purple-200 mb-1.5">Keywords SEO (Opsional)</label>
                                <input
                                    type="text"
                                    placeholder="psikotes online, cbt, hr"
                                    className="w-full h-10 px-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-purple-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white/15 transition-all"
                                    value={aiKeywords}
                                    onChange={(e) => setAiKeywords(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end pt-2">
                            <button
                                type="button"
                                onClick={handleGenerateAI}
                                disabled={generating}
                                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition-all flex items-center gap-2 disabled:opacity-50 btn-press cursor-pointer"
                            >
                                {generating ? (
                                    <>
                                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>AI Sedang Menulis Artikel...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-base">magic_button</span>
                                        <span>Generate Artikel dengan AI</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Form (2-Column Layout) */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Content Editor (2 cols) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Title & Slug */}
                    <div className="bg-[var(--color-bg-card)] rounded-3xl border border-[var(--color-border)] p-6 shadow-sm space-y-4">
                        <div>
                            <label className="block text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                Judul Artikel *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Masukkan judul artikel yang menarik..."
                                className="w-full h-12 px-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-base font-bold text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                value={formData.title}
                                onChange={(e) => {
                                    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                                    setFormData({ ...formData, title: e.target.value, slug });
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                Slug URL *
                            </label>
                            <div className="flex items-center bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl px-3 h-10 text-xs text-[var(--color-text-muted)]">
                                <span className="font-semibold text-primary select-none">seleksia.com/artikel/</span>
                                <input
                                    type="text"
                                    required
                                    className="flex-1 bg-transparent text-[var(--color-text-main)] font-semibold outline-none px-1"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                Ringkasan (Excerpt / Teaser) *
                            </label>
                            <textarea
                                required
                                rows={2}
                                placeholder="Tulis ringkasan singkat 1-2 kalimat untuk pratinjau artikel di halaman depan..."
                                className="w-full p-3.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                value={formData.excerpt}
                                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Content Editor with Write vs Live Preview Tab */}
                    <div className="bg-[var(--color-bg-card)] rounded-3xl border border-[var(--color-border)] p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("write")}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                        activeTab === "write" 
                                            ? "bg-primary text-white shadow-md shadow-primary/20" 
                                            : "text-[var(--color-text-sub)] hover:bg-[var(--color-bg-elevated)]"
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-sm">edit_note</span>
                                    Write (Markdown)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("preview")}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                        activeTab === "preview" 
                                            ? "bg-primary text-white shadow-md shadow-primary/20" 
                                            : "text-[var(--color-text-sub)] hover:bg-[var(--color-bg-elevated)]"
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                    Live Preview
                                </button>
                            </div>

                            {/* Markdown Toolbar */}
                            {activeTab === "write" && (
                                <div className="hidden sm:flex items-center gap-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] p-1 rounded-xl">
                                    <button type="button" onClick={() => insertMarkdown("## ")} title="Heading 2" className="px-2 py-1 text-xs font-bold text-[var(--color-text-sub)] hover:text-primary rounded">H2</button>
                                    <button type="button" onClick={() => insertMarkdown("### ")} title="Heading 3" className="px-2 py-1 text-xs font-bold text-[var(--color-text-sub)] hover:text-primary rounded">H3</button>
                                    <button type="button" onClick={() => insertMarkdown("**", "**")} title="Bold" className="px-2 py-1 text-xs font-bold text-[var(--color-text-sub)] hover:text-primary rounded">B</button>
                                    <button type="button" onClick={() => insertMarkdown("*", "*")} title="Italic" className="px-2 py-1 text-xs italic text-[var(--color-text-sub)] hover:text-primary rounded">I</button>
                                    <button type="button" onClick={() => insertMarkdown("- ")} title="List" className="px-2 py-1 text-xs text-[var(--color-text-sub)] hover:text-primary rounded">• List</button>
                                    <button type="button" onClick={() => insertMarkdown("> ")} title="Quote" className="px-2 py-1 text-xs text-[var(--color-text-sub)] hover:text-primary rounded">“ Quote</button>
                                </div>
                            )}
                        </div>

                        {activeTab === "write" ? (
                            <div>
                                <textarea
                                    id="content-textarea"
                                    required
                                    rows={18}
                                    placeholder="Tulis konten artikel dalam format Markdown..."
                                    className="w-full p-4 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm font-mono text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none leading-relaxed"
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                />
                            </div>
                        ) : (
                            <div className="min-h-[400px] p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[var(--color-border)] prose prose-slate max-w-none dark:prose-invert">
                                {formData.content ? (
                                    <ReactMarkdown>{formData.content}</ReactMarkdown>
                                ) : (
                                    <p className="text-slate-400 italic text-center py-12">Belum ada konten untuk ditampilkan.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Settings & SEO (1 col) */}
                <div className="space-y-6">
                    
                    {/* Status & Publish */}
                    <div className="bg-[var(--color-bg-card)] rounded-3xl border border-[var(--color-border)] p-6 shadow-sm space-y-4">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-main)] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base text-primary">publish</span>
                            Publikasi & Pengaturan
                        </h3>

                        <div>
                            <label className="block text-xs font-bold text-[var(--color-text-sub)] mb-1.5">Status Artikel</label>
                            <select
                                className="w-full h-10 px-3.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-main)] outline-none focus:border-primary"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="published">Dipublikasikan (Live)</option>
                                <option value="draft">Draft (Disembunyikan)</option>
                            </select>
                        </div>

                        <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-end gap-2">
                            <Link href="/konten" className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--color-text-sub)] hover:bg-[var(--color-bg-elevated)]">
                                Batal
                            </Link>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold text-xs shadow-md shadow-primary/20 transition-all flex items-center gap-1.5 disabled:opacity-50 btn-press"
                            >
                                {loading ? (
                                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <span className="material-symbols-outlined text-base">save</span>
                                )}
                                Simpan Artikel
                            </button>
                        </div>
                    </div>

                    {/* Cover Image Card */}
                    <div className="bg-[var(--color-bg-card)] rounded-3xl border border-[var(--color-border)] p-6 shadow-sm space-y-4">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-main)] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base text-primary">image</span>
                            Gambar Sampul (Cover Image)
                        </h3>

                        {/* Image Live Preview */}
                        <div className="w-full aspect-video rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] overflow-hidden relative group">
                            {formData.coverImage ? (
                                <img src={formData.coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[var(--color-text-muted)]">
                                    <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                                    <span className="text-[11px] font-semibold">Belum ada gambar</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <input
                                type="text"
                                placeholder="Paste URL Gambar (https://...)"
                                className="w-full h-10 px-3.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] outline-none focus:border-primary"
                                value={formData.coverImage}
                                onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                            />
                        </div>

                        {/* Unsplash Quick Presets */}
                        <div>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Pilih Preset Unsplash:</span>
                            <div className="flex flex-wrap gap-1.5">
                                {UNSPLASH_PRESETS.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, coverImage: preset.url })}
                                        className="px-2.5 py-1 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] hover:border-primary text-[10px] font-semibold text-[var(--color-text-sub)] transition-colors"
                                    >
                                        + {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* SEO Settings & Google SERP Preview Card */}
                    <div className="bg-[var(--color-bg-card)] rounded-3xl border border-[var(--color-border)] p-6 shadow-sm space-y-4">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-main)] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base text-primary">search</span>
                            Pengaturan SEO & SERP
                        </h3>

                        {/* Google SERP Live Snippet Card */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-inner">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Google Search Preview</span>
                            <div className="text-[11px] text-slate-600 truncate">https://seleksia.com/artikel/{formData.slug || "slug-artikel"}</div>
                            <div className="text-sm font-bold text-blue-700 hover:underline line-clamp-1">
                                {formData.seoTitle || formData.title || "Judul Artikel di Hasil Pencarian Google"}
                            </div>
                            <div className="text-xs text-slate-600 line-clamp-2">
                                {formData.seoDescription || formData.excerpt || "Deskripsi meta artikel yang akan tampil di halaman pencarian Google..."}
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-[var(--color-text-sub)]">SEO Title</label>
                                <span className="text-[10px] text-[var(--color-text-muted)]">{formData.seoTitle.length}/60</span>
                            </div>
                            <input
                                type="text"
                                maxLength={60}
                                placeholder="Meta Title untuk Google..."
                                className="w-full h-9 px-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] outline-none focus:border-primary"
                                value={formData.seoTitle}
                                onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-[var(--color-text-sub)]">SEO Description</label>
                                <span className="text-[10px] text-[var(--color-text-muted)]">{formData.seoDescription.length}/160</span>
                            </div>
                            <textarea
                                rows={2}
                                maxLength={160}
                                placeholder="Meta description untuk Google..."
                                className="w-full p-2.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] outline-none focus:border-primary"
                                value={formData.seoDescription}
                                onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[var(--color-text-sub)] mb-1">SEO Keywords</label>
                            <input
                                type="text"
                                placeholder="Contoh: psikotes, rekrutmen, cbt"
                                className="w-full h-9 px-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] outline-none focus:border-primary"
                                value={formData.seoKeywords}
                                onChange={(e) => setFormData({ ...formData, seoKeywords: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
