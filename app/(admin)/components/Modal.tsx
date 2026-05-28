"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-in-up">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-bg-card)] z-10">
          {title && <h3 className="text-lg font-bold text-[var(--color-text-main)]">{title}</h3>}
          <button
            onClick={onClose}
            className="size-8 rounded-full hover:bg-[var(--color-bg-hover)] flex items-center justify-center text-[var(--color-text-muted)] transition-colors"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
