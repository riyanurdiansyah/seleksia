"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "../../../components/ConfirmDialog";
import Breadcrumb from "../../../components/Breadcrumb";
import Select2 from "../../../components/Select2";

/* ===== Types ===== */
type QuestionType = "multiple_choice" | "true_false" | "likert_scale" | "forced_choice" | "number_series" | "image_pattern" | "essay";
type TestCategory = "intelligence" | "personality" | "aptitude" | "projective";

interface Question {
    id: string;
    displayId: string;
    type: QuestionType;
    text: string;
    options: string[];
    correctAnswer?: string | null;
    imageUrl?: string | null;
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

const questionTypeConfig: Record<QuestionType, { label: string; icon: string; desc: string }> = {
    multiple_choice: { label: "Multiple Choice", icon: "radio_button_checked", desc: "Pilihan ganda A-E" },
    true_false: { label: "True / False", icon: "toggle_on", desc: "Benar atau salah" },
    likert_scale: { label: "Likert Scale", icon: "linear_scale", desc: "Skala 1-5" },
    forced_choice: { label: "Forced Choice", icon: "compare_arrows", desc: "Pilih paling/kurang sesuai" },
    number_series: { label: "Number Series", icon: "pin", desc: "Deret angka" },
    image_pattern: { label: "Image Pattern", icon: "grid_view", desc: "Pola gambar" },
    essay: { label: "Essay", icon: "edit_note", desc: "Jawaban uraian" },
};

const categoryConfig: Record<TestCategory, { label: string; icon: string; color: string }> = {
    intelligence: { label: "Intelligence", icon: "psychology", color: "text-[var(--color-accent)] bg-[var(--color-accent-light)]" },
    personality: { label: "Personality", icon: "mood", color: "text-pink-600 bg-pink-50 dark:bg-pink-900/20" },
    aptitude: { label: "Aptitude", icon: "school", color: "text-[var(--color-warning)] bg-[var(--color-warning-light)]" },
    projective: { label: "Projective", icon: "draw", color: "text-teal-600 bg-teal-50 dark:bg-teal-900/20" },
};

const statusConfig: Record<Test["status"], { label: string; bg: string; text: string }> = {
    draft: { label: "Draft", bg: "bg-[var(--color-bg-elevated)]", text: "text-[var(--color-text-sub)]" },
    published: { label: "Published", bg: "bg-[var(--color-success-light)]", text: "text-[var(--color-success)]" },
    archived: { label: "Archived", bg: "bg-[var(--color-bg-elevated)]", text: "text-[var(--color-text-muted)]" },
};

export default function TestDetailClient({ testId }: { testId: string }) {
    const router = useRouter();
    const [test, setTest] = useState<Test | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"questions" | "settings">("questions");

    // Edit form
    const [editName, setEditName] = useState("");
    const [editCategory, setEditCategory] = useState<TestCategory>("intelligence");
    const [editQuestionType, setEditQuestionType] = useState<QuestionType>("multiple_choice");
    const [editDescription, setEditDescription] = useState("");
    const [editDuration, setEditDuration] = useState(30);

    // Add question
    const [showAddQuestion, setShowAddQuestion] = useState(false);
    const [newQuestion, setNewQuestion] = useState({
        text: "",
        type: "multiple_choice" as QuestionType,
        options: ["", "", "", "", ""],
        correctAnswer: "",
        timeLimit: 0,
        imageUrl: "",
    });

    // Edit question
    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
    const [editQuestion, setEditQuestion] = useState({
        text: "",
        type: "multiple_choice" as QuestionType,
        options: ["", "", "", "", ""],
        correctAnswer: "",
        timeLimit: 0,
        imageUrl: "",
    });

    // Image uploading state
    const [uploadingImage, setUploadingImage] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Only image files are allowed!");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("Maximum file size is 5MB!");
            return;
        }

