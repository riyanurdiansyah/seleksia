"use client";

import React, { useEffect, useState, useRef, useCallback, memo } from "react";
import AdminGuard from "../../AdminGuard";
import Breadcrumb from "../../components/Breadcrumb";
import Pusher from "pusher-js";
import Select2 from "../../components/Select2";

interface CandidateState {
  candidateId: string;
  candidateName: string;
  candidateDisplayId: string;
  testName: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  answersCount: number;
  timeLeft: number;
  violationsCount: number;
  faceDetected: boolean;
  cameraActive: boolean;
  isTabHidden: boolean;
  isFullscreen: boolean;
  snapshot: string | null; // base64 string
  updatedAt: string;
  isOnline?: boolean;
  companyId?: string;
}

/**
 * Snapshot Event Bus — allows WebSocket to push frames directly to canvas
 * components without going through React state/props.
 * Each SnapshotCanvas subscribes by candidateId and receives frames instantly.
 */
type SnapshotListener = (snapshot: string) => void;
const snapshotBus = {
  listeners: new Map<string, Set<SnapshotListener>>(),
  subscribe(candidateId: string, listener: SnapshotListener) {
    if (!this.listeners.has(candidateId)) {
      this.listeners.set(candidateId, new Set());
    }
    this.listeners.get(candidateId)!.add(listener);
    return () => {
      const set = this.listeners.get(candidateId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) this.listeners.delete(candidateId);
      }
    };
  },
  emit(candidateId: string, snapshot: string) {
    const set = this.listeners.get(candidateId);
    if (set) {
      set.forEach((fn) => fn(snapshot));
    }
  },
};

/**
 * SnapshotCanvas — renders webcam snapshots at high FPS via HTML5 Canvas.
 * - Subscribes to snapshotBus to receive frames WITHOUT React re-renders
 * - Uses Image() preloading (double-buffering) to prevent flicker
 * - requestAnimationFrame for browser-optimal rendering timing
 */
