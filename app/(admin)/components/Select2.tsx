"use client";

import React, { useState, useEffect, useRef } from "react";

interface Option {
    value: string;
    label: string;
}

interface Select2Props {
    value: string;
    onChange: (val: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export default function Select2({
    value,
    onChange,
    options,
    placeholder = "Select...",
    className = "",
    disabled = false
}: Select2Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Selected option label
    const selectedOption = options.find(opt => opt.value === value);

    // Filter options based on search
    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const handleToggle = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
        setSearch("");
    };

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearch("");
    };

    return (
        <div ref={containerRef} className={`relative select-none ${className}`}>
            {/* Trigger Button */}
            <div
                onClick={handleToggle}
                className={`w-full min-h-10 px-4 py-2 flex items-center justify-between rounded-[var(--radius-sm)] border text-sm font-semibold transition-all duration-200 cursor-pointer shadow-sm
                    ${disabled 
                        ? "bg-gray-100 dark:bg-gray-800 text-[var(--color-text-muted)] border-[var(--color-border)] cursor-not-allowed opacity-60" 
                        : "bg-[var(--color-bg-card)] text-[var(--color-text-main)] border-[var(--color-border)] hover:border-primary/50"
                    }
                    ${isOpen ? "border-primary ring-1 ring-primary" : ""}
                `}
            >
                <span className={!selectedOption ? "text-[var(--color-text-muted)] font-normal" : ""}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span className={`material-symbols-outlined text-[18px] text-[var(--color-text-muted)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                    keyboard_arrow_down
                </span>
            </div>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute z-[999] left-0 right-0 mt-1.5 bg-[var(--color-bg-card)] border border-[var(--color-border-strong)] rounded-[var(--radius-sm)] shadow-xl overflow-hidden animate-fade-in flex flex-col max-h-[300px]">
                    {/* Search Input */}
                    <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-[var(--color-text-muted)]">
                            search
                        </span>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari..."
                            className="w-full bg-[var(--color-bg-card)] border-none text-xs text-[var(--color-text-main)] focus:outline-none placeholder-[var(--color-text-muted)]"
                        />
                    </div>

                    {/* Options List */}
                    <div className="overflow-y-auto flex-1 py-1 max-h-[220px]">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-[var(--color-text-muted)] text-center">
                                Tidak ada data
                            </div>
                        ) : (
                            filteredOptions.map((opt) => {
                                const isSelected = opt.value === value;
                                return (
                                    <div
                                        key={opt.value}
                                        onClick={() => handleSelect(opt.value)}
                                        className={`px-4 py-2.5 text-xs font-semibold cursor-pointer transition-all flex items-center justify-between
                                            ${isSelected 
                                                ? "bg-[var(--color-primary-light)] text-primary" 
                                                : "text-[var(--color-text-sub)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-main)]"
                                            }
                                        `}
                                    >
                                        <span>{opt.label}</span>
                                        {isSelected && (
                                            <span className="material-symbols-outlined text-[16px] text-primary">
                                                check
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
