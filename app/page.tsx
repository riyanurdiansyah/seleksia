"use client";

import { useState, useEffect } from "react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const candidateId = sessionStorage.getItem("candidateId");
    const role = sessionStorage.getItem("candidateRole");

    if (candidateId) {
      if (role === "user") {
        window.location.href = "/system-check";
      } else {
        window.location.href = "/dashboard";
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed. Please try again.");
        setLoading(false);
        return;
      }

      // Store candidate info in sessionStorage for exam flow
      if (data.candidate) {
        sessionStorage.setItem("candidateId", data.candidate.id);
        sessionStorage.setItem("candidateName", data.candidate.name);
        sessionStorage.setItem("candidateDisplayId", data.candidate.displayId);
        sessionStorage.setItem("candidateRole", data.candidate.role);
      }

      // Redirect based on role
      setTimeout(() => {
        window.location.href = data.redirectTo || "/system-check";
      }, 800);
    } catch {
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-[var(--color-bg-base)] transition-colors duration-300">
      {/* Left Panel — Illustration / Branding (BarengWarga Split Panel Style) */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-[#1A3C40] via-[#0c5c64] to-[#059669] relative overflow-hidden flex-col justify-between p-16">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        {/* Premium blur circles */}
        <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-white opacity-10 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-0 -right-32 w-[450px] h-[450px] bg-[var(--color-accent)] opacity-10 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[280px] h-[280px] bg-[var(--color-primary)] opacity-10 rounded-full blur-[80px] pointer-events-none" />

        {/* Header Branding */}
        <div className="relative z-10 flex items-center">
          <img src="/full-logo.png" alt="SELEKSIA Logo" className="h-16 w-[220px] object-contain brightness-0 invert" style={{ filter: "brightness(0) invert(1)" }} />
        </div>

        {/* Hero Content Block */}
        <div className="relative z-10 max-w-xl my-auto space-y-8">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 px-4 py-2 rounded-full text-xs font-bold border border-white/20 backdrop-blur-sm">
            <span className="material-symbols-outlined text-xs text-[var(--color-primary)]">star</span>
            <span>Platform Asesmen Psikologi #1</span>
          </div>

          <h2 className="text-5xl font-extrabold leading-[1.15] text-white tracking-tight">
            Satu Platform,<br />
            <span className="bg-gradient-to-r from-primary-mid to-white bg-clip-text text-transparent">Seluruh Evaluasi</span><br />
            Terhubung.
          </h2>

          <p className="text-white/80 text-base leading-relaxed max-w-lg">
            Kelola administrasi kandidat, pelaksanaan ujian online berbasis CBT, pengawasan webcam anti-kecurangan, hingga penerbitan laporan otomatis secara cerdas dan aman.
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3 pt-4">
            {[
              { label: "Peserta Aktif", value: "10.000+", icon: "groups" },
              { label: "Paket Tes", value: "50+", icon: "assignment" },
              { label: "Keamanan", value: "99.9%", icon: "verified_user" },
              { label: "Monitoring", value: "Real-time", icon: "visibility" }
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-1.5 hover:translate-y-[-4px] transition-transform duration-300 hover:border-[var(--color-primary)]/50 hover:bg-white/10"
              >
                <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-lg">
                    {stat.icon}
                  </span>
                </div>
                <div className="text-sm font-extrabold text-white tracking-tight">{stat.value}</div>
                <div className="text-[9px] uppercase tracking-wider text-white/60 font-semibold text-center leading-tight">{stat.label}</div>
              </div>
            ))}
          </div>

         
        </div>

        {/* Footer info inside branding */}
        <div className="relative z-10 text-xs text-white/50">
          © {new Date().getFullYear()} SELEKSIA. All rights reserved.
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[var(--color-bg-base)] transition-colors duration-300">
        <div className="w-full max-w-md space-y-8 animate-slide-in-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-6">
            <img src="/full-logo.png" alt="SELEKSIA Logo" className="h-16 w-[220px] object-contain dark:brightness-0 dark:invert" />
          </div>

          <div className="bg-[var(--color-bg-card)] p-8 rounded-3xl border border-[var(--color-border)] shadow-[var(--shadow-card)] space-y-6 relative overflow-hidden">
            {/* Shimmer top-line */}
            <div className="card-shimmer" />
            <div className="text-center lg:text-left space-y-1.5">
              <h1 className="text-2xl font-extrabold text-[var(--color-text-main)] tracking-tight">
                Selamat Datang Kembali
              </h1>
              <p className="text-[var(--color-text-sub)] text-sm">
                Masukkan kredensial Anda untuk mengakses portal ujian.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-[var(--color-danger-light)] border border-[var(--color-danger)]/30 rounded-[var(--radius-sm)] animate-slide-in-up shadow-[var(--shadow-sm)]">
                <span className="material-symbols-outlined text-[var(--color-danger)] text-xl flex-shrink-0 mt-0.5">error</span>
                <p className="text-sm text-[var(--color-danger)] font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Username */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                  Email atau ID Peserta
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--color-text-muted)] text-xl z-10 transition-colors duration-200 group-focus-within:text-[var(--color-primary)]">
                    person
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(""); }}
                    placeholder="Masukkan email atau nomor ID"
                    className="w-full pl-11 pr-4 py-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text-main)] text-sm placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-light)] focus:bg-[var(--color-bg-card)] focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] focus:translate-y-[-1px] transition-all duration-300"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                    Kata Sandi
                  </label>
                </div>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--color-text-muted)] text-xl z-10 transition-colors duration-200 group-focus-within:text-[var(--color-primary)]">
                    lock
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="Masukkan kata sandi"
                    className="w-full pl-11 pr-12 py-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text-main)] text-sm placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-light)] focus:bg-[var(--color-bg-card)] focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] focus:translate-y-[-1px] transition-all duration-300"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="group w-full py-3.5 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold text-sm rounded-[var(--radius-sm)] shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] active:translate-y-0 transition-all duration-200 btn-shine btn-press relative overflow-hidden flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
              >
                {/* Shine sweep */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700 skew-x-[-15deg] pointer-events-none" />
                {loading ? (
                  <>
                    <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>

              <div className="text-center text-xs text-[var(--color-text-sub)] mt-4">
                Belum punya akun?{" "}
                <a href="/register" className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-bold transition-all">
                  Daftar & Berlangganan
                </a>
              </div>
 
               {/* Security footer */}
               <div className="flex items-center justify-center gap-2 text-[10px] text-[var(--color-text-muted)] mt-4">
                 <span className="material-symbols-outlined text-xs">lock</span>
                 <span>SSL 256-bit Encrypted</span>
               </div>
             </form>

            {/* Footer links inside form card */}
            <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] pt-4 border-t border-[var(--color-border)]">
              <a href="#" className="hover:text-[var(--color-primary)] transition-colors font-medium">
                Kebijakan Privasi
              </a>
              <a href="#" className="hover:text-[var(--color-primary)] transition-colors font-medium">
                Dukungan Teknis
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
