"use client";

import { useState, useEffect, useCallback } from "react";
import { globalDialog } from "@/app/providers/DialogProvider";
import Modal from "../../components/Modal";

interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
}

interface CandidateInfo {
  id: string;
  name: string;
  displayId: string;
  email: string;
}

interface InboundEmail {
  id: string;
  resendId: string | null;
  messageId: string | null;
  from: string;
  fromEmail: string;
  to: string;
  toEmail: string;
  subject: string | null;
  text: string | null;
  html: string | null;
  rawHeaders: string | null;
  attachments: string | null;
  status: string;
  createdAt: string;
  companyId: string | null;
  candidateId: string | null;
  company: CompanyInfo | null;
  candidate: CandidateInfo | null;
}

const QUICK_TEMPLATES = [
  {
    title: "Konfirmasi Diterima",
    text: "Halo,\n\nTerima kasih telah menghubungi kami. Pesan Anda telah kami terima dengan baik dan tim kami akan segera menindaklanjuti.\n\nSalam hangat,\nTim Seleksi",
  },
  {
    title: "Panduan Login Asesmen",
    text: "Halo,\n\nUntuk masuk ke akun ujian Anda, silakan kunjungi website seleksi kami dan login menggunakan alamat email ini serta ID Peserta yang telah diberikan sebelumnya.\n\nJika mengalami kendala, silakan balas email ini.\n\nSemoga sukses!",
  },
  {
    title: "Informasi Jadwal",
    text: "Halo,\n\nJadwal asesmen Anda telah disesuaikan di dalam sistem. Harap pastikan perangkat Anda siap dan koneksi internet stabil 15 menit sebelum ujian dimulai.\n\nTerima kasih.",
  },
];

