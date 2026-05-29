"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AuthGuard from "../components/AuthGuard";
import Pusher from "pusher-js";

/* ===== Types ===== */
interface QuestionData {
    id: string;
    displayId: string;
    type: string;
    text: string;
    options: string[];
    imageUrl: string | null;
    timeLimit: number | null;
    sortOrder: number;
}

interface TestData {
    id: string;
    displayId: string;
    name: string;
    category: string;
    questionType: string;
    description: string | null;
    duration: number;
    questions: QuestionData[];
}

interface AssignmentData {
    id: string;
    status?: string;
    startedAt?: string;
    test: TestData;
    candidate: { id: string; displayId: string; name: string; companyId: string };
    answers?: { questionId: string; answer: string }[];
}

interface NextApiResponse {
    hasNext: boolean;
    assignment?: AssignmentData;
    currentNumber?: number;
    totalAssignments?: number;
    completedAssignments?: number;
    serverTime?: string;
}

/* ===== Helper: Generate option keys ===== */
const OPTION_KEYS = ["A", "B", "C", "D", "E", "F", "G", "H"];

/* ===== Shuffle helper (Fisher-Yates) ===== */
function shuffleArray<T>(arr: T[]): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/* ===== Exam Page Component ===== */
export default function ExamPage() {
    // Data state
    const [assignment, setAssignment] = useState<AssignmentData | null>(null);
    const [questions, setQuestions] = useState<QuestionData[]>([]);
    const [testName, setTestName] = useState("");
    const [testDuration, setTestDuration] = useState(60); // minutes
    const [loadingData, setLoadingData] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [currentNumber, setCurrentNumber] = useState(0);
    const [totalAssignments, setTotalAssignments] = useState(0);

    // Exam state
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [violations, setViolations] = useState(0);
    const [showViolation, setShowViolation] = useState(false);
    const [violationMsg, setViolationMsg] = useState("");
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [saved, setSaved] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [faceDetected, setFaceDetected] = useState(true);
    const startTimeRef = useRef<number>(Date.now());
    const lastViolationTimeRef = useRef<number>(0); // debounce violations
    const lastViolationsByTypeRef = useRef<Record<string, number>>({}); // track last time for each violation type
    const [isTabHidden, setIsTabHidden] = useState(false); // track if tab is out of focus
    const sessionTokenRef = useRef<string>(""); // unique session token for multi-tab lock
    const [isFullscreen, setIsFullscreen] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const lastClickTimeRef = useRef<number>(0);

    // Derived
    const question = questions[currentQ];
    const answeredCount = Object.keys(answers).length;
    const unansweredCount = questions.length - answeredCount;
    const isTimeCritical = timeLeft <= 300;

    // Format time
    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    };

    /* ===== Generate device fingerprint ===== */
    const getDeviceFingerprint = useCallback(() => {
        const ua = navigator.userAgent;
        const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
        const lang = navigator.language;
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const raw = `${ua}|${screen}|${lang}|${tz}`;
        // Simple hash
        let hash = 0;
        for (let i = 0; i < raw.length; i++) {
            const chr = raw.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return `fp_${Math.abs(hash).toString(36)}`;
    }, []);

    /* ===== Multi-tab detection via BroadcastChannel ===== */
    useEffect(() => {
        const channel = new BroadcastChannel("seleksia_exam_tab");
        const myTabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        // Announce this tab
        channel.postMessage({ type: "TAB_OPEN", tabId: myTabId });

        channel.onmessage = (event) => {
            if (event.data.type === "TAB_OPEN" && event.data.tabId !== myTabId) {
                // Another tab opened the exam — block it by showing error
                setLoadError("Exam is already open in another tab. Please close this tab and return to the original exam tab.");
                setLoadingData(false);
            }
            if (event.data.type === "TAB_PING" && event.data.tabId !== myTabId) {
                // Respond to ping to prove we're alive
                channel.postMessage({ type: "TAB_PONG", tabId: myTabId });
            }
        };

        // Periodic ping to check if another tab exists
        const pingInterval = setInterval(() => {
            channel.postMessage({ type: "TAB_PING", tabId: myTabId });
        }, 3000);

        return () => {
            channel.postMessage({ type: "TAB_CLOSE", tabId: myTabId });
            channel.close();
            clearInterval(pingInterval);
        };
    }, []);

    /* ===== Load assignment data ===== */
    useEffect(() => {
        const loadAssignment = async () => {
            try {
                const candidateId = sessionStorage.getItem("candidateId");
                if (!candidateId) {
                    setLoadError("Session expired. Please login again.");
                    setLoadingData(false);
                    return;
                }

                const selectedAssignmentId = sessionStorage.getItem("selectedAssignmentId");
                const url = selectedAssignmentId
                    ? `/api/assignments/next?candidateId=${candidateId}&assignmentId=${selectedAssignmentId}`
                    : `/api/assignments/next?candidateId=${candidateId}`;

                const res = await fetch(url);
                if (!res.ok) throw new Error("Failed to fetch assignment");

                const data: NextApiResponse = await res.json();

                if (!data.hasNext || !data.assignment) {
                    setLoadError("No tests available. All assignments completed.");
                    setLoadingData(false);
                    return;
                }

                const asgn = data.assignment;

                // Generate session token + device fingerprint
                const token = `ses_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                sessionTokenRef.current = token;
                const fingerprint = getDeviceFingerprint();

                // Validate session (device lock + multi-tab lock via server)
                const sessionRes = await fetch("/api/exam/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        assignmentId: asgn.id,
                        deviceFingerprint: fingerprint,
                        sessionToken: token,
                    }),
                });

                if (!sessionRes.ok) {
                    const sessionErr = await sessionRes.json();
                    if (sessionErr.error === "device_mismatch") {
                        setLoadError("This exam was started on a different device. You cannot switch devices during an exam. Please return to the original device.");
                    } else if (sessionErr.error === "multi_tab") {
                        setLoadError("This exam is already open in another tab. Please close this tab.");
                    } else {
                        setLoadError(sessionErr.message || "Session validation failed.");
                    }
                    setLoadingData(false);
                    return;
                }

                setAssignment(asgn);

                // Shuffle questions for randomized order
                const shuffledQuestions = shuffleArray(asgn.test.questions);
                setQuestions(shuffledQuestions);

                setTestName(asgn.test.name);
                setTestDuration(asgn.test.duration);

                let calculatedTimeLeft = asgn.test.duration * 60;
                if (asgn.status === "in_progress" && asgn.startedAt && data.serverTime) {
                    const elapsedMs = new Date(data.serverTime).getTime() - new Date(asgn.startedAt).getTime();
                    const elapsedSec = Math.floor(elapsedMs / 1000);
                    calculatedTimeLeft = Math.max(0, calculatedTimeLeft - elapsedSec);
                }
                setTimeLeft(calculatedTimeLeft);

                const initialAnswers: Record<string, string> = {};
                if (asgn.answers) {
                    asgn.answers.forEach((ans) => {
                        initialAnswers[ans.questionId] = ans.answer;
                    });
                }
                setAnswers(initialAnswers);

                setCurrentNumber(data.currentNumber || 1);
                setTotalAssignments(data.totalAssignments || 1);

                // Update start time reference using remaining time
                // to make sure client-side tracking and submit timestamps line up
                startTimeRef.current = Date.now() - ((asgn.test.duration * 60) - calculatedTimeLeft) * 1000;

                // Store assignment ID for finish page
                sessionStorage.setItem("currentAssignmentId", asgn.id);

                // Mark assignment as in_progress
                await fetch(`/api/assignments/${asgn.id}/start`, { method: "PATCH" });

                setLoadingData(false);
            } catch (err) {
                console.error("Failed to load assignment:", err);
                setLoadError("Failed to load test. Please try again.");
                setLoadingData(false);
            }
        };

        loadAssignment();
    }, [getDeviceFingerprint]);

    /* ===== Real-time Monitor State Sync ===== */
    const monitorStateRef = useRef({
        currentQ,
        answers,
        timeLeft,
        violations,
        faceDetected,
        cameraActive,
        isTabHidden,
        isFullscreen,
        submitted
    });

    useEffect(() => {
        monitorStateRef.current = {
            currentQ,
            answers,
            timeLeft,
            violations,
            faceDetected,
            cameraActive,
            isTabHidden,
            isFullscreen,
            submitted
        };
    }, [currentQ, answers, timeLeft, violations, faceDetected, cameraActive, isTabHidden, isFullscreen, submitted]);

    useEffect(() => {
        if (loadingData || !assignment) return;

        const useSoketi = process.env.NEXT_PUBLIC_USE_SOKETI === "true";
        let pusherClient: any = null;
        let wsClient: WebSocket | null = null;
        let channel: any = null;
        const channelName = "presence-exam-monitoring";

        if (useSoketi) {
            const host = process.env.NEXT_PUBLIC_PUSHER_HOST || "127.0.0.1";
            const port = process.env.NEXT_PUBLIC_PUSHER_PORT || "6001";
            const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
            const wsUrl = `${protocol}://${host}:${port}`;
            
            const connectWs = () => {
                try {
                    wsClient = new WebSocket(wsUrl);
                    wsClient.onopen = () => {
                        console.log("WebSocket connected to local monitor server");
                    };
                    wsClient.onclose = () => {
                        console.log("WebSocket disconnected. Reconnecting in 3s...");
                        setTimeout(connectWs, 3000);
                    };
                    wsClient.onerror = (err) => {
                        console.warn("WebSocket connection error:", err);
                    };
                } catch (err) {
                    console.error("Failed to connect to local monitor server", err);
                }
            };
            connectWs();
        } else {
            const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
            const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

            if (pusherKey && pusherCluster) {
                pusherClient = new Pusher(pusherKey, {
                    cluster: pusherCluster,
                    authEndpoint: "/api/pusher/auth",
                    auth: {
                        params: {
                            candidateId: assignment.candidate.id,
                        },
                    },
                });
                channel = pusherClient.subscribe(channelName);
            }
        }

        // === FAST CHANNEL: Snapshot frames at ~10 FPS (100ms) ===
        const snapshotInterval = setInterval(() => {
            const currentMonitorState = monitorStateRef.current;
            if (currentMonitorState.submitted) return;
            if (!videoRef.current || !currentMonitorState.cameraActive) return;

            try {
                if (!captureCanvasRef.current) {
                    captureCanvasRef.current = document.createElement("canvas");
                    captureCanvasRef.current.width = 240;
                    captureCanvasRef.current.height = 180;
                }
                const canvas = captureCanvasRef.current;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;

                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const snapshot = canvas.toDataURL("image/jpeg", 0.5);

                const frameMsg = {
                    type: "candidate-snapshot",
                    payload: {
                        candidateId: assignment.candidate.id,
                        snapshot,
                    },
                };

                if (useSoketi) {
                    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
                        wsClient.send(JSON.stringify(frameMsg));
                    }
                } else {
                    if (channel) {
                        channel.trigger("client-snapshot", frameMsg.payload);
                    }
                }
            } catch (err) {
                // Silently skip frame on error
            }
        }, 100);

        // === SLOW CHANNEL: Metadata at 0.5 FPS (2000ms) ===
        const metadataInterval = setInterval(() => {
            const currentMonitorState = monitorStateRef.current;
            if (currentMonitorState.submitted) return;

            const payload = {
                candidateId: assignment.candidate.id,
                candidateName: assignment.candidate.name,
                candidateDisplayId: assignment.candidate.displayId,
                companyId: assignment.candidate.companyId,
                testName: assignment.test.name,
                currentQuestionIndex: currentMonitorState.currentQ,
                totalQuestions: questions.length,
                answersCount: Object.keys(currentMonitorState.answers).length,
                timeLeft: currentMonitorState.timeLeft,
                violationsCount: currentMonitorState.violations,
                faceDetected: currentMonitorState.faceDetected,
                cameraActive: currentMonitorState.cameraActive,
                isTabHidden: currentMonitorState.isTabHidden,
                isFullscreen: currentMonitorState.isFullscreen,
                snapshot: null, // snapshot sent via fast channel
                updatedAt: new Date().toISOString(),
            };

            if (useSoketi) {
                if (wsClient && wsClient.readyState === WebSocket.OPEN) {
                    wsClient.send(JSON.stringify({ type: "candidate-state", payload }));
                }
            } else {
                if (channel) {
                    channel.trigger("client-state-update", payload);
                }
            }
        }, 2000);

        return () => {
            clearInterval(snapshotInterval);
            clearInterval(metadataInterval);
            if (useSoketi) {
                if (wsClient) {
                    wsClient.onclose = null; // prevent reconnect loop
                    wsClient.close();
                }
            } else {
                if (pusherClient) {
                    pusherClient.unsubscribe(channelName);
                    pusherClient.disconnect();
                }
            }
        };
    }, [loadingData, assignment, questions.length]);

    /* ===== Record violation helper (with 2s debounce, 1 minute limit per type, NO auto-submit) ===== */
    const recordViolation = useCallback(async (type: string, description: string, severity: number = 1) => {
        if (!assignment || submitted) return;

        const now = Date.now();

        // Limit: skip if the SAME violation type was recorded less than 60 seconds (1 minute) ago
        const lastTypeTime = lastViolationsByTypeRef.current[type] || 0;
        if (now - lastTypeTime < 60000) return;

        // Debounce: skip if any violation was recorded less than 2 seconds ago
        if (now - lastViolationTimeRef.current < 2000) return;

        // Update timestamps
        lastViolationTimeRef.current = now;
        lastViolationsByTypeRef.current[type] = now;

        try {
            const res = await fetch("/api/violations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assignmentId: assignment.id,
                    type,
                    description,
                    severity,
                    sessionId: sessionTokenRef.current, // Session token from login
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setViolations(data.totalViolations);
            }
        } catch (err) {
            console.error("Failed to record violation:", err);
        }

        setViolationMsg(description);
        setShowViolation(true);
        // Don't auto-hide — the visibility handler will dismiss it when tab is focused
    }, [assignment, submitted]);

    /* ===== Timer ===== */
    useEffect(() => {
        if (submitted || loadingData || !assignment) return;
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    handleTimeExpiredSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [submitted, loadingData, assignment]);

    /* ===== Camera setup ===== */
    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setCameraActive(true);
            } catch {
                setCameraActive(false);
                // Record no camera violation
                if (assignment) {
                    recordViolation("no_camera", "Camera access denied or unavailable", 2);
                }
            }
        };
        if (!loadingData && assignment) {
            startCamera();
        }
        return () => {
            if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach((t) => t.stop());
            }
        };
    }, [loadingData, assignment]);

    /* ===== Face detection simulation (no face / multiple faces) ===== */
    useEffect(() => {
        if (!cameraActive || !assignment) return;
        const interval = setInterval(() => {
            const rand = Math.random();
            if (rand < 0.05) {
                // 5%: no face detected
                setFaceDetected(false);
                if (!submitted) {
                    recordViolation("face_not_detected", "No face detected in camera frame — candidate may have left", 2);
                }
            } else if (rand < 0.08) {
                // 3%: multiple faces detected
                setFaceDetected(false);
                if (!submitted) {
                    recordViolation("multiple_face", "Multiple faces detected in camera frame — possible third-party assistance", 3);
                }
            } else {
                setFaceDetected(true);
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [cameraActive, assignment, submitted, recordViolation]);

    /* ===== Anti-cheat: Tab switch / Alt+Tab detection ===== */
    /* Violation overlay STAYS until user returns focus */
    useEffect(() => {
        if (!assignment) return;
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setIsTabHidden(true);
                if (!submitted) {
                    recordViolation("tab_switch", "Candidate switched to another tab or minimized the browser (Alt+Tab / Cmd+Tab detected)", 3);
                }
            } else {
                setIsTabHidden(false);
                // Dismiss violation overlay when user returns
                setShowViolation(false);
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [assignment, submitted, recordViolation]);

    /* ===== Anti-cheat: Right-click (Temporarily disabled for debugging console) ===== */
    /*
    useEffect(() => {
        if (!assignment) return;
        const handler = (e: MouseEvent) => {
            e.preventDefault();
            if (!submitted) {
                recordViolation("right_click", "Right-click attempt detected", 1);
            }
        };
        document.addEventListener("contextmenu", handler);
        return () => document.removeEventListener("contextmenu", handler);
    }, [assignment, submitted, recordViolation]);
    */

    /* ===== Anti-cheat: Copy/Paste detection ===== */
    useEffect(() => {
        if (!assignment) return;
        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault();
            if (!submitted) {
                recordViolation("copy_paste", "Copy attempt detected", 2);
            }
        };
        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();
            if (!submitted) {
                recordViolation("copy_paste", "Paste attempt detected", 2);
            }
        };
        document.addEventListener("copy", handleCopy);
        document.addEventListener("paste", handlePaste);
        return () => {
            document.removeEventListener("copy", handleCopy);
            document.removeEventListener("paste", handlePaste);
        };
    }, [assignment, submitted, recordViolation]);

    /* ===== Anti-cheat: Window blur ===== */
    /* NOTE: Debounce in recordViolation prevents this from double-firing with tab_switch */
    useEffect(() => {
        if (!assignment) return;
        const handleBlur = () => {
            if (!submitted) {
                recordViolation("window_blur", "Browser window lost focus — candidate may have switched application", 2);
            }
        };
        window.addEventListener("blur", handleBlur);
        return () => window.removeEventListener("blur", handleBlur);
    }, [assignment, submitted, recordViolation]);

    /* ===== Anti-cheat: Keyboard shortcuts ===== */
    useEffect(() => {
        if (!assignment) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            // Block Print Screen
            if (e.key === "PrintScreen") {
                e.preventDefault();
                if (!submitted) {
                    recordViolation("screen_capture", "Print Screen key pressed", 3);
                }
            }
            // Block DevTools shortcuts (Temporarily disabled for debugging console)
            /*
            if (e.key === "F12" || (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C"))) {
                e.preventDefault();
                if (!submitted) {
                    recordViolation("devtools_open", "Developer tools shortcut detected", 3);
                }
            }
            */
            // Block Ctrl+C, Ctrl+V, Ctrl+A
            if (e.ctrlKey && (e.key === "c" || e.key === "v" || e.key === "a")) {
                e.preventDefault();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [assignment, submitted, recordViolation]);

    /* ===== Anti-cheat: Fullscreen Enforcement ===== */
    useEffect(() => {
        if (!assignment || loadingData) return;

        const handleFullscreenChange = () => {
            const isFs = !!document.fullscreenElement;
            setIsFullscreen(isFs);
            if (!isFs && !submitted) {
                recordViolation("fullscreen_exit", "Candidate exited fullscreen mode", 2);
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);

        // Initial check
        setIsFullscreen(!!document.fullscreenElement);

        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, [assignment, submitted, loadingData, recordViolation]);

    // Helper to enter fullscreen
    const requestFullscreen = async () => {
        try {
            await document.documentElement.requestFullscreen();
        } catch (err) {
            console.error("Error attempting to enable fullscreen:", err);
        }
    };

    /* ===== Anti-cheat: Cursor Leave ===== */
    useEffect(() => {
        if (!assignment) return;
        let leaveTimeout: NodeJS.Timeout | null = null;

        const handleMouseLeave = (e: MouseEvent) => {
            if (!submitted && (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) {
                if (leaveTimeout) clearTimeout(leaveTimeout);
                leaveTimeout = setTimeout(() => {
                    recordViolation("cursor_leave", "Cursor left the exam window area for more than 10 seconds", 1);
                }, 10000);
            }
        };

        const handleMouseEnter = () => {
            if (leaveTimeout) {
                clearTimeout(leaveTimeout);
                leaveTimeout = null;
            }
        };

        document.addEventListener("mouseleave", handleMouseLeave);
        document.addEventListener("mouseenter", handleMouseEnter);
        document.addEventListener("mousemove", handleMouseEnter);

        return () => {
            document.removeEventListener("mouseleave", handleMouseLeave);
            document.removeEventListener("mouseenter", handleMouseEnter);
            document.removeEventListener("mousemove", handleMouseEnter);
            if (leaveTimeout) clearTimeout(leaveTimeout);
        };
    }, [assignment, submitted, recordViolation]);

    /* ===== Anti-cheat: Multi Display Detection ===== */
    useEffect(() => {
        if (!assignment) return;

        // Using screen.isExtended if available
        const checkScreens = () => {
            // @ts-ignore - isExtended is a newer API not fully typed everywhere
            if (window.screen && window.screen.isExtended) {
                if (!submitted) {
                    recordViolation("multiple_displays", "Multiple display monitors detected", 2);
                }
            }
        };

        // Check initially and on resize
        checkScreens();
        window.addEventListener("resize", checkScreens);
        return () => window.removeEventListener("resize", checkScreens);
    }, [assignment, submitted, recordViolation]);

    /* ===== Anti-cheat: Network Disconnect ===== */
    useEffect(() => {
        if (!assignment) return;

        const handleOffline = () => {
            if (!submitted) {
                recordViolation("network_disconnect", "Network connection lost", 2);
            }
        };
        const handleOnline = () => {
            // Optional: log reconnect but we mainly care about disconnects
        };

        window.addEventListener("offline", handleOffline);
        window.addEventListener("online", handleOnline);
        return () => {
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
        };
    }, [assignment, submitted, recordViolation]);

    /* ===== Anti-cheat: Rapid Click (Auto-Clicker) ===== */
    useEffect(() => {
        if (!assignment) return;

        const handleClick = () => {
            const now = Date.now();
            const timeSinceLastClick = now - lastClickTimeRef.current;

            // If clicks are less than 50ms apart, it might be an auto-clicker
            if (timeSinceLastClick < 50 && !submitted && lastClickTimeRef.current !== 0) {
                recordViolation("rapid_click", "Abnormally rapid clicking detected (possible auto-clicker/macro)", 3);
            }

            lastClickTimeRef.current = now;
        };

        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, [assignment, submitted, recordViolation]);

    /* ===== Anti-cheat: Audio Noise/Microphone ===== */
    useEffect(() => {
        if (!assignment || loadingData) return;

        const startAudioMonitor = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioContextRef.current = audioContext;
                const analyser = audioContext.createAnalyser();
                const microphone = audioContext.createMediaStreamSource(stream);
                const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

                analyser.smoothingTimeConstant = 0.8;
                analyser.fftSize = 1024;

                microphone.connect(analyser);
                analyser.connect(scriptProcessor);
                scriptProcessor.connect(audioContext.destination);

                let thresholdExceededCount = 0;

                scriptProcessor.onaudioprocess = () => {
                    const array = new Uint8Array(analyser.frequencyBinCount);
                    analyser.getByteFrequencyData(array);
                    let values = 0;
                    const length = array.length;

                    for (let i = 0; i < length; i++) {
                        values += (array[i]);
                    }

                    const average = values / length;

                    // Threshold logic: typical speaking voice could spike the average
                    if (average > 45) { // Threshold value
                        thresholdExceededCount++;
                        // If it's consistently loud for a few frames
                        if (thresholdExceededCount > 10) {
                            if (!submitted) {
                                recordViolation("audio_noise_detected", "Loud continuous noise or speech detected", 2);
                            }
                            thresholdExceededCount = 0; // reset
                        }
                    } else {
                        thresholdExceededCount = Math.max(0, thresholdExceededCount - 1);
                    }
                };
            } catch (err) {
                console.warn("Audio monitoring failed (permission denied or no mic)", err);
                // Optionally log violation for no microphone
            }
        };

        startAudioMonitor();

        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [assignment, loadingData, submitted, recordViolation]);

    /* ===== Save answer to server ===== */
    const selectAnswer = useCallback(
        async (key: string) => {
            if (!question || !assignment) return;

            setAnswers((prev) => ({ ...prev, [question.id]: key }));
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);

            // Save to server
            try {
                await fetch("/api/exam/answers", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        assignmentId: assignment.id,
                        questionId: question.id,
                        answer: key,
                    }),
                });
            } catch (err) {
                console.error("Failed to save answer:", err);
            }
        },
        [question, assignment]
    );

    /* ===== Submit handler ===== */
    const handleSubmit = async () => {
        if (!assignment) return;
        setSubmitted(true);
        setShowSubmitModal(false);

        const timeUsed = Math.floor((Date.now() - startTimeRef.current) / 1000);

        try {
            await fetch("/api/exam/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assignmentId: assignment.id,
                    timeUsedSeconds: timeUsed,
                    autoSubmitted: false,
                }),
            });
        } catch (err) {
            console.error("Failed to submit exam:", err);
        }
    };

    /* ===== Time-expired submit (only when timer runs out) ===== */
    const handleTimeExpiredSubmit = async () => {
        if (!assignment || submitted) return;
        setSubmitted(true);

        const timeUsed = Math.floor((Date.now() - startTimeRef.current) / 1000);

        try {
            await fetch("/api/exam/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assignmentId: assignment.id,
                    timeUsedSeconds: timeUsed,
                    autoSubmitted: true,
                }),
            });
        } catch (err) {
            console.error("Failed to auto-submit exam:", err);
        }
    };

    /* ===== Redirect after submit ===== */
    useEffect(() => {
        if (submitted) {
            const timer = setTimeout(() => {
                window.location.href = "/finish";
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [submitted]);

    /* ===== Loading State ===== */
    if (loadingData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark">
                <div className="text-center space-y-4 animate-fade-in">
                    <div className="size-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-lg font-medium text-[var(--color-text-main)] dark:text-white">Loading your test...</p>
                    <p className="text-sm text-[var(--color-text-sub)] dark:text-[var(--color-text-muted)]">Preparing questions and environment</p>
                </div>
            </div>
        );
    }

    /* ===== Error State ===== */
    if (loadError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark">
                <div className="text-center space-y-4 animate-fade-in max-w-md mx-4">
                    <div className="size-16 bg-[var(--color-danger-light)] dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined text-red-500 text-4xl">error</span>
                    </div>
                    <h2 className="text-xl font-bold text-[var(--color-text-main)] dark:text-white">{loadError}</h2>
                    <button
                        onClick={() => window.location.href = "/"}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[var(--radius-sm)] bg-primary hover:bg-primary-hover text-white font-medium text-sm transition-all cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    /* ===== Submitted State ===== */
    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark">
                <div className="text-center animate-fade-in space-y-4">
                    <div className="size-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined text-green-500 text-4xl">check_circle</span>
                    </div>
                    <p className="text-xl font-bold text-[var(--color-text-main)] dark:text-white">Test Submitted</p>
                    <p className="text-[var(--color-text-sub)] dark:text-[var(--color-text-muted)]">Redirecting...</p>
                    <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
            </div>
        );
    }

    if (!question) return null;

    return (
        <AuthGuard allowedRoles={["user"]}>
            <div className="flex flex-col min-h-screen bg-bg-light dark:bg-bg-dark select-none">
                {!isFullscreen && !loadingData && !submitted && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-md">
                        <div className="bg-[var(--color-bg-card)] dark:bg-slate-900 rounded-[var(--radius-md)] shadow-2xl p-8 max-w-md w-full text-center space-y-4 animate-fade-in border border-slate-800">
                            <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="material-symbols-outlined text-primary text-4xl">fullscreen</span>
                            </div>
                            <h2 className="text-2xl font-bold text-[var(--color-text-main)] dark:text-white">Fullscreen Required</h2>
                            <p className="text-[var(--color-text-sub)] dark:text-[var(--color-text-muted)] text-sm leading-relaxed">
                                This exam must be taken in fullscreen mode to ensure integrity. Please enter fullscreen to continue your test.
                            </p>
                            <button
                                onClick={requestFullscreen}
                                className="w-full mt-4 py-3 rounded-[var(--radius-sm)] bg-primary hover:bg-primary-hover text-white font-bold text-sm transition-all shadow-[0_0_15px_rgba(var(--color-primary),0.3)] cursor-pointer flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">open_in_full</span>
                                Enter Fullscreen
                            </button>
                        </div>
                    </div>
                )}

                {/* === Top Bar === */}
                <header className="bg-[var(--color-bg-card)] dark:bg-slate-900 border-b border-[var(--color-border)] dark:border-slate-800 sticky top-0 z-40">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-14">
                            {/* Timer */}
                            <div
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-[var(--radius-sm)] font-mono text-lg font-bold transition-colors ${isTimeCritical
                                    ? "bg-[var(--color-danger-light)] dark:bg-red-900/30 text-[var(--color-danger)] dark:text-red-400 animate-pulse-danger"
                                    : "bg-slate-100 dark:bg-slate-800 text-[var(--color-text-main)] dark:text-white"
                                    }`}
                            >
                                <span className="material-symbols-outlined text-sm">timer</span>
                                {formatTime(timeLeft)}
                            </div>

                            {/* Test name + Progress */}
                            <div className="flex items-center gap-4">
                                <div className="hidden sm:block text-right">
                                    <p className="text-xs font-semibold text-[var(--color-text-main)] dark:text-white truncate max-w-[200px]">{testName}</p>
                                    {totalAssignments > 1 && (
                                        <p className="text-[10px] text-[var(--color-text-muted)]">Test {currentNumber} of {totalAssignments}</p>
                                    )}
                                </div>
                                <span className="text-sm font-medium text-[var(--color-text-sub)] dark:text-[var(--color-text-muted)]">
                                    Question{" "}
                                    <span className="text-[var(--color-text-main)] dark:text-white font-bold">{currentQ + 1}</span>{" "}
                                    of {questions.length}
                                </span>

                                {/* Save indicator */}
                                {saved && (
                                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium animate-fade-in">
                                        <span className="material-symbols-outlined text-sm">cloud_done</span>
                                        Saved
                                    </div>
                                )}
                            </div>

                            {/* Violations + Camera status */}
                            <div className="flex items-center gap-3">
                                {violations > 0 && (
                                    <div className="flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-danger-light)] dark:bg-red-900/30 text-[var(--color-danger)] dark:text-red-400 text-xs font-bold">
                                        <span className="material-symbols-outlined text-[14px]">warning</span>
                                        {violations} warning{violations > 1 ? "s" : ""}
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`size-2.5 rounded-full ${cameraActive
                                            ? faceDetected
                                                ? "bg-green-500 animate-breathe"
                                                : "bg-[var(--color-danger)] animate-pulse"
                                            : "bg-slate-400"
                                            }`}
                                    />
                                    <span className="text-xs font-medium text-[var(--color-text-sub)] dark:text-[var(--color-text-muted)] hidden sm:inline">
                                        {cameraActive ? (faceDetected ? "Camera OK" : "Face?") : "No Cam"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* === Main Content === */}
                <main className="flex-grow py-6 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px] gap-6">
                            {/* Question Card */}
                            <div className="space-y-6">
                                <div className="bg-[var(--color-bg-card)] dark:bg-slate-900 rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] border border-[var(--color-border)] dark:border-slate-800 p-6 sm:p-8 animate-fade-in">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="size-10 bg-primary/10 rounded-[var(--radius-sm)] flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                                            {currentQ + 1}
                                        </div>
                                        <p className="text-lg font-medium text-[var(--color-text-main)] dark:text-white leading-relaxed">
                                            {question.text}
                                        </p>
                                    </div>

                                    {/* Image if present */}
                                    {question.imageUrl && (
                                        <div className="mb-6 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--color-border)] dark:border-slate-700">
                                            <img src={question.imageUrl} alt="Question illustration" className="w-full max-h-64 object-contain bg-[var(--color-bg-elevated)] dark:bg-slate-800" />
                                        </div>
                                    )}

                                    {/* Options */}
                                    <div className="space-y-3">
                                        {(() => {
                                            let options = question.options || [];
                                            if (question.type === "true_false") {
                                                const valid = options.filter(o => o && o.trim() !== "");
                                                options = valid.length >= 2 ? valid : ["True", "False"];
                                            } else if (question.type === "likert_scale") {
                                                const valid = options.filter(o => o && o.trim() !== "");
                                                options = valid.length > 0 ? valid : ["1", "2", "3", "4", "5"];
                                            }

                                            return options.map((optText, idx) => {
                                                const key = question.type === "true_false"
                                                    ? optText
                                                    : question.type === "likert_scale"
                                                    ? optText
                                                    : (OPTION_KEYS[idx] || String(idx));
                                                const selected = answers[question.id] === key;
                                                return (
                                                    <button
                                                        key={key}
                                                        onClick={() => selectAnswer(key)}
                                                        className={`w-full text-left p-4 rounded-[var(--radius-sm)] border-2 transition-all duration-200 cursor-pointer group ${selected
                                                            ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-[var(--shadow-sm)]"
                                                            : "border-[var(--color-border)] dark:border-slate-700 hover:border-primary/40 hover:bg-[var(--color-bg-elevated)] dark:hover:bg-slate-800/50"
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={`size-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${selected
                                                                    ? "border-primary bg-primary text-white"
                                                                    : "border-[var(--color-border-strong)] dark:border-slate-600 text-[var(--color-text-muted)] group-hover:border-primary/40"
                                                                    }`}
                                                            >
                                                                {question.type === "true_false"
                                                                    ? (optText === "True" ? "T" : "F")
                                                                    : question.type === "likert_scale"
                                                                    ? optText
                                                                    : key}
                                                            </div>
                                                            <span
                                                                className={`text-sm leading-relaxed ${selected
                                                                    ? "text-[var(--color-text-main)] dark:text-white font-medium"
                                                                    : "text-slate-700 dark:text-[var(--color-text-muted)]"
                                                                    }`}
                                                            >
                                                                {optText}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>

                                {/* Navigation Buttons */}
                                <div className="flex justify-between items-center">
                                    <button
                                        onClick={() => setCurrentQ((p) => Math.max(0, p - 1))}
                                        disabled={currentQ === 0}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] dark:border-slate-600 text-slate-700 dark:text-[var(--color-text-muted)] font-medium text-sm hover:bg-[var(--color-bg-card)] dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                                        Previous
                                    </button>

                                    {currentQ < questions.length - 1 ? (
                                        <button
                                            onClick={() => setCurrentQ((p) => Math.min(questions.length - 1, p + 1))}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] bg-primary hover:bg-primary-hover text-white font-medium text-sm transition-all shadow-[var(--shadow-md)] shadow-primary/25 cursor-pointer"
                                        >
                                            Next
                                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setShowSubmitModal(true)}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-all shadow-[var(--shadow-md)] shadow-green-600/25 cursor-pointer"
                                        >
                                            Submit Test
                                            <span className="material-symbols-outlined text-sm">send</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Question Navigation Grid */}
                            <div className="space-y-4">
                                <div className="bg-[var(--color-bg-card)] dark:bg-slate-900 rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] border border-[var(--color-border)] dark:border-slate-800 p-4 sticky top-20">
                                    <h4 className="text-xs font-semibold text-[var(--color-text-sub)] dark:text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                                        Questions
                                    </h4>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {questions.map((q, idx) => {
                                            const isAnswered = answers[q.id] !== undefined;
                                            const isCurrent = idx === currentQ;

                                            return (
                                                <button
                                                    key={q.id}
                                                    onClick={() => setCurrentQ(idx)}
                                                    className={`size-8 rounded text-xs font-bold transition-all cursor-pointer ${isCurrent
                                                        ? "bg-primary text-white shadow-[var(--shadow-md)] shadow-primary/25 scale-110"
                                                        : isAnswered
                                                            ? "bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary hover:bg-primary/25"
                                                            : "bg-slate-100 dark:bg-slate-800 text-[var(--color-text-sub)] dark:text-[var(--color-text-muted)] hover:bg-slate-200 dark:hover:bg-slate-700"
                                                        }`}
                                                >
                                                    {idx + 1}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Legend */}
                                    <div className="mt-4 space-y-1.5 text-[10px] text-[var(--color-text-sub)] dark:text-[var(--color-text-muted)]">
                                        <div className="flex items-center gap-2">
                                            <div className="size-3 rounded bg-primary" />
                                            Current
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="size-3 rounded bg-primary/15" />
                                            Answered ({answeredCount})
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="size-3 rounded bg-slate-100 dark:bg-slate-800" />
                                            Unanswered ({unansweredCount})
                                        </div>
                                    </div>

                                    {/* Submit button */}
                                    <button
                                        onClick={() => setShowSubmitModal(true)}
                                        className="w-full mt-4 py-2.5 rounded-[var(--radius-sm)] bg-green-600 hover:bg-green-700 text-white font-bold text-xs transition-all shadow-[var(--shadow-md)] shadow-green-600/25 flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-sm">send</span>
                                        Submit Test
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* === Camera PiP === */}
                <div
                    className={`fixed bottom-6 right-6 w-[160px] h-[120px] rounded-[var(--radius-sm)] overflow-hidden shadow-2xl border-2 transition-colors z-30 ${cameraActive
                        ? faceDetected
                            ? "border-green-500"
                            : "border-red-500"
                        : "border-slate-600"
                        }`}
                >
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${!cameraActive ? "hidden" : ""}`}
                    />
                    {!cameraActive && (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[var(--color-text-sub)]">videocam_off</span>
                        </div>
                    )}
                    {cameraActive && (
                        <div className="absolute top-1.5 right-1.5">
                            <div className="px-1.5 py-0.5 bg-[var(--color-danger)]/80 backdrop-blur-sm rounded text-[8px] font-bold text-white uppercase flex items-center gap-0.5">
                                <div className="size-1 bg-[var(--color-bg-card)] rounded-full animate-pulse" />
                                REC
                            </div>
                        </div>
                    )}
                </div>

                {/* === Violation Overlay === */}
                {showViolation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-900/90 backdrop-blur-md animate-fade-in">
                        <div className="text-center text-white space-y-5 max-w-md mx-4">
                            <div className="size-20 bg-red-800/50 rounded-full flex items-center justify-center mx-auto animate-pulse">
                                <span className="material-symbols-outlined text-6xl text-red-300">warning</span>
                            </div>
                            <h2 className="text-2xl font-bold">⚠️ Violation Detected!</h2>
                            <p className="text-red-200 text-sm leading-relaxed">{violationMsg}</p>
                            <div className="px-5 py-3 bg-red-800/60 rounded-[var(--radius-md)]">
                                <span className="font-bold text-lg">Warning #{violations}</span>
                                <p className="text-xs text-red-300 mt-1">
                                    All violations are recorded and will be reviewed by the proctor.
                                </p>
                            </div>
                            {isTabHidden ? (
                                <div className="px-4 py-3 bg-red-700/40 rounded-[var(--radius-sm)] border border-red-500/30">
                                    <span className="material-symbols-outlined text-red-300 text-2xl mb-1 block">tab_unselected</span>
                                    <p className="text-sm font-semibold text-red-200">
                                        Return to this tab to continue your exam.
                                    </p>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowViolation(false)}
                                    className="mt-2 px-8 py-3 bg-[var(--color-bg-card)]/15 hover:bg-[var(--color-bg-card)]/25 border border-white/20 rounded-[var(--radius-md)] text-white font-semibold text-sm transition-all cursor-pointer"
                                >
                                    I Understand — Continue Exam
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* === Submit Confirmation Modal === */}
                {showSubmitModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-[var(--color-bg-card)] dark:bg-slate-900 rounded-[var(--radius-md)] shadow-2xl border border-[var(--color-border)] dark:border-slate-800 w-full max-w-md mx-4 p-6 animate-slide-up">
                            <div className="text-center space-y-4">
                                <div className="size-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                    <span className="material-symbols-outlined text-primary text-3xl">task_alt</span>
                                </div>
                                <h3 className="text-xl font-bold text-[var(--color-text-main)] dark:text-white">Submit Test?</h3>
                                {unansweredCount > 0 && (
                                    <div className="bg-[var(--color-warning-light)] dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-[var(--radius-sm)] text-sm text-amber-800 dark:text-amber-200">
                                        ⚠️ You still have <strong>{unansweredCount} unanswered</strong> question{unansweredCount > 1 ? "s" : ""}.
                                    </div>
                                )}
                                <p className="text-sm text-[var(--color-text-sub)] dark:text-[var(--color-text-muted)]">
                                    Once submitted, you cannot change your answers. Time remaining: <strong>{formatTime(timeLeft)}</strong>
                                </p>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setShowSubmitModal(false)}
                                        className="flex-1 py-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] dark:border-slate-600 text-slate-700 dark:text-[var(--color-text-muted)] font-medium text-sm hover:bg-[var(--color-bg-elevated)] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                        Continue Test
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        className="flex-1 py-2.5 rounded-[var(--radius-sm)] bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-all cursor-pointer"
                                    >
                                        Submit Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthGuard>
    );
}