        setUploadingImage(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            if (!res.ok) throw new Error("Upload failed");
            const data = await res.json();
            if (isEdit) {
                setEditQuestion((p) => ({ ...p, imageUrl: data.imageUrl }));
            } else {
                setNewQuestion((p) => ({ ...p, imageUrl: data.imageUrl }));
            }
        } catch (err) {
            console.error(err);
            alert("Failed to upload image.");
        } finally {
            setUploadingImage(false);
        }
    };

    // Delete question confirmation
    const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<{ id: string; text: string } | null>(null);

    /* Fetch test */
    const fetchTest = useCallback(async () => {
        try {
            const res = await fetch(`/api/tests/${testId}`);
            if (!res.ok) throw new Error("Not found");
            const data = await res.json();
            setTest(data);
            setEditName(data.name);
            setEditCategory(data.category);
            setEditQuestionType(data.questionType);
            setEditDescription(data.description || "");
            setEditDuration(data.duration);
        } catch {
            setTest(null);
        } finally {
            setLoading(false);
        }
    }, [testId]);

    useEffect(() => { fetchTest(); }, [fetchTest]);

    /* Save test settings */
    const handleSave = async () => {
        if (!test) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/tests/${test.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editName,
                    category: editCategory,
                    questionType: editQuestionType,
                    description: editDescription,
                    duration: editDuration,
                }),
            });
            if (!res.ok) throw new Error("Failed");
            const updated = await res.json();
            setTest(updated);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    /* Toggle publish */
    const togglePublish = async () => {
        if (!test) return;
        const newStatus = test.status === "published" ? "draft" : "published";
        try {
            const res = await fetch(`/api/tests/${test.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error("Failed");
            const updated = await res.json();
            setTest(updated);
        } catch (err) {
            console.error(err);
        }
    };

    /* Add question */
    const handleAddQuestion = async () => {
        if ((!newQuestion.text && !newQuestion.imageUrl) || !test) return;
        try {
            const res = await fetch(`/api/tests/${test.id}/questions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: newQuestion.type,
                    text: newQuestion.text,
                    options: newQuestion.type === "essay" ? [] : newQuestion.options.filter((o) => o.trim() !== ""),
                    correctAnswer: newQuestion.correctAnswer || null,
                    timeLimit: newQuestion.timeLimit || null,
                    imageUrl: newQuestion.imageUrl || null,
                }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error("API Error:", errData);
                throw new Error(errData.details || errData.error || "Failed to add question");
            }
            const q = await res.json();
            setTest((prev) => prev ? { ...prev, questions: [...prev.questions, q] } : prev);
            setNewQuestion({ text: "", type: test.questionType, options: ["", "", "", "", ""], correctAnswer: "", timeLimit: 0, imageUrl: "" });
        } catch (err) {
            console.error(err);
            alert(err instanceof Error ? err.message : String(err));
        }
    };

    /* Delete question */
    const handleDeleteQuestion = async (questionId: string) => {
        if (!test) return;
        try {
            const res = await fetch(`/api/tests/${test.id}/questions/${questionId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed");
            setTest((prev) => prev ? { ...prev, questions: prev.questions.filter((q) => q.id !== questionId) } : prev);
        } catch (err) {
            console.error(err);
        }
    };

    /* Start editing a question */
    const startEditQuestion = (q: Question) => {
        setEditingQuestionId(q.id);
        setEditQuestion({
            text: q.text,
            type: q.type,
            options: q.options.length > 0 ? [...q.options] : ["", "", "", "", ""],
            correctAnswer: q.correctAnswer || "",
            timeLimit: q.timeLimit || 0,
            imageUrl: q.imageUrl || "",
        });
    };

    /* Save edited question */
    const handleSaveQuestion = async () => {
        if (!test || !editingQuestionId) return;
        if (!editQuestion.text && !editQuestion.imageUrl) {
            alert("Question must have either text or image!");
            return;
        }
        try {
            const res = await fetch(`/api/tests/${test.id}/questions/${editingQuestionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: editQuestion.text,
                    type: editQuestion.type,
                    options: editQuestion.type === "essay" ? [] : editQuestion.options.filter((o) => o.trim() !== ""),
                    correctAnswer: editQuestion.correctAnswer || null,
                    timeLimit: editQuestion.timeLimit || null,
                    imageUrl: editQuestion.imageUrl || null,
                }),
            });
            if (!res.ok) throw new Error("Failed");
            const updated = await res.json();
            setTest((prev) => prev ? { ...prev, questions: prev.questions.map((q) => q.id === editingQuestionId ? updated : q) } : prev);
            setEditingQuestionId(null);
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <span className="material-symbols-outlined text-4xl text-[var(--color-text-muted)] animate-spin">progress_activity</span>
            </div>
        );
    }

    if (!test) {
        return (
            <div className="text-center py-24">
                <span className="material-symbols-outlined text-5xl text-[var(--color-text-muted)] block mb-3">error</span>
                <p className="text-[var(--color-text-sub)] mb-4">Test not found</p>
                <button onClick={() => router.push("/exam/question")} className="text-primary hover:underline text-sm">← Back to Tests</button>
            </div>
        );
    }

    const cat = categoryConfig[test.category];
    const st = statusConfig[test.status];
    const qt = questionTypeConfig[test.questionType];

    return (
        <>
            {/* Back + Header */}
            <div className="flex flex-col gap-4 animate-slide-in-up">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <button onClick={() => router.push("/exam/question")} className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors w-fit">
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        Back to Tests
                    </button>
                    <Breadcrumb />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-[var(--radius-md)] ${cat.color}`}>
                            <span className="material-symbols-outlined text-[28px]">{cat.icon}</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">{test.name}</h1>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${st.bg} ${st.text}`}>{st.label}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                                <span className="font-mono">{test.displayId}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">{qt.icon}</span>{qt.label}</span>
                                <span>•</span>
                                <span>{test.questions.length} questions</span>
                                <span>•</span>
                                <span>{test.duration} min</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={togglePublish} className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] font-medium text-sm transition-all btn-press ${test.status === "published" ? "bg-[var(--color-warning-light)] hover:bg-[var(--color-warning-light)] text-[var(--color-warning)]" : "bg-[var(--color-success-light)] hover:bg-[var(--color-success-light)] text-[var(--color-success)]"}`}>
                            <span className="material-symbols-outlined text-[18px]">{test.status === "published" ? "unpublished" : "publish"}</span>
                            {test.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--color-border)]">
                <button onClick={() => setActiveTab("questions")} className={`py-3 border-b-2 font-medium text-sm mr-6 transition-colors ${activeTab === "questions" ? "border-primary text-primary" : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-sub)]"}`}>
                    <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">quiz</span>Questions ({test.questions.length})</span>
                </button>
                <button onClick={() => setActiveTab("settings")} className={`py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === "settings" ? "border-primary text-primary" : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-sub)]"}`}>
                    <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">settings</span>Settings</span>
                </button>
            </div>

            {/* ===== QUESTIONS TAB ===== */}
            {activeTab === "questions" && (
                <>
                    {/* Add Question Bar */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)]">
                        <button onClick={() => setShowAddQuestion(!showAddQuestion)} className="w-full flex items-center justify-between p-4 text-left">
                            <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-sub)]">
                                <span className="material-symbols-outlined text-primary text-[20px]">add_circle</span>
                                Add New Question
                            </span>
                            <span className={`material-symbols-outlined text-[var(--color-text-muted)] transition-transform ${showAddQuestion ? "rotate-180" : ""}`}>expand_more</span>
                        </button>

                        {showAddQuestion && (
                            <div className="px-4 pb-4 space-y-4 border-t border-[var(--color-border)] pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Question Type</label>
                                        <Select2
                                            value={newQuestion.type}
                                            onChange={(val) => setNewQuestion((p) => ({ ...p, type: val as QuestionType }))}
                                            options={Object.entries(questionTypeConfig).map(([k, v]) => ({ value: k, label: v.label }))}
                                            className="w-full text-left"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Time Limit (sec, 0 = none)</label>
                                        <input type="number" value={newQuestion.timeLimit} onChange={(e) => setNewQuestion((p) => ({ ...p, timeLimit: parseInt(e.target.value) || 0 }))} className="w-full h-9 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" min="0" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Question Text (Optional if image uploaded)</label>
                                    <textarea value={newQuestion.text} onChange={(e) => setNewQuestion((p) => ({ ...p, text: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300 resize-none" placeholder="Enter question..." />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Question Image (Optional)</label>
                                    {newQuestion.imageUrl ? (
                                        <div className="relative inline-block border border-[var(--color-border)] rounded-[var(--radius-sm)] p-1 bg-[var(--color-bg-elevated)]">
                                            <img src={newQuestion.imageUrl} alt="Preview" className="max-h-32 object-contain rounded" />
                                            <button
                                                type="button"
                                                onClick={() => setNewQuestion(prev => ({ ...prev, imageUrl: "" }))}
                                                className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 flex items-center justify-center shadow-lg transition-colors"
                                                title="Remove Image"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-sub)] cursor-pointer hover:bg-[var(--color-bg-hover)] transition-colors">
                                                <span className="material-symbols-outlined text-[18px]">image</span>
                                                <span>Select Image</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageUpload(e, false)}
                                                    className="hidden"
                                                />
                                            </label>
                                            {uploadingImage && (
                                                <span className="material-symbols-outlined text-[18px] text-[var(--color-text-muted)] animate-spin">
                                                    progress_activity
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {newQuestion.type !== "essay" && newQuestion.type !== "likert_scale" && newQuestion.type !== "true_false" && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Options (Text or Image)</label>
                                        <div className="space-y-1.5">
                                            {newQuestion.options.map((opt, i) => {
                                                const isImg = opt.startsWith("/");
                                                return (
                                                    <div key={i} className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-[var(--color-text-muted)] w-4 text-center">{String.fromCharCode(65 + i)}</span>
                                                        {isImg ? (
                                                            <div className="flex-1 flex items-center gap-2 p-1 border border-[var(--color-border)] rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] h-8">
                                                                <img src={opt} alt={`Option ${String.fromCharCode(65 + i)}`} className="h-full object-contain rounded" />
                                                                <button type="button" onClick={() => { const o = [...newQuestion.options]; o[i] = ""; setNewQuestion((p) => ({ ...p, options: o })); }} className="text-red-500 hover:text-red-700 ml-auto p-1 flex items-center" title="Remove Option Image">
                                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <input value={opt} onChange={(e) => { const o = [...newQuestion.options]; o[i] = e.target.value; setNewQuestion((p) => ({ ...p, options: o })); }} className="flex-1 h-8 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                                                        )}

                                                        {!isImg && (
                                                            <label className="p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-primary hover:bg-[var(--color-bg-hover)] cursor-pointer flex items-center" title="Upload Option Image">
                                                                <span className="material-symbols-outlined text-[18px]">image</span>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={async (e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (!file) return;
                                                                        const formData = new FormData();
                                                                        formData.append("file", file);
                                                                        try {
                                                                            const res = await fetch("/api/upload", { method: "POST", body: formData });
                                                                            if (!res.ok) throw new Error("Upload failed");
                                                                            const data = await res.json();
                                                                            const o = [...newQuestion.options];
                                                                            o[i] = data.imageUrl;
                                                                            setNewQuestion((p) => ({ ...p, options: o }));
                                                                        } catch (err) {
                                                                            alert("Upload failed");
                                                                        }
                                                                    }}
                                                                    className="hidden"
                                                                />
                                                            </label>
                                                        )}

                                                        <button type="button" onClick={() => setNewQuestion((p) => ({ ...p, correctAnswer: String.fromCharCode(65 + i) }))} className={`p-1 rounded-[var(--radius-sm)] transition-colors ${newQuestion.correctAnswer === String.fromCharCode(65 + i) ? "text-[var(--color-success)] bg-[var(--color-success-light)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-success)]"}`} title="Correct">
                                                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                            {newQuestion.options.length < 8 && (
                                                <button type="button" onClick={() => setNewQuestion((p) => ({ ...p, options: [...p.options, ""] }))} className="flex items-center gap-1 text-[10px] text-primary hover:underline ml-6">
                                                    <span className="material-symbols-outlined text-[12px]">add</span>Add Option
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {newQuestion.type === "true_false" && (
                                    <div className="flex gap-3">
                                        {["True", "False"].map((opt) => (
                                            <button key={opt} type="button" onClick={() => setNewQuestion((p) => ({ ...p, correctAnswer: opt }))} className={`flex-1 py-2 rounded-[var(--radius-sm)] border-2 text-sm font-medium transition-all ${newQuestion.correctAnswer === opt ? "border-primary bg-[var(--color-primary-light)] text-primary" : "border-[var(--color-border)] text-[var(--color-text-muted)]"}`}>{opt}</button>
                                        ))}
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <button onClick={handleAddQuestion} disabled={!newQuestion.text && !newQuestion.imageUrl} className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press disabled:opacity-50 disabled:cursor-not-allowed">
                                        <span className="material-symbols-outlined text-[16px]">add</span>Add Question
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Questions List */}
                    {test.questions.length === 0 ? (
                        <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-12 text-center">
                            <span className="material-symbols-outlined text-4xl text-[var(--color-text-muted)] block mb-2">quiz</span>
                            <p className="text-[var(--color-text-muted)] mb-2">No questions yet</p>
                            <p className="text-xs text-[var(--color-text-muted)]">Click &quot;Add New Question&quot; above to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {test.questions.map((q, idx) => {
                                const qType = questionTypeConfig[q.type];
                                const isEditing = editingQuestionId === q.id;

                                return (
                                    <div key={q.id} className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden transition-all duration-[250ms]">
                                        {isEditing ? (
                                            /* Edit mode */
                                            <div className="p-5 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-primary">Editing Question #{idx + 1}</span>
                                                    <button onClick={() => setEditingQuestionId(null)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-sub)]">Cancel</button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Type</label>
                                                        <Select2
                                                            value={editQuestion.type}
                                                            onChange={(val) => setEditQuestion((p) => ({ ...p, type: val as QuestionType }))}
                                                            options={Object.entries(questionTypeConfig).map(([k, v]) => ({ value: k, label: v.label }))}
                                                            className="w-full text-left"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Time Limit (sec)</label>
                                                        <input type="number" value={editQuestion.timeLimit} onChange={(e) => setEditQuestion((p) => ({ ...p, timeLimit: parseInt(e.target.value) || 0 }))} className="w-full h-9 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" min="0" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Question Text (Optional if image uploaded)</label>
                                                    <textarea value={editQuestion.text} onChange={(e) => setEditQuestion((p) => ({ ...p, text: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300 resize-none" />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Question Image (Optional)</label>
                                                    {editQuestion.imageUrl ? (
                                                        <div className="relative inline-block border border-[var(--color-border)] rounded-[var(--radius-sm)] p-1 bg-[var(--color-bg-elevated)]">
                                                            <img src={editQuestion.imageUrl} alt="Preview" className="max-h-32 object-contain rounded" />
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditQuestion(prev => ({ ...prev, imageUrl: "" }))}
                                                                className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 flex items-center justify-center shadow-lg transition-colors"
                                                                title="Remove Image"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-3">
                                                            <label className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-sub)] cursor-pointer hover:bg-[var(--color-bg-hover)] transition-colors">
                                                                <span className="material-symbols-outlined text-[18px]">image</span>
                                                                <span>Select Image</span>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(e) => handleImageUpload(e, true)}
                                                                    className="hidden"
                                                                />
                                                            </label>
                                                            {uploadingImage && (
                                                                <span className="material-symbols-outlined text-[18px] text-[var(--color-text-muted)] animate-spin">
                                                                    progress_activity
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                {editQuestion.type !== "essay" && editQuestion.type !== "likert_scale" && editQuestion.type !== "true_false" && (
                                                    <div className="space-y-1.5">
                                                        {editQuestion.options.map((opt, i) => {
                                                            const isImg = opt.startsWith("/");
                                                            return (
                                                                <div key={i} className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] w-4 text-center">{String.fromCharCode(65 + i)}</span>
                                                                    {isImg ? (
                                                                        <div className="flex-1 flex items-center gap-2 p-1 border border-[var(--color-border)] rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] h-8">
                                                                            <img src={opt} alt={`Option ${String.fromCharCode(65 + i)}`} className="h-full object-contain rounded" />
                                                                            <button type="button" onClick={() => { const o = [...editQuestion.options]; o[i] = ""; setEditQuestion((p) => ({ ...p, options: o })); }} className="text-red-500 hover:text-red-700 ml-auto p-1 flex items-center" title="Remove Option Image">
                                                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <input value={opt} onChange={(e) => { const o = [...editQuestion.options]; o[i] = e.target.value; setEditQuestion((p) => ({ ...p, options: o })); }} className="flex-1 h-8 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" />
                                                                    )}

                                                                    {!isImg && (
                                                                        <label className="p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-primary hover:bg-[var(--color-bg-hover)] cursor-pointer flex items-center" title="Upload Option Image">
                                                                            <span className="material-symbols-outlined text-[18px]">image</span>
                                                                            <input
                                                                                type="file"
                                                                                accept="image/*"
                                                                                onChange={async (e) => {
                                                                                    const file = e.target.files?.[0];
                                                                                    if (!file) return;
                                                                                    const formData = new FormData();
                                                                                    formData.append("file", file);
                                                                                    try {
                                                                                        const res = await fetch("/api/upload", { method: "POST", body: formData });
                                                                                        if (!res.ok) throw new Error("Upload failed");
                                                                                        const data = await res.json();
                                                                                        const o = [...editQuestion.options];
                                                                                        o[i] = data.imageUrl;
                                                                                        setEditQuestion((p) => ({ ...p, options: o }));
                                                                                    } catch (err) {
                                                                                        alert("Upload failed");
                                                                                    }
                                                                                }}
                                                                                className="hidden"
                                                                            />
                                                                        </label>
                                                                    )}

                                                                    <button type="button" onClick={() => setEditQuestion((p) => ({ ...p, correctAnswer: String.fromCharCode(65 + i) }))} className={`p-1 rounded-[var(--radius-sm)] transition-colors ${editQuestion.correctAnswer === String.fromCharCode(65 + i) ? "text-[var(--color-success)] bg-[var(--color-success-light)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-success)]"}`}>
                                                                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setEditingQuestionId(null)} className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-primary-light)] text-primary border border-[var(--color-border-accent)] text-sm hover:bg-[var(--color-bg-hover)] transition-colors btn-press">Cancel</button>
                                                    <button onClick={handleSaveQuestion} className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white text-sm font-semibold shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press">Save</button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* View mode */
                                            <div className="p-5">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="flex-shrink-0 w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] flex items-center justify-center text-xs font-bold text-[var(--color-text-muted)]">{idx + 1}</span>
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]`}>
                                                                <span className="material-symbols-outlined text-[12px]">{qType.icon}</span>{qType.label}
                                                            </span>
                                                            {q.timeLimit && q.timeLimit > 0 && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
                                                                    <span className="material-symbols-outlined text-[12px]">timer</span>{q.timeLimit}s
                                                                </span>
                                                            )}
                                                            {q.correctAnswer && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--color-success-light)] text-[var(--color-success)]">
                                                                    <span className="material-symbols-outlined text-[12px]">check</span>Answer: {q.correctAnswer}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {q.text && <p className="text-sm text-[var(--color-text-main)] leading-relaxed">{q.text}</p>}
                                                        {q.imageUrl && (
                                                            <div className="mt-2">
                                                                <img src={q.imageUrl} alt="Question Illustration" className="max-h-40 object-contain rounded border border-[var(--color-border)]" />
                                                            </div>
                                                        )}

                                                        {/* Options display */}
                                                        {q.options.length > 0 && q.type !== "essay" && (
                                                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                                {q.options.map((opt, oi) => {
                                                                    const isImg = opt.startsWith("/");
                                                                    return (
                                                                        <div key={oi} className={`flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs ${q.correctAnswer === String.fromCharCode(65 + oi) ? "bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success)]" : "bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)]"}`}>
                                                                            <span className="font-bold text-[10px]">{String.fromCharCode(65 + oi)}</span>
                                                                            {isImg ? (
                                                                                <img src={opt} alt={`Option ${String.fromCharCode(65 + oi)}`} className="max-h-16 object-contain rounded" />
                                                                            ) : (
                                                                                <span>{opt}</span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <button onClick={() => startEditQuestion(q)} className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-primary hover:bg-[var(--color-bg-hover)] transition-colors" title="Edit">
                                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                                        </button>
                                                        <button onClick={() => setDeleteQuestionTarget({ id: q.id, text: q.text })} className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-danger hover:bg-[var(--color-danger-light)] transition-colors" title="Delete">
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ===== SETTINGS TAB ===== */}
            {activeTab === "settings" && (
                <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Test Name</label>
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Category</label>
                            <Select2
                                value={editCategory}
                                onChange={(val) => setEditCategory(val as TestCategory)}
                                options={Object.entries(categoryConfig).map(([k, v]) => ({ value: k, label: v.label }))}
                                className="w-full text-left"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Question Type</label>
                            <Select2
                                value={editQuestionType}
                                onChange={(val) => setEditQuestionType(val as QuestionType)}
                                options={Object.entries(questionTypeConfig).map(([k, v]) => ({ value: k, label: v.label }))}
                                className="w-full text-left"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Duration (minutes)</label>
                            <input type="number" value={editDuration} onChange={(e) => setEditDuration(parseInt(e.target.value) || 0)} className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" min="1" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Description</label>
                        <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300 resize-none" />
                    </div>

                    {/* Info */}
                    <div className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                        <span className="material-symbols-outlined text-[18px]">info</span>
                        <div>
                            <p>Created: {new Date(test.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                            <p>Status: <span className="font-medium">{st.label}</span> • Questions: <span className="font-medium">{test.questions.length}</span></p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => { setEditName(test.name); setEditCategory(test.category); setEditQuestionType(test.questionType); setEditDescription(test.description || ""); setEditDuration(test.duration); }} className="px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-primary-light)] text-primary border border-[var(--color-border-accent)] font-medium text-sm hover:bg-[var(--color-bg-hover)] transition-colors btn-press">
                            Reset
                        </button>
                        <button onClick={handleSave} disabled={saving || !editName} className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press disabled:opacity-50 disabled:cursor-not-allowed">
                            <span className="material-symbols-outlined text-[18px]">{saving ? "progress_activity" : "check"}</span>
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Question Confirmation */}
            <ConfirmDialog
                open={!!deleteQuestionTarget}
                title="Delete Question"
                message={`Are you sure you want to delete this question? "${deleteQuestionTarget?.text?.substring(0, 80)}${(deleteQuestionTarget?.text?.length ?? 0) > 80 ? "..." : ""}" This action cannot be undone.`}
                confirmLabel="Delete Question"
                variant="danger"
                onCancel={() => setDeleteQuestionTarget(null)}
                onConfirm={() => {
                    if (deleteQuestionTarget) {
                        handleDeleteQuestion(deleteQuestionTarget.id);
                        setDeleteQuestionTarget(null);
                    }
                }}
            />
        </>
    );
}