const SnapshotCanvas = memo(function SnapshotCanvas({
  candidateId,
  initialSnapshot,
  className,
}: {
  candidateId: string;
  initialSnapshot?: string | null;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const hasDrawnRef = useRef(false);

  // Draw a frame onto the canvas
  const drawFrame = useCallback((snapshot: string) => {
    const img = new Image();
    img.onload = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        if (canvas.width !== img.width || canvas.height !== img.height) {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        ctx.drawImage(img, 0, 0);
        hasDrawnRef.current = true;
      });
    };
    img.src = snapshot;
  }, []);

  // Subscribe to fast snapshot stream
  useEffect(() => {
    const unsub = snapshotBus.subscribe(candidateId, drawFrame);
    return () => {
      unsub();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [candidateId, drawFrame]);

  // Draw initial snapshot if available (from metadata)
  useEffect(() => {
    if (initialSnapshot && !hasDrawnRef.current) {
      drawFrame(initialSnapshot);
    }
  }, [initialSnapshot, drawFrame]);

  return (
    <canvas
      ref={canvasRef}
      className={className || "w-full h-full object-cover"}
      style={{ imageRendering: "auto" }}
    />
  );
});


export default function MonitoringPage() {
  const [candidates, setCandidates] = useState<Record<string, CandidateState>>({});
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [envWarning, setEnvWarning] = useState(false);
  const pusherRef = useRef<Pusher | null>(null);

  // Role and Company Filtering States
  const [currentRole, setCurrentRole] = useState<string>("user");
  const [adminCompanyId, setAdminCompanyId] = useState<string>("");
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");

  // Fetch current user details and companies
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setCurrentRole(data.role);
          setAdminCompanyId(data.companyId);
          
          if (data.role === "superadmin") {
            const compRes = await fetch("/api/companies");
            if (compRes.ok) {
              const compData = await compRes.json();
              setCompanies(compData);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch session info:", err);
      }
    };
    fetchMe();
  }, []);

  // Retrieve Pusher configuration
  const useSoketi = process.env.NEXT_PUBLIC_USE_SOKETI === "true";
  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY || (useSoketi ? "app-key" : "");
  const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || (useSoketi ? "mt1" : "");

  useEffect(() => {
    let pusher: Pusher | null = null;
    let wsClient: WebSocket | null = null;
    const channelName = "presence-exam-monitoring";

    if (useSoketi) {
      const host = process.env.NEXT_PUBLIC_PUSHER_HOST || "127.0.0.1";
      const port = process.env.NEXT_PUBLIC_PUSHER_PORT || "6001";
      const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
      const wsUrl = `${protocol}://${host}${port && port !== "80" && port !== "443" ? ":" + port : ""}/ws-monitoring`;

      const connectWs = () => {
        try {
          wsClient = new WebSocket(wsUrl);
          
          wsClient.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              
              if (data.type === "initial-states") {
                const activeMembers: Record<string, CandidateState> = {};
                data.payload.forEach((payload: CandidateState) => {
                  activeMembers[payload.candidateId] = {
                    ...payload,
                    isOnline: payload.isOnline ?? true,
                  };
                });
                setCandidates(activeMembers);
              } else if (data.type === "state-update") {
                setCandidates((prev) => ({
                  ...prev,
                  [data.payload.candidateId]: {
                    ...prev[data.payload.candidateId],
                    ...data.payload,
                    isOnline: true,
                  },
                }));
              } else if (data.type === "state-offline") {
                setCandidates((prev) => {
                  const next = { ...prev };
                  if (next[data.payload.candidateId]) {
                    next[data.payload.candidateId].isOnline = false;
                  }
                  return next;
                });
              } else if (data.type === "snapshot-frame") {
                // Fast channel: push directly to canvas via event bus (no React re-render)
                snapshotBus.emit(data.payload.candidateId, data.payload.snapshot);
              }
            } catch (err) {
              console.error("Failed to parse websocket message", err);
            }
          };

          wsClient.onclose = () => {
            console.log("Admin Monitor WebSocket disconnected. Reconnecting in 3s...");
            setTimeout(connectWs, 3000);
          };

          wsClient.onerror = (err) => {
            console.warn("Admin Monitor WebSocket error:", err);
          };

        } catch (err) {
          console.error("Failed to connect to monitoring WebSocket server", err);
        }
      };
      connectWs();

    } else {
      if (!pusherKey || !pusherCluster) {
        setEnvWarning(true);
        return;
      }

      pusher = new Pusher(pusherKey, {
        cluster: pusherCluster,
        authEndpoint: "/api/pusher/auth",
        auth: {
          params: {
            candidateId: localStorage.getItem("candidateId") || "admin",
          },
        },
      });

      pusherRef.current = pusher;
      const channel = pusher.subscribe(channelName);

      // Initial load / sync from pusher membership
      channel.bind("pusher:subscription_succeeded", (members: any) => {
        const activeMembers: Record<string, CandidateState> = {};
        members.each((member: any) => {
          // Skip self (admin)
          if (member.info && member.info.role !== "admin" && member.info.role !== "superadmin") {
            activeMembers[member.id] = {
              candidateId: member.id,
              candidateName: member.info.name || "Candidate",
              candidateDisplayId: member.info.displayId || member.id,
              testName: "Connecting...",
              currentQuestionIndex: 0,
              totalQuestions: 0,
              answersCount: 0,
              timeLeft: 0,
              violationsCount: 0,
              faceDetected: true,
              cameraActive: false,
              isTabHidden: false,
              isFullscreen: true,
              snapshot: null,
              updatedAt: new Date().toISOString(),
              isOnline: true,
              companyId: member.info.companyId,
            };
          }
        });
        setCandidates(activeMembers);
      });

      // Handle new member joining
      channel.bind("pusher:member_added", (member: any) => {
        if (member.info && member.info.role !== "admin" && member.info.role !== "superadmin") {
          setCandidates((prev) => ({
            ...prev,
            [member.id]: {
              candidateId: member.id,
              candidateName: member.info.name || "Candidate",
              candidateDisplayId: member.info.displayId || member.id,
              testName: "Connecting...",
              currentQuestionIndex: 0,
              totalQuestions: 0,
              answersCount: 0,
              timeLeft: 0,
              violationsCount: 0,
              faceDetected: true,
              cameraActive: false,
              isTabHidden: false,
              isFullscreen: true,
              snapshot: null,
              updatedAt: new Date().toISOString(),
              isOnline: true,
              companyId: member.info.companyId,
            },
          }));
        }
      });

      // Handle member leaving
      channel.bind("pusher:member_removed", (member: any) => {
        setCandidates((prev) => {
          const next = { ...prev };
          if (next[member.id]) {
            next[member.id].isOnline = false;
          }
          return next;
        });
      });

      // Handle incoming candidate state updates (snapshot, answers, etc.)
      channel.bind("client-state-update", (data: CandidateState) => {
        setCandidates((prev) => ({
          ...prev,
          [data.candidateId]: {
            ...prev[data.candidateId],
            ...data,
            isOnline: true,
          },
        }));
      });
    }

    // Cleanup on unmount
    return () => {
      if (useSoketi) {
        if (wsClient) {
          wsClient.onclose = null;
          wsClient.close();
        }
      } else {
        if (pusher) {
          pusher.unbind_all();
          pusher.unsubscribe(channelName);
          pusher.disconnect();
        }
      }
    };
  }, [pusherKey, pusherCluster]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const candidatesFilteredByCompany = Object.values(candidates).filter((c) => {
    if (currentRole === "superadmin") {
      if (selectedCompany !== "all" && c.companyId !== selectedCompany) {
        return false;
      }
      return true;
    } else {
      return c.companyId === adminCompanyId;
    }
  });

  const filteredCandidates = candidatesFilteredByCompany.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      c.candidateName.toLowerCase().includes(query) ||
      c.candidateDisplayId.toLowerCase().includes(query) ||
      (c.testName && c.testName.toLowerCase().includes(query))
    );
  });

  const selectedCandidate = selectedCandidateId ? candidates[selectedCandidateId] : null;

  return (
    <AdminGuard>
      <div className="space-y-6 animate-fade-in p-6">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">
              Real-time Monitoring
            </h1>
            <Breadcrumb />
          </div>
          <p className="text-[var(--color-text-sub)] text-sm font-medium">
            Pantau aktivitas kandidat, tampilan layar, dan feed kamera webcam secara live.
          </p>
        </div>

        {/* Env Configuration Warning */}
        {envWarning && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4 flex gap-3">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">warning</span>
            <div>
              <h4 className="font-bold text-amber-800 dark:text-amber-200 text-sm">Pusher Credentials Missing</h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                Kredensial Pusher belum diisi di file `.env`. Untuk menggunakan fitur live monitoring secara penuh, silakan lengkapi variabel berikut di file `.env`: <br />
                `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`, `PUSHER_APP_ID`, dan `PUSHER_SECRET`.
              </p>
            </div>
          </div>
        )}

        {/* Dashboard Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[var(--color-bg-card)] border border-[var(--color-border)] p-4 rounded-xl shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 w-full md:max-w-xl items-center">
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-[20px] text-[var(--color-text-muted)]">search</span>
              </span>
              <input
                type="text"
                className="w-full h-10 pl-10 pr-4 rounded-full text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] outline-none bg-[var(--color-bg-elevated)] border border-[var(--color-border)] focus:border-primary focus:bg-white transition-all"
                placeholder="Cari kandidat berdasarkan nama atau ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {currentRole === "superadmin" && (
              <Select2
                options={[
                  { value: "all", label: "Semua Perusahaan" },
                  ...companies.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={selectedCompany}
                onChange={setSelectedCompany}
                placeholder="Pilih Perusahaan"
                className="w-full sm:w-64"
              />
            )}
          </div>
          <div className="flex gap-4 text-xs font-semibold text-[var(--color-text-sub)]">
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 px-3 py-1.5 rounded-full">
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              {candidatesFilteredByCompany.filter((c) => c.isOnline).length} Active Now
            </div>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 px-3 py-1.5 rounded-full">
              {candidatesFilteredByCompany.filter((c) => !c.isOnline).length} Offline / Idle
            </div>
          </div>
        </div>

        {/* Candidates Monitoring Grid */}
        {filteredCandidates.length === 0 ? (
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-16 text-center space-y-4 shadow-sm">
            <span className="material-symbols-outlined text-6xl text-[var(--color-text-muted)] opacity-30">
              videocam_off
            </span>
            <h3 className="text-base font-bold text-[var(--color-text-main)]">Tidak Ada Sesi Aktif</h3>
            <p className="text-sm text-[var(--color-text-sub)] max-w-sm mx-auto">
              Saat ini tidak ada kandidat yang sedang mengerjakan ujian secara online atau terhubung.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCandidates.map((cand) => {
              const hasViolations = cand.violationsCount > 0;
              const hasAlert = cand.isTabHidden || !cand.isFullscreen || !cand.faceDetected;

              return (
                <div
                  key={cand.candidateId}
                  onClick={() => cand.isOnline && setSelectedCandidateId(cand.candidateId)}
                  className={`group relative flex flex-col justify-between bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-elevated)] border rounded-2xl p-5 shadow-sm transition-all duration-300 ${
                    !cand.isOnline
                      ? "opacity-60 border-[var(--color-border)]"
                      : selectedCandidateId === cand.candidateId
                      ? "border-primary ring-2 ring-primary/20 scale-[1.01]"
                      : hasAlert
                      ? "border-red-400 dark:border-red-800 shadow-md hover:shadow-red-100"
                      : "border-[var(--color-border)] hover:border-primary/40 hover:-translate-y-1 hover:shadow-md cursor-pointer"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-[var(--color-text-main)] group-hover:text-primary transition-colors truncate max-w-[180px]">
                          {cand.candidateName}
                        </h4>
                        <span className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider block">
                          ID: {cand.candidateDisplayId}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {cand.isOnline ? (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            LIVE
                          </div>
                        ) : (
                          <div className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            DISCONNECTED
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Snapshot & Status indicators */}
                    <div className="relative aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center border border-slate-800">
                      <SnapshotCanvas
                        candidateId={cand.candidateId}
                        initialSnapshot={cand.snapshot}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      {/* Warnings pill */}
                      {hasViolations && (
                        <div className="absolute top-3 left-3 bg-red-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-md">
                          <span className="material-symbols-outlined text-[12px]">warning</span>
                          {cand.violationsCount} Warning{cand.violationsCount > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>

                    {/* Indicators list */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div
                        className={`flex items-center gap-1.5 px-2 py-1 rounded border ${
                          cand.isTabHidden
                            ? "bg-red-50 border-red-200 text-red-700 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[12px]">tab</span>
                        {cand.isTabHidden ? "Tab Switched" : "Focused"}
                      </div>
                      <div
                        className={`flex items-center gap-1.5 px-2 py-1 rounded border ${
                          !cand.isFullscreen
                            ? "bg-red-50 border-red-200 text-red-700 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[12px]">fullscreen_exit</span>
                        {cand.isFullscreen ? "Fullscreen" : "Exited FS"}
                      </div>
                      <div
                        className={`flex items-center gap-1.5 px-2 py-1 rounded border ${
                          cand.cameraActive && !cand.faceDetected
                            ? "bg-red-50 border-red-200 text-red-700 font-bold animate-pulse"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[12px]">face</span>
                        {!cand.cameraActive
                          ? "No Cam Access"
                          : cand.faceDetected
                          ? "Face OK"
                          : "No Face Detected"}
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded border bg-slate-50 border-slate-200 text-slate-600">
                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                        {formatTime(cand.timeLeft)} Left
                      </div>
                    </div>
                  </div>

                  {/* Footer (Test progress details) */}
                  <div className="border-t border-[var(--color-border)] mt-4 pt-3 space-y-1.5">
                    <p className="text-[11px] font-semibold text-[var(--color-text-sub)] truncate">
                      {cand.testName}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] font-medium">
                      <span>
                        Soal {cand.currentQuestionIndex + 1} / {cand.totalQuestions}
                      </span>
                      <span>{cand.answersCount} Jawaban</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            cand.totalQuestions > 0
                              ? (cand.answersCount / cand.totalQuestions) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed Mirroring Overlay / Modal */}
        {selectedCandidate && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-strong)] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row animate-slide-up">
              {/* Webcam Pane */}
              <div className="md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-[var(--color-border)] flex flex-col justify-between bg-slate-950/20">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-[var(--color-text-main)]">
                      Webcam Monitor
                    </h3>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-950/20 px-2.5 py-1 rounded-md uppercase animate-pulse">
                      <div className="size-1.5 rounded-full bg-red-500" />
                      Live Feed
                    </div>
                  </div>

                  <div className="relative aspect-[4/3] w-full bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 flex items-center justify-center shadow-lg">
                    <SnapshotCanvas
                      candidateId={selectedCandidate.candidateId}
                      initialSnapshot={selectedCandidate.snapshot}
                      className="w-full h-full object-cover"
                    />

                    {selectedCandidate.violationsCount > 0 && (
                      <div className="absolute top-4 left-4 bg-red-600 text-white font-bold text-[11px] px-3 py-1 rounded-md flex items-center gap-1.5 shadow-lg">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        Telah Melakukan {selectedCandidate.violationsCount} Pelanggaran
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <h4 className="font-semibold text-xs text-[var(--color-text-sub)]">Log Deteksi Anti-Cheat:</h4>
                  <div className="space-y-2">
                    <div className={`p-3 rounded-lg border text-xs flex justify-between items-center ${
                      selectedCandidate.isTabHidden 
                        ? "bg-red-50 border-red-200 text-red-700 font-bold" 
                        : "bg-emerald-50/50 border-emerald-100 text-emerald-700"
                    }`}>
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">tab</span>
                        Fokus Tab Browser
                      </span>
                      <span>{selectedCandidate.isTabHidden ? "⚠️ Tab Dialihkan / Keluar" : "✓ Fokus Aktif"}</span>
                    </div>

                    <div className={`p-3 rounded-lg border text-xs flex justify-between items-center ${
                      !selectedCandidate.isFullscreen 
                        ? "bg-red-50 border-red-200 text-red-700 font-bold" 
                        : "bg-emerald-50/50 border-emerald-100 text-emerald-700"
                    }`}>
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">fullscreen</span>
                        Mode Layar Penuh
                      </span>
                      <span>{selectedCandidate.isFullscreen ? "✓ Aktif" : "⚠️ Tidak Aktif / Keluar"}</span>
                    </div>

                    <div className={`p-3 rounded-lg border text-xs flex justify-between items-center ${
                      selectedCandidate.cameraActive && !selectedCandidate.faceDetected 
                        ? "bg-red-50 border-red-200 text-red-700 font-bold animate-pulse" 
                        : "bg-emerald-50/50 border-emerald-100 text-emerald-700"
                    }`}>
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">face</span>
                        Deteksi Wajah AI
                      </span>
                      <span>
                        {!selectedCandidate.cameraActive 
                          ? "🚫 Kamera Mati" 
                          : selectedCandidate.faceDetected 
                          ? "✓ Wajah Terdeteksi" 
                          : "⚠️ Wajah Tidak Terlihat"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* State & Screen Mirroring Pane */}
              <div className="md:w-1/2 p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-6">
                  {/* Header details */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="font-extrabold text-lg text-[var(--color-text-main)]">
                        {selectedCandidate.candidateName}
                      </h2>
                      <p className="text-xs text-[var(--color-text-muted)] font-mono uppercase tracking-wider mt-0.5">
                        ID: {selectedCandidate.candidateDisplayId}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedCandidateId(null)}
                      className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>

                  {/* Live Exam details mock screen */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-xs text-[var(--color-text-sub)] uppercase tracking-wider">
                      Ujian Terpilih & Progress
                    </h3>

                    <div className="bg-[var(--color-bg-elevated)] p-4 rounded-xl border border-[var(--color-border)] space-y-4">
                      <div className="flex justify-between items-center text-xs font-semibold text-[var(--color-text-main)]">
                        <span>{selectedCandidate.testName}</span>
                        <span className="font-mono text-primary text-sm">
                          {formatTime(selectedCandidate.timeLeft)} Tersisa
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[11px] text-[var(--color-text-muted)]">
                          <span>Progress Pengisian</span>
                          <span>
                            {selectedCandidate.answersCount} dari {selectedCandidate.totalQuestions} Soal
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{
                              width: `${
                                selectedCandidate.totalQuestions > 0
                                  ? (selectedCandidate.answersCount /
                                      selectedCandidate.totalQuestions) *
                                    100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Virtual Mirroring Mock */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-xs text-[var(--color-text-sub)]">
                        Mirroring Layar Soal:
                      </h4>

                      <div className="border border-[var(--color-border)] rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                            {selectedCandidate.currentQuestionIndex + 1}
                          </div>
                          <span className="text-xs font-semibold text-[var(--color-text-main)]">
                            Sedang Membuka Soal #{selectedCandidate.currentQuestionIndex + 1}
                          </span>
                        </div>

                        <p className="text-[11px] text-[var(--color-text-muted)] italic leading-relaxed">
                          (Kandidat sedang membaca pertanyaan nomor {selectedCandidate.currentQuestionIndex + 1} dan mengisi jawaban. Pergerakan soal disinkronisasikan secara langsung dengan layar kandidat.)
                        </p>

                        <div className="flex items-center gap-2 pt-2 text-[10px] text-primary font-semibold">
                          <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                          <span>Tersinkronisasi secara real-time via Pusher WebSockets</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--color-border)]">
                  <button
                    onClick={() => setSelectedCandidateId(null)}
                    className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 dark:text-white dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-xs cursor-pointer transition-colors"
                  >
                    Tutup Pemantauan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
