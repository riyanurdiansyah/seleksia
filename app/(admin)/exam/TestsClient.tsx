"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ConfirmDialog from "../components/ConfirmDialog";

/* ===== Types ===== */
type QuestionType =
    | "multiple_choice"
    | "true_false"
    | "likert_scale"
    | "forced_choice"
    | "number_series"
    | "image_pattern"
    | "essay";

type TestCategory =
    | "intelligence"
    | "personality"
    | "aptitude"
    | "projective";

interface Question {
    id: string;
    displayId: string;
    type: QuestionType;
    text: string;
    options: string[];
    imageUrl?: string | null;
    correctAnswer?: string | null;
    timeLimit?: number | null;
    sortOrder: number;
}

interface Test {
    id: string;
    displayId: string;
    name: string;
    category: TestCategory;
    questionType: QuestionType;
    description: string | null;
    questions: Question[];
    duration: number;
    status: "draft" | "published" | "archived";
    createdAt: string;
}

/* ===== Constants ===== */
const questionTypeConfig: Record<
    QuestionType,
    { label: string; icon: string; desc: string }
> = {
    multiple_choice: {
        label: "Multiple Choice",
        icon: "radio_button_checked",
        desc: "Pilihan ganda A-E",
    },
    true_false: {
        label: "True / False",
        icon: "toggle_on",
        desc: "Benar atau salah",
    },
    likert_scale: {
        label: "Likert Scale",
        icon: "linear_scale",
        desc: "Skala 1-5 (Sangat Tidak Setuju - Sangat Setuju)",
    },
    forced_choice: {
        label: "Forced Choice",
        icon: "compare_arrows",
        desc: "Pilih yang paling/kurang sesuai",
    },
    number_series: {
        label: "Number Series",
        icon: "pin",
        desc: "Deret angka / perhitungan cepat",
    },
    image_pattern: {
        label: "Image Pattern",
        icon: "grid_view",
        desc: "Pola gambar / matriks visual",
    },
    essay: {
        label: "Essay",
        icon: "edit_note",
        desc: "Jawaban uraian / pendek",
    },
};

const categoryConfig: Record<
    TestCategory,
    { label: string; icon: string; color: string }
> = {
    intelligence: {
        label: "Intelligence",
        icon: "psychology",
        color: "text-[var(--color-accent)] bg-[var(--color-accent-light)]",
    },
    personality: {
        label: "Personality",
        icon: "mood",
        color: "text-pink-600 bg-pink-50 dark:bg-pink-900/20",
    },
    aptitude: {
        label: "Aptitude",
        icon: "school",
        color: "text-[var(--color-warning)] bg-[var(--color-warning-light)]",
    },
    projective: {
        label: "Projective",
        icon: "draw",
        color: "text-teal-600 bg-teal-50 dark:bg-teal-900/20",
    },
};

const statusConfig: Record<
    Test["status"],
    { label: string; bg: string; text: string }
> = {
    draft: {
        label: "Draft",
        bg: "bg-[var(--color-bg-elevated)]",
        text: "text-[var(--color-text-sub)]",
    },
    published: {
        label: "Published",
        bg: "bg-[var(--color-success-light)]",
        text: "text-[var(--color-success)]",
    },
    archived: {
        label: "Archived",
        bg: "bg-[var(--color-bg-elevated)]",
        text: "text-[var(--color-text-muted)]",
    },
};