export default function InboxTab() {
  const [emails, setEmails] = useState<InboundEmail[]>([]);
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [selectedCompanySlug, setSelectedCompanySlug] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Modal detail & Reply states
  const [selectedEmail, setSelectedEmail] = useState<InboundEmail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"html" | "text">("html");
  const [showHeaders, setShowHeaders] = useState<boolean>(false);

  // Reply Composer State
  const [showReplyForm, setShowReplyForm] = useState<boolean>(false);
  const [replyMessage, setReplyMessage] = useState<string>("");
  const [replySubject, setReplySubject] = useState<string>("");
  const [isSendingReply, setIsSendingReply] = useState<boolean>(false);

  // Fetch Companies list for superadmin filter
  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (err) {
      console.error("Failed to fetch companies:", err);
    }
  }, []);

  // Fetch Inbound Emails
  const fetchEmails = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.set("search", search.trim());
      if (selectedCompanySlug && selectedCompanySlug !== "all") {
        queryParams.set("companySlug", selectedCompanySlug);
      }
      queryParams.set("page", String(page));
      queryParams.set("limit", "15");

      const res = await fetch(`/api/communication/inbox?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch emails:", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedCompanySlug, page]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Open Modal & Prepare reply state
  const handleOpenDetail = (email: InboundEmail) => {
    setSelectedEmail(email);
    setIsDetailOpen(true);
    setViewMode(email.html ? "html" : "text");
    setShowReplyForm(false);
    setReplyMessage("");
    setReplySubject(
      email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject || "Pesan Anda"}`
    );
  };

  // Send Reply Handler
  const handleSendReply = async () => {
    if (!selectedEmail) return;
    if (!replyMessage.trim()) {
      await globalDialog.alert("Harap tuliskan pesan balasan terlebih dahulu.");
      return;
    }

    setIsSendingReply(true);
    try {
      const res = await fetch("/api/communication/inbox/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inboundEmailId: selectedEmail.id,
          replyMessage: replyMessage.trim(),
          customSubject: replySubject.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await globalDialog.alert(
          `Balasan email berhasil dikirim ke ${selectedEmail.fromEmail} via Resend!`
        );
        setShowReplyForm(false);
        setReplyMessage("");
        // Update local status
        setSelectedEmail({ ...selectedEmail, status: "replied" });
        fetchEmails();
      } else {
        await globalDialog.alert(data.error || "Gagal mengirim balasan email.");
      }
    } catch (err) {
      console.error("Send reply error:", err);
      await globalDialog.alert("Terjadi kesalahan sistem saat mengirim balasan.");
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await globalDialog.confirm(
      "Apakah Anda yakin ingin menghapus email ini dari kotak masuk?",
      "Hapus Email Masuk"
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/communication/inbox?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await globalDialog.alert("Email berhasil dihapus.");
        fetchEmails();
        if (selectedEmail?.id === id) {
          setIsDetailOpen(false);
          setSelectedEmail(null);
        }
      } else {
        await globalDialog.alert("Gagal menghapus email.");
      }
    } catch (err) {
      console.error("Delete email error:", err);
      await globalDialog.alert("Terjadi kesalahan saat menghapus email.");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parseAttachments = (attachmentsStr: string | null) => {
    if (!attachmentsStr) return [];
    try {
      const parsed = JSON.parse(attachmentsStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Search Bar */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-card)] flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Filter per Company Slug */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-sub)]">
            <span className="material-symbols-outlined text-[20px] text-primary">domain</span>
            <span>Filter Perusahaan:</span>
          </div>
          <select
            value={selectedCompanySlug}
            onChange={(e) => {
              setSelectedCompanySlug(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-main)] focus:outline-none focus:border-primary font-medium cursor-pointer"
          >
            <option value="all">🏢 Semua Perusahaan (@seleksia.com)</option>
            {companies.map((c) => (
              <option key={c.id} value={c.slug || c.id}>
                {c.name} ({c.slug ? `${c.slug}@seleksia.com` : "no-slug"})
              </option>
            ))}
          </select>
        </div>

        {/* Search input & Refresh */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--color-text-muted)]">
              search
            </span>
            <input
              type="text"
              placeholder="Cari pengirim, email, subjek..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-sm bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-main)] focus:outline-none focus:border-primary placeholder-[var(--color-text-muted)]"
            />
          </div>

          <button
            onClick={() => fetchEmails()}
            title="Muat Ulang"
            className="px-3 py-2 bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-main)] rounded-[var(--radius-md)] text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[18px] ${isLoading ? "animate-spin" : ""}`}>
              refresh
            </span>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-[var(--radius-lg)] p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-primary text-[24px] shrink-0 mt-0.5">mark_email_read</span>
        <div className="text-sm">
          <p className="font-bold text-[var(--color-text-main)]">Kotak Masuk Email Terpadu & Fitur Balas:</p>
          <p className="text-[var(--color-text-sub)] mt-0.5">
            Klik pada baris email untuk membaca isi pesan dan <strong>membalas langsung</strong> ke pengirim via Resend tanpa perlu membuka aplikasi email luar.
          </p>
        </div>
      </div>

      {/* Email List Table / Cards */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-[var(--color-text-muted)] space-y-3">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
            <p className="text-sm font-medium">Memuat kotak masuk email...</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="p-16 text-center text-[var(--color-text-muted)] space-y-3">
            <span className="material-symbols-outlined text-5xl text-[var(--color-text-muted)]">mark_email_unread</span>
            <p className="text-base font-bold text-[var(--color-text-main)]">Kotak Masuk Kosong</p>
            <p className="text-sm max-w-md mx-auto">
              Belum ada email masuk untuk kriteria filter ini.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {emails.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenDetail(item)}
                className="p-4 md:p-5 hover:bg-[var(--color-bg-elevated)]/60 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* Left Content */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Sender badge */}
                    <span className="font-bold text-[var(--color-text-main)] group-hover:text-primary transition-colors text-sm md:text-base truncate max-w-xs">
                      {item.from}
                    </span>

                    {/* Status badge */}
                    {item.status === "replied" ? (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">reply_all</span>
                        Sudah Dibalas
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">mail</span>
                        Baru
                      </span>
                    )}

                    {/* Target Email badge */}
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20">
                      Ke: {item.toEmail}
                    </span>

                    {/* Company Tag */}
                    {item.company && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">domain</span>
                        {item.company.name}
                      </span>
                    )}

                    {/* Candidate Match Tag */}
                    {item.candidate && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">person_check</span>
                        Kandidat: {item.candidate.name} ({item.candidate.displayId})
                      </span>
                    )}
                  </div>

                  {/* Subject line */}
                  <p className="font-semibold text-sm text-[var(--color-text-main)] truncate">
                    {item.subject || "(Tanpa Subjek)"}
                  </p>

                  {/* Message snippet */}
                  <p className="text-xs text-[var(--color-text-sub)] line-clamp-1">
                    {item.text || (item.html ? "(Pesan berformat HTML)" : "(Pesan kosong)")}
                  </p>
                </div>

                {/* Right Side: Date & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                  <span className="text-xs text-[var(--color-text-muted)] font-medium">
                    {formatDate(item.createdAt)}
                  </span>

                  <div className="flex items-center gap-1 opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      title="Hapus Email"
                      className="p-1.5 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-[var(--radius-md)] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-sub)]">
            <span>
              Menampilkan {emails.length} dari {total} total email
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)] disabled:opacity-50 cursor-pointer font-medium"
              >
                Sebelumnya
              </button>
              <span className="px-2 font-bold text-[var(--color-text-main)]">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)] disabled:opacity-50 cursor-pointer font-medium"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email Detail & Reply Modal */}
      {selectedEmail && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={selectedEmail.subject || "(Tanpa Subjek)"}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-5">
            {/* Header info */}
            <div className="bg-[var(--color-bg-elevated)] p-4 rounded-[var(--radius-md)] border border-[var(--color-border)] space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                <div>
                  <span className="text-[var(--color-text-sub)]">Dari: </span>
                  <strong className="text-[var(--color-text-main)]">{selectedEmail.from}</strong>
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {formatDate(selectedEmail.createdAt)}
                </div>
              </div>

              <div className="text-sm">
                <span className="text-[var(--color-text-sub)]">Kepada: </span>
                <strong className="text-[var(--color-text-main)]">{selectedEmail.to}</strong>
              </div>

              {/* Tags row */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {selectedEmail.status === "replied" && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">reply_all</span>
                    Sudah Dibalas
                  </span>
                )}
                {selectedEmail.company && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    🏢 Perusahaan: {selectedEmail.company.name} ({selectedEmail.company.slug}@seleksia.com)
                  </span>
                )}
                {selectedEmail.candidate && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    👤 Kandidat: {selectedEmail.candidate.name} ({selectedEmail.candidate.displayId})
                  </span>
                )}
              </div>
            </div>

            {/* View Mode Toggle & Reply Button */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode("html")}
                  disabled={!selectedEmail.html}
                  className={`px-3 py-1 text-xs font-bold rounded-[var(--radius-md)] transition-colors cursor-pointer ${
                    viewMode === "html"
                      ? "bg-primary text-white"
                      : "bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)] hover:text-[var(--color-text-main)]"
                  } disabled:opacity-40`}
                >
                  HTML Preview
                </button>
                <button
                  onClick={() => setViewMode("text")}
                  className={`px-3 py-1 text-xs font-bold rounded-[var(--radius-md)] transition-colors cursor-pointer ${
                    viewMode === "text"
                      ? "bg-primary text-white"
                      : "bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)] hover:text-[var(--color-text-main)]"
                  }`}
                >
                  Plain Text
                </button>
              </div>

              {/* Action Buttons: Reply directly inside web app */}
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className={`px-4 py-2 rounded-[var(--radius-md)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  showReplyForm
                    ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-main)] border border-[var(--color-border)]"
                    : "bg-primary hover:bg-primary/90 text-white"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {showReplyForm ? "close" : "reply"}
                </span>
                {showReplyForm ? "Tutup Form Balasan" : "Balas Email"}
              </button>
            </div>

            {/* In-App Reply Composer Box */}
            {showReplyForm && (
              <div className="bg-primary/5 border border-primary/20 rounded-[var(--radius-lg)] p-5 space-y-4 animate-slide-in-up">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[var(--color-text-main)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">edit_note</span>
                    Tulis Balasan ke: <span className="text-primary">{selectedEmail.fromEmail}</span>
                  </h4>

                  <span className="text-xs text-[var(--color-text-muted)]">
                    Dikirim via: {selectedEmail.company?.name || "Seleksia Support"}
                  </span>
                </div>

                {/* Subject field */}
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-sub)] block mb-1">
                    Subjek Balasan:
                  </label>
                  <input
                    type="text"
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-main)] focus:outline-none focus:border-primary font-medium"
                  />
                </div>

                {/* Quick Templates */}
                <div>
                  <span className="text-xs font-semibold text-[var(--color-text-muted)] block mb-1.5">
                    Template Cepat:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReplyMessage(tmpl.text)}
                        className="px-2.5 py-1 text-xs bg-[var(--color-bg-card)] hover:bg-primary/10 hover:border-primary border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-sub)] transition-colors cursor-pointer"
                      >
                        ⚡ {tmpl.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea */}
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-sub)] block mb-1">
                    Isi Pesan Balasan:
                  </label>
                  <textarea
                    rows={6}
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Tuliskan balasan Anda di sini..."
                    className="w-full p-3 text-sm bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-main)] focus:outline-none focus:border-primary leading-relaxed resize-y"
                  />
                </div>

                {/* Send Button */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReplyForm(false)}
                    className="px-4 py-2 text-xs font-semibold text-[var(--color-text-sub)] hover:text-[var(--color-text-main)] cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    disabled={isSendingReply || !replyMessage.trim()}
                    onClick={handleSendReply}
                    className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-[var(--radius-md)] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isSendingReply ? (
                      <>
                        <span className="material-symbols-outlined text-[16px] animate-spin">
                          progress_activity
                        </span>
                        Mengirim Balasan...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        Kirim Balasan Sekarang
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Email Body Content (Original Message) */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Isi Email Masuk:
              </span>
              <div className="min-h-[220px] max-h-[400px] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
                {viewMode === "html" && selectedEmail.html ? (
                  <div
                    className="prose dark:prose-invert max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--color-text-main)] leading-relaxed">
                    {selectedEmail.text || "(Tidak ada konten teks)"}
                  </pre>
                )}
              </div>
            </div>

            {/* Attachments Section if present */}
            {(() => {
              const atts = parseAttachments(selectedEmail.attachments);
              if (atts.length === 0) return null;
              return (
                <div className="border-t border-[var(--color-border)] pt-3 space-y-2">
                  <p className="text-xs font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">attach_file</span>
                    Lampiran File ({atts.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {atts.map((att: any, idx: number) => (
                      <div
                        key={idx}
                        className="px-3 py-1.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs font-medium text-[var(--color-text-main)] flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px] text-primary">description</span>
                        <span>{att.filename || `Attachment ${idx + 1}`}</span>
                        {att.size && (
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            ({Math.round(att.size / 1024)} KB)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Collapsible Headers */}
            {selectedEmail.rawHeaders && (
              <div className="border-t border-[var(--color-border)] pt-2">
                <button
                  onClick={() => setShowHeaders(!showHeaders)}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] flex items-center gap-1 font-medium cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {showHeaders ? "expand_less" : "expand_more"}
                  </span>
                  {showHeaders ? "Sembunyikan Raw Headers" : "Lihat Raw Email Headers"}
                </button>
                {showHeaders && (
                  <pre className="mt-2 p-3 bg-[var(--color-bg-elevated)] text-[10px] font-mono text-[var(--color-text-sub)] rounded-[var(--radius-md)] overflow-x-auto max-h-40">
                    {selectedEmail.rawHeaders}
                  </pre>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
