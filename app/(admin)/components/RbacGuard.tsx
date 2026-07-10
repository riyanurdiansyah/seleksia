"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function RbacGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

    useEffect(() => {
        const checkAccess = async () => {
            const role = localStorage.getItem("candidateRole") || "admin";
            try {
                const res = await fetch(`/api/rbac/check?role=${role}&path=${encodeURIComponent(pathname)}`);
                if (res.ok) {
                    const data = await res.json();
                    setIsAllowed(data.allowed);
                } else {
                    setIsAllowed(false);
                }
            } catch (err) {
                console.error("Failed to check RBAC:", err);
                setIsAllowed(false);
            }
        };

        checkAccess();
    }, [pathname]);

    if (isAllowed === null) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAllowed) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
                <div className="w-24 h-24 mb-6 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-5xl text-red-500">
                        block
                    </span>
                </div>
                <h1 className="text-3xl font-black text-[var(--color-text-main)] mb-3">
                    403 - Akses Ditolak
                </h1>
                <p className="text-[var(--color-text-sub)] max-w-md mb-8">
                    Maaf, Anda tidak memiliki izin untuk mengakses halaman ini. Jika Anda merasa ini adalah sebuah kesalahan, silakan hubungi Administrator.
                </p>
                <Link 
                    href="/dashboard"
                    className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition-all hover:scale-105 active:scale-95"
                >
                    Kembali ke Dashboard
                </Link>
            </div>
        );
    }

    return <>{children}</>;
}