/* ===== Psychotest Templates ===== */
const psikotestTemplates = [
    { name: "IST (Intelligenz Struktur Test)", category: "intelligence" as TestCategory, questionType: "multiple_choice" as QuestionType, desc: "Tes inteligensi terstruktur: verbal, numerik, spasial", subtests: ["SE", "WA", "AN", "GE", "ME", "RA", "ZR", "FA", "WU"] },
    { name: "CFIT (Culture Fair Intelligence Test)", category: "intelligence" as TestCategory, questionType: "image_pattern" as QuestionType, desc: "Tes kecerdasan non-verbal dengan pola gambar", subtests: ["Series", "Classification", "Matrices", "Conditions"] },
    { name: "TPA (Tes Potensi Akademik)", category: "aptitude" as TestCategory, questionType: "multiple_choice" as QuestionType, desc: "Verbal, numerik, dan logika penalaran", subtests: ["Verbal", "Numerik", "Logika"] },
    { name: "Army Alpha", category: "intelligence" as TestCategory, questionType: "multiple_choice" as QuestionType, desc: "Tes inteligensi umum kelompok", subtests: [] },
    { name: "Kraepelin / Pauli", category: "aptitude" as TestCategory, questionType: "number_series" as QuestionType, desc: "Tes kecepatan & ketelitian perhitungan", subtests: [] },
    { name: "DISC Assessment", category: "personality" as TestCategory, questionType: "forced_choice" as QuestionType, desc: "Dominance, Influence, Steadiness, Compliance", subtests: ["D", "I", "S", "C"] },
    { name: "EPPS (Edwards Personal Preference)", category: "personality" as TestCategory, questionType: "forced_choice" as QuestionType, desc: "15 kebutuhan psikologis dasar", subtests: [] },
    { name: "MBTI", category: "personality" as TestCategory, questionType: "forced_choice" as QuestionType, desc: "Myers-Briggs Type Indicator — 16 tipe kepribadian", subtests: ["E/I", "S/N", "T/F", "J/P"] },
    { name: "Big Five / NEO-PI", category: "personality" as TestCategory, questionType: "likert_scale" as QuestionType, desc: "Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism", subtests: ["O", "C", "E", "A", "N"] },
    { name: "PAPI Kostick", category: "personality" as TestCategory, questionType: "forced_choice" as QuestionType, desc: "Persepsi diri dalam lingkungan kerja", subtests: [] },
    { name: "Wartegg Test", category: "projective" as TestCategory, questionType: "essay" as QuestionType, desc: "Melengkapi gambar dari stimulus visual", subtests: [] },
    { name: "DAP (Draw A Person)", category: "projective" as TestCategory, questionType: "essay" as QuestionType, desc: "Tes menggambar orang — proyektif", subtests: [] },
];

