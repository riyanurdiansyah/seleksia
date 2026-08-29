/**
 * Indonesian Translations for Proctoring & Exam Violations
 */

export const VIOLATION_TYPE_TRANSLATIONS: Record<string, string> = {
  tab_switch: "Pindah Tab / Jendela",
  window_blur: "Kehilangan Fokus Layar",
  fullscreen_exit: "Keluar Layar Penuh",
  face_not_detected: "Wajah Tidak Terdeteksi",
  multiple_face: "Banyak Wajah Terdeteksi",
  no_camera: "Kamera Tidak Aktif",
  screen_capture: "Tangkapan Layar (Screenshot)",
  copy_paste: "Salin / Tempel Teks",
  right_click: "Percobaan Klik Kanan",
  cursor_leave: "Kursor Keluar Area Ujian",
  devtools_open: "Developer Tools Terbuka",
  multiple_displays: "Monitor Ganda (Multi-Display)",
  network_disconnect: "Koneksi Internet Terputus",
  rapid_click: "Pola Klik Cepat / Macro",
  audio_noise_detected: "Suara / Percakapan Terdeteksi",
};

export const VIOLATION_DESC_TRANSLATIONS: Record<string, string> = {
  "Camera access denied or unavailable": "Akses kamera ditolak atau tidak tersedia.",
  "No face detected in camera frame — candidate may have left": "Wajah tidak terdeteksi di kamera — kandidat kemungkinan meninggalkan layar.",
  "Multiple faces detected in camera frame — possible third-party assistance": "Terdeteksi lebih dari satu wajah di kamera — indikasi bantuan pihak ketiga.",
  "Candidate switched to another tab or minimized the browser (Alt+Tab / Cmd+Tab detected)": "Kandidat berpindah ke tab lain atau meminimalkan browser (Alt+Tab / Cmd+Tab terdeteksi).",
  "Right-click attempt detected": "Percobaan klik kanan terdeteksi.",
  "Copy attempt detected": "Percobaan menyalin teks (Copy) terdeteksi.",
  "Paste attempt detected": "Percobaan menempel teks (Paste) terdeteksi.",
  "Browser window lost focus — candidate may have switched application": "Jendela browser kehilangan fokus — kandidat kemungkinan membuka aplikasi lain.",
  "Print Screen key pressed": "Tombol Print Screen (Tangkapan Layar) ditekan.",
  "Developer tools shortcut detected": "Pintasan Developer Tools / Inspect Element terdeteksi.",
  "Candidate exited fullscreen mode": "Kandidat keluar dari mode layar penuh (Fullscreen).",
  "Cursor left the exam window area for more than 10 seconds": "Kursor meninggalkan area jendela ujian lebih dari 10 detik.",
  "Multiple display monitors detected": "Terdeteksi penggunaan lebih dari satu layar monitor.",
  "Network connection lost": "Koneksi internet terputus.",
  "Abnormally rapid clicking detected (possible auto-clicker/macro)": "Pola klik sangat cepat yang tidak wajar terdeteksi (indikasi auto-clicker/makro).",
  "Loud continuous noise or speech detected": "Terdeteksi suara bising atau percakapan terus-menerus di mikrofon.",
};

export function formatViolationType(type: string): string {
  if (!type) return "Pelanggaran Ujian";
  const cleanType = type.toLowerCase().trim();
  if (VIOLATION_TYPE_TRANSLATIONS[cleanType]) {
    return VIOLATION_TYPE_TRANSLATIONS[cleanType];
  }
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatViolationDescription(desc?: string | null, type?: string): string {
  if (!desc) {
    if (type && VIOLATION_TYPE_TRANSLATIONS[type.toLowerCase().trim()]) {
      return `Aktivitas tidak wajar terdeteksi: ${VIOLATION_TYPE_TRANSLATIONS[type.toLowerCase().trim()]}.`;
    }
    return "Anomali perilaku ujian tertangkap oleh sensor proctoring.";
  }

  const trimmed = desc.trim();
  if (VIOLATION_DESC_TRANSLATIONS[trimmed]) {
    return VIOLATION_DESC_TRANSLATIONS[trimmed];
  }

  const d = desc.toLowerCase();
  if (d.includes("camera access denied") || d.includes("no camera")) return "Akses kamera ditolak atau tidak tersedia.";
  if (d.includes("no face detected") || d.includes("may have left")) return "Wajah tidak terdeteksi di kamera — kandidat kemungkinan meninggalkan layar.";
  if (d.includes("multiple face") || d.includes("third-party assistance")) return "Terdeteksi lebih dari satu wajah di kamera — indikasi bantuan pihak ketiga.";
  if (d.includes("switched to another tab") || d.includes("tab_switch") || d.includes("alt+tab") || d.includes("cmd+tab")) return "Kandidat berpindah ke tab lain atau meminimalkan browser (Alt+Tab / Cmd+Tab terdeteksi).";
  if (d.includes("right-click")) return "Percobaan klik kanan terdeteksi.";
  if (d.includes("copy attempt")) return "Percobaan menyalin teks (Copy) terdeteksi.";
  if (d.includes("paste attempt")) return "Percobaan menempel teks (Paste) terdeteksi.";
  if (d.includes("window lost focus") || d.includes("switched application")) return "Jendela browser kehilangan fokus — kandidat kemungkinan membuka aplikasi lain.";
  if (d.includes("print screen") || d.includes("screenshot")) return "Tombol Print Screen (Tangkapan Layar) ditekan.";
  if (d.includes("developer tools") || d.includes("devtools")) return "Pintasan Developer Tools / Inspect Element terdeteksi.";
  if (d.includes("fullscreen") || d.includes("exited fullscreen")) return "Kandidat keluar dari mode layar penuh (Fullscreen).";
  if (d.includes("cursor left") || d.includes("10 seconds")) return "Kursor meninggalkan area jendela ujian lebih dari 10 detik.";
  if (d.includes("multiple display") || d.includes("monitors detected")) return "Terdeteksi penggunaan lebih dari satu layar monitor.";
  if (d.includes("network connection lost") || d.includes("offline")) return "Koneksi internet terputus.";
  if (d.includes("rapid click") || d.includes("auto-clicker")) return "Pola klik sangat cepat yang tidak wajar terdeteksi (indikasi auto-clicker/makro).";
  if (d.includes("loud continuous noise") || d.includes("speech detected") || d.includes("audio")) return "Terdeteksi suara bising atau percakapan terus-menerus di mikrofon.";
  if (d.includes("anomalous behavior caught")) return "Aktivitas mencurigakan terekam oleh sistem pengawasan proctoring.";

  return desc;
}
