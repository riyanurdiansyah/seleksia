"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning";
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = "Delete",
    cancelLabel = "Cancel",
    variant = "danger",
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);

    // Close on Escape key
    useEffect(() => {
        if (!open) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [open, onCancel]);

    // Focus trap
    useEffect(() => {
        if (open && dialogRef.current) {
            dialogRef.current.focus();
        }
    }, [open]);

    if (!open) return null;

    const iconColor = variant === "danger"
        ? "bg-[var(--color-danger-light)] text-danger"
        : "bg-[var(--color-warning-light)] text-warning";

    const confirmBtnColor = variant === "danger"
        ? "bg-gradient-to-br from-danger to-[#e05a4e] shadow-[0_4px_15px_var(--color-danger-glow)]"
        : "bg-gradient-to-br from-warning to-[#e0a030] shadow-[0_4px_15px_rgba(234,179,8,0.3)]";

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[8px] flex items-center justify-center z-[9999] p-5">
            <div className="absolute inset-0" onClick={onCancel} />
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="relative bg-[var(--color-bg-card)] w-full max-w-[400px] rounded-3xl overflow-hidden border border-[var(--color-border-strong)] shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-slide-in-up outline-none"
            >
                <div className="p-8 pt-8 text-center">
                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto mb-5 ${iconColor}`}>
                        <span className="material-symbols-outlined text-[28px]">
                            {variant === "danger" ? "delete_forever" : "warning"}
                        </span>
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-[800] text-[var(--color-text-main)] mb-3 tracking-[-0.5px]">{title}</h3>
                    <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{message}</p>
                </div>

                {/* Actions */}
                <div className="p-4 px-6 bg-[var(--color-bg-elevated)] flex gap-3">
                    {cancelLabel && (
                        <button
                            onClick={onCancel}
                            className="flex-1 h-12 rounded-[var(--radius-sm)] bg-transparent border-none text-[var(--color-text-muted)] font-semibold text-sm hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-main)] transition-all btn-press"
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className={`flex-1 h-12 rounded-[var(--radius-sm)] text-white font-bold text-sm transition-all hover:translate-y-[-1px] active:translate-y-0 btn-press ${confirmBtnColor}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