/* ===== Component ===== */
export default function TestsClient() {
    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [showTemplates, setShowTemplates] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

    const [newTest, setNewTest] = useState({
        name: "",
        category: "intelligence" as TestCategory,
        questionType: "multiple_choice" as QuestionType,
        description: "",
        duration: 30,
    });

    const [newQuestion, setNewQuestion] = useState({
        text: "",
        type: "multiple_choice" as QuestionType,
        options: ["", "", "", "", ""],
        correctAnswer: "",
        timeLimit: 0,
    });

    /* Fetch tests from API */
    const fetchTests = useCallback(async () => {
        try {
            const res = await fetch("/api/tests");
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setTests(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTests();
    }, [fetchTests]);

    /* Filtering */
    const filtered = tests.filter((t) => {
        const matchSearch =
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.displayId.toLowerCase().includes(search.toLowerCase());
        const matchCategory = filterCategory === "all" || t.category === filterCategory;
        const matchStatus = filterStatus === "all" || t.status === filterStatus;
        return matchSearch && matchCategory && matchStatus;
    });

    /* Create test */
    const handleCreateTest = async () => {
        if (!newTest.name) return;
        try {
            const res = await fetch("/api/tests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newTest),
            });
            if (!res.ok) throw new Error("Failed to create");
            const created = await res.json();
            setTests((prev) => [created, ...prev]);
            setNewTest({ name: "", category: "intelligence", questionType: "multiple_choice", description: "", duration: 30 });
            setShowCreateModal(false);
        } catch (err) {
            console.error(err);
        }
    };

    /* Create from template */
    const handleCreateFromTemplate = async (tmpl: (typeof psikotestTemplates)[0]) => {
        try {
            const res = await fetch("/api/tests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: tmpl.name, category: tmpl.category, questionType: tmpl.questionType, description: tmpl.desc, duration: 30 }),
            });
            if (!res.ok) throw new Error("Failed to create");
            const created = await res.json();
            setTests((prev) => [created, ...prev]);
            setShowCreateModal(false);
        } catch (err) {
            console.error(err);
        }
    };

    /* Add question to test */
    const handleAddQuestion = async () => {
        if (!newQuestion.text || !selectedTestId) return;
        const test = tests.find((t) => t.id === selectedTestId);
        if (!test) return;
        try {
            const res = await fetch(`/api/tests/${selectedTestId}/questions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: newQuestion.type,
                    text: newQuestion.text,
                    options: newQuestion.type === "essay" ? [] : newQuestion.options.filter((o) => o.trim() !== ""),
                    correctAnswer: newQuestion.correctAnswer || null,
                    timeLimit: newQuestion.timeLimit || null,
                }),
            });
            if (!res.ok) throw new Error("Failed to add question");
            const q = await res.json();
            setTests((prev) => prev.map((t) => t.id === selectedTestId ? { ...t, questions: [...t.questions, q] } : t));
            setNewQuestion({ text: "", type: test.questionType, options: ["", "", "", "", ""], correctAnswer: "", timeLimit: 0 });
        } catch (err) {
            console.error(err);
        }
    };

    /* Delete test */
    const handleDeleteTest = async (id: string) => {
        try {
            const res = await fetch(`/api/tests/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
            setTests((prev) => prev.filter((t) => t.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    /* Toggle status */
    const togglePublish = async (id: string) => {
        const test = tests.find((t) => t.id === id);
        if (!test) return;
        const newStatus = test.status === "published" ? "draft" : "published";
        try {
            const res = await fetch(`/api/tests/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error("Failed to update");
            const updated = await res.json();
            setTests((prev) => prev.map((t) => (t.id === id ? updated : t)));
        } catch (err) {
            console.error(err);
        }
    };

    /* Open add question modal */
    const openAddQuestion = (testId: string) => {
        const test = tests.find((t) => t.id === testId);
        setSelectedTestId(testId);
        setNewQuestion({ text: "", type: test?.questionType || "multiple_choice", options: ["", "", "", "", ""], correctAnswer: "", timeLimit: 0 });
        setShowAddQuestionModal(true);
    };

    const selectedTest = tests.find((t) => t.id === selectedTestId);

    return (
        <>
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-in-up">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">Tests</h1>
                    <p className="text-sm text-[var(--color-text-sub)] mt-1">Manage psychotest batteries and question banks.</p>
                </div>
                <button onClick={() => { setShowTemplates(true); setShowCreateModal(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press">
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    Create Test
                </button>
            </div>

            {/* Filters */}
            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-4 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-text-muted)]">
                        <span className="material-symbols-outlined text-[20px]">search</span>
                    </span>
                    <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] focus:bg-[var(--color-bg-card)] transition-all duration-300" placeholder="Search tests..." />
                </div>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-sub)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] cursor-pointer transition-all duration-300">
                    <option value="all">All Categories</option>
                    <option value="intelligence">Intelligence</option>
                    <option value="personality">Personality</option>
                    <option value="aptitude">Aptitude</option>
                    <option value="projective">Projective</option>
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-sub)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] cursor-pointer transition-all duration-300">
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                </select>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Tests", count: tests.length, icon: "quiz", color: "text-primary bg-[var(--color-primary-light)]" },
                    { label: "Published", count: tests.filter((t) => t.status === "published").length, icon: "check_circle", color: "text-[var(--color-success)] bg-[var(--color-success-light)]" },
                    { label: "Draft", count: tests.filter((t) => t.status === "draft").length, icon: "edit_note", color: "text-[var(--color-warning)] bg-[var(--color-warning-light)]" },
                    { label: "Total Questions", count: tests.reduce((acc, t) => acc + t.questions.length, 0), icon: "help", color: "text-primary bg-[var(--color-primary-light)] dark:bg-blue-900/20" },
                ].map((s) => (
                    <div key={s.label} className="bg-[var(--color-bg-card)] p-4 rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] flex items-center gap-3 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:translate-y-[-2px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
                        <div className={`p-2 rounded-[var(--radius-sm)] ${s.color}`}>
                            <span className="material-symbols-outlined">{s.icon}</span>
                        </div>
                        <div>
                            <p className="text-xs text-[var(--color-text-muted)]">{s.label}</p>
                            <p className="text-xl font-bold text-[var(--color-text-main)]">{s.count}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Test Cards Grid */}
            {loading ? (
                <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-[var(--color-text-muted)] mb-2 block animate-spin">progress_activity</span>
                    <p className="text-[var(--color-text-muted)]">Loading tests...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-[var(--color-text-muted)] mb-2 block">quiz</span>
                    <p className="text-[var(--color-text-muted)]">No tests found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((test) => {
                        const cat = categoryConfig[test.category];
                        const st = statusConfig[test.status];
                        const qt = questionTypeConfig[test.questionType];
                        return (
                            <div key={test.id} className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] hover:border-[var(--color-border-strong)] hover:translate-y-[-2px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col relative overflow-hidden">
                                <div className="card-shimmer"></div>
                                <div className="p-5 flex-1">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`p-2 rounded-[var(--radius-sm)] ${cat.color}`}>
                                            <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
                                        </div>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${st.bg} ${st.text}`}>{st.label}</span>
                                    </div>
                                    <Link href={`/admin/tests/${test.id}`} className="font-bold text-[var(--color-text-main)] text-sm leading-tight mb-1 hover:text-primary transition-colors block">{test.name}</Link>
                                    <p className="text-xs text-[var(--color-text-muted)] mb-3 line-clamp-2">{test.description}</p>
                                    <div className="flex flex-wrap gap-2 text-[10px]">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)]">
                                            <span className="material-symbols-outlined text-[12px]">{qt.icon}</span>{qt.label}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)]">
                                            <span className="material-symbols-outlined text-[12px]">help</span>{test.questions.length} Questions
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)]">
                                            <span className="material-symbols-outlined text-[12px]">timer</span>{test.duration} min
                                        </span>
                                    </div>
                                </div>
                                <div className="px-5 py-3 border-t border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-hover)]">
                                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{test.displayId}</span>
                                    <div className="flex items-center gap-1">
                                        <Link href={`/admin/tests/${test.id}`} className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-primary hover:bg-[var(--color-bg-hover)] transition-colors" title="View & Edit">
                                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                                        </Link>
                                        <button onClick={() => openAddQuestion(test.id)} className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-primary hover:bg-[var(--color-bg-hover)] transition-colors" title="Add Question">
                                            <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                        </button>
                                        <button onClick={() => togglePublish(test.id)} className={`p-1.5 rounded-[var(--radius-sm)] transition-colors ${test.status === "published" ? "text-[var(--color-success)] hover:text-[var(--color-warning)] hover:bg-[var(--color-bg-hover)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-success)] hover:bg-[var(--color-bg-hover)]"}`} title={test.status === "published" ? "Unpublish" : "Publish"}>
                                            <span className="material-symbols-outlined text-[18px]">{test.status === "published" ? "unpublished" : "publish"}</span>
                                        </button>
                                        <button onClick={() => setDeleteTarget({ id: test.id, name: test.name })} className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-danger hover:bg-[var(--color-danger-light)] transition-colors" title="Delete">
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* =============== CREATE TEST MODAL =============== */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-[8px] z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0" onClick={() => setShowCreateModal(false)} />
                    <div className="relative w-full max-w-2xl bg-[var(--color-bg-card)] rounded-3xl border border-[var(--color-border-strong)] shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-slide-in-up max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)] flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[var(--color-primary-light)] rounded-[var(--radius-sm)] text-primary">
                                    <span className="material-symbols-outlined">add_circle</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--color-text-main)]">Create New Test</h3>
                                    <p className="text-xs text-[var(--color-text-muted)]">Start from a template or create custom</p>
                                </div>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex border-b border-[var(--color-border)] px-6 flex-shrink-0">
                            <button onClick={() => setShowTemplates(true)} className={`py-3 border-b-2 font-medium text-sm mr-6 transition-colors ${showTemplates ? "border-primary text-primary" : "border-transparent text-[var(--color-text-muted)]"}`}>Psychotest Templates</button>
                            <button onClick={() => setShowTemplates(false)} className={`py-3 border-b-2 font-medium text-sm transition-colors ${!showTemplates ? "border-primary text-primary" : "border-transparent text-[var(--color-text-muted)]"}`}>Custom Test</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {showTemplates ? (
                                <div className="space-y-3">
                                    {(["intelligence", "personality", "aptitude", "projective"] as TestCategory[]).map((cat) => {
                                        const cc = categoryConfig[cat];
                                        const templates = psikotestTemplates.filter((t) => t.category === cat);
                                        if (templates.length === 0) return null;
                                        return (
                                            <div key={cat}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`material-symbols-outlined text-[18px] ${cc.color.split(" ")[0]}`}>{cc.icon}</span>
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{cc.label}</h4>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                                                    {templates.map((tmpl, i) => {
                                                        const qt = questionTypeConfig[tmpl.questionType];
                                                        return (
                                                            <button key={i} onClick={() => handleCreateFromTemplate(tmpl)} className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--color-border)] hover:border-primary text-left transition-all group hover:translate-y-[-1px] hover:shadow-[var(--shadow-sm)]">
                                                                <div className={`p-1.5 rounded-[var(--radius-sm)] ${cc.color} flex-shrink-0 mt-0.5`}>
                                                                    <span className="material-symbols-outlined text-[16px]">{qt.icon}</span>
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-semibold text-[var(--color-text-main)] group-hover:text-primary transition-colors truncate">{tmpl.name}</p>
                                                                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{tmpl.desc}</p>
                                                                    {tmpl.subtests.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                                                            {tmpl.subtests.map((st) => (
                                                                                <span key={st} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">{st}</span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Test Name *</label>
                                        <input value={newTest.name} onChange={(e) => setNewTest((prev) => ({ ...prev, name: e.target.value }))} className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" placeholder="e.g. IST - Subtest AN" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Category</label>
                                            <select value={newTest.category} onChange={(e) => setNewTest((prev) => ({ ...prev, category: e.target.value as TestCategory }))} className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-sub)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] cursor-pointer transition-all duration-300">
                                                {Object.entries(categoryConfig).map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Question Type</label>
                                            <select value={newTest.questionType} onChange={(e) => setNewTest((prev) => ({ ...prev, questionType: e.target.value as QuestionType }))} className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-sub)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] cursor-pointer transition-all duration-300">
                                                {Object.entries(questionTypeConfig).map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Description</label>
                                        <textarea value={newTest.description} onChange={(e) => setNewTest((prev) => ({ ...prev, description: e.target.value }))} rows={2} className="w-full px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300 resize-none" placeholder="Brief description of the test..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Duration (minutes)</label>
                                        <input type="number" value={newTest.duration} onChange={(e) => setNewTest((prev) => ({ ...prev, duration: parseInt(e.target.value) || 0 }))} className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" min="1" />
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <button onClick={handleCreateTest} disabled={!newTest.name} className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press disabled:opacity-50 disabled:cursor-not-allowed">
                                            <span className="material-symbols-outlined text-[18px]">check</span>
                                            Create Test
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* =============== ADD QUESTION MODAL =============== */}
            {showAddQuestionModal && selectedTest && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-[8px] z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0" onClick={() => setShowAddQuestionModal(false)} />
                    <div className="relative w-full max-w-xl bg-[var(--color-bg-card)] rounded-3xl border border-[var(--color-border-strong)] shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-slide-in-up max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)] flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[var(--color-primary-light)] rounded-[var(--radius-sm)] text-primary">
                                    <span className="material-symbols-outlined">help</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--color-text-main)]">Add Question</h3>
                                    <p className="text-xs text-[var(--color-text-muted)]">{selectedTest.name} • {selectedTest.questions.length} questions so far</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAddQuestionModal(false)} className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Question Type</label>
                                <select value={newQuestion.type} onChange={(e) => setNewQuestion((prev) => ({ ...prev, type: e.target.value as QuestionType }))} className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-sub)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] cursor-pointer transition-all duration-300">
                                    {Object.entries(questionTypeConfig).map(([key, val]) => (<option key={key} value={key}>{val.label} — {val.desc}</option>))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Question Text *</label>
                                <textarea value={newQuestion.text} onChange={(e) => setNewQuestion((prev) => ({ ...prev, text: e.target.value }))} rows={3} className="w-full px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300 resize-none" placeholder={newQuestion.type === "likert_scale" ? "e.g. Saya suka menghabiskan waktu dengan banyak orang" : newQuestion.type === "forced_choice" ? "e.g. Pilih yang paling menggambarkan diri Anda" : newQuestion.type === "number_series" ? "e.g. 2, 4, 8, 16, ..." : "Enter your question..."} />
                            </div>

                            {newQuestion.type !== "essay" && newQuestion.type !== "likert_scale" && (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                        {newQuestion.type === "forced_choice" ? "Choices" : newQuestion.type === "true_false" ? "Options" : "Answer Options"}
                                    </label>
                                    {newQuestion.type === "true_false" ? (
                                        <div className="flex gap-3">
                                            {["True", "False"].map((opt) => (
                                                <button key={opt} type="button" onClick={() => setNewQuestion((prev) => ({ ...prev, correctAnswer: opt }))} className={`flex-1 py-2.5 rounded-[var(--radius-sm)] border-2 text-sm font-medium transition-all ${newQuestion.correctAnswer === opt ? "border-primary bg-[var(--color-primary-light)] text-primary" : "border-[var(--color-border)] text-[var(--color-text-muted)]"}`}>
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {newQuestion.options.map((opt, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-[var(--color-text-muted)] w-5 text-center">{String.fromCharCode(65 + i)}</span>
                                                    <input value={opt} onChange={(e) => { const newOpts = [...newQuestion.options]; newOpts[i] = e.target.value; setNewQuestion((prev) => ({ ...prev, options: newOpts })); }} className="flex-1 h-9 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                                                    <button type="button" onClick={() => setNewQuestion((prev) => ({ ...prev, correctAnswer: String.fromCharCode(65 + i) }))} className={`p-1.5 rounded-[var(--radius-sm)] transition-colors ${newQuestion.correctAnswer === String.fromCharCode(65 + i) ? "text-[var(--color-success)] bg-[var(--color-success-light)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-success)]"}`} title="Set as correct answer">
                                                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                                    </button>
                                                </div>
                                            ))}
                                            {newQuestion.options.length < 8 && (
                                                <button type="button" onClick={() => setNewQuestion((prev) => ({ ...prev, options: [...prev.options, ""] }))} className="flex items-center gap-1.5 text-xs text-primary hover:underline ml-7">
                                                    <span className="material-symbols-outlined text-[14px]">add</span>
                                                    Add Option
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {newQuestion.type === "likert_scale" && (
                                <div className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] bg-[var(--color-primary-light)] dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800">
                                    <span className="material-symbols-outlined text-primary dark:text-blue-400 text-[20px]">info</span>
                                    <p className="text-xs text-blue-700 dark:text-blue-300">Likert Scale: 1 (Sangat Tidak Setuju) — 2 (Tidak Setuju) — 3 (Netral) — 4 (Setuju) — 5 (Sangat Setuju)</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Time Limit per Question (seconds, 0 = no limit)</label>
                                <input type="number" value={newQuestion.timeLimit} onChange={(e) => setNewQuestion((prev) => ({ ...prev, timeLimit: parseInt(e.target.value) || 0 }))} className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" min="0" placeholder="0" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 p-6 border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)] flex-shrink-0 rounded-b-3xl">
                            <p className="text-xs text-[var(--color-text-muted)]"><span className="font-semibold text-[var(--color-text-sub)]">{selectedTest.questions.length}</span> questions added</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowAddQuestionModal(false)} className="px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-primary-light)] text-primary border border-[var(--color-border-accent)] font-medium text-sm hover:bg-[var(--color-bg-hover)] transition-colors btn-press">Done</button>
                                <button onClick={handleAddQuestion} disabled={!newQuestion.text} className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press disabled:opacity-50 disabled:cursor-not-allowed">
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                    Add & Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Test"
                message={`Are you sure you want to delete "${deleteTarget?.name}"? All questions in this test will also be deleted. This action cannot be undone.`}
                confirmLabel="Delete Test"
                variant="danger"
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => {
                    if (deleteTarget) {
                        handleDeleteTest(deleteTarget.id);
                        setDeleteTarget(null);
                    }
                }}
            />
        </>
    );
}
