"use client";

import AuthGuard from "../components/AuthGuard";

/**
 * AdminGuard — wraps admin pages.
 * Only admin and proctor can access admin pages.
 */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard allowedRoles={["admin", "proctor", "superadmin"]}>
            {children}
        </AuthGuard>
    );
}
