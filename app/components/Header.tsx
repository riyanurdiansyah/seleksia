"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header() {
  // State variables for user info
  const [userName, setUserName] = useState("User");
  const [userId, setUserId] = useState("---");
  const [userRole, setUserRole] = useState("candidate");

  // Load session data on mount
  useEffect(() => {
    // Read from localStorage if available (browser environment)
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("candidateName");
      const storedId = localStorage.getItem("candidateDisplayId");
      const storedRole = localStorage.getItem("candidateRole");

      if (storedName) setUserName(storedName);
      if (storedId) setUserId(storedId);
      if (storedRole) setUserRole(storedRole);

      // For superadmin, show "Superadmin" as name and use companyId from cookie as ID
      if (storedRole === "superadmin") {
        setUserName("Superadmin");
        const match = document.cookie.match(/companyId=([^;]+)/);
        if (match) setUserId(match[1]);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Determine label based on role
  const idLabel = userRole === "superadmin" ? "ID Perusahaan" : "ID Kandidat";

  return (
    <header className="bg-[rgba(255,255,255,0.7)] backdrop-blur-[12px] border-b border-[var(--color-border)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <img src="/full-logo.png" alt="SELEKSIA Logo" className="h-9 w-auto object-contain animate-float group-hover:scale-105 transition-all dark:brightness-0 dark:invert" />
          </Link>

          {/* User Profile */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium text-[var(--color-text-main)]">{userName}</span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {idLabel}: {userId}{userRole !== "candidate" && userRole !== "superadmin" ? ` (${userRole})` : ""}
              </span>
            </div>
            <div className="w-[34px] h-[34px] bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center font-bold text-sm text-white shadow-[var(--shadow-sm)] hover:scale-105 hover:shadow-[0_4px_12px_var(--color-primary-glow)] transition-all">
              {userName.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center h-9 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-main)] transition-all text-sm font-medium cursor-pointer btn-press"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
