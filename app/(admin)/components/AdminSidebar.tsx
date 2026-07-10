"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface SubMenuItem {
    id: string;
    name: string;
    path: string | null;
    icon: string | null;
}

interface MenuItem {
    id: string;
    name: string;
    path: string | null;
    icon: string | null;
    submenus?: SubMenuItem[];
}

export default function AdminSidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [menus, setMenus] = useState<MenuItem[]>([]);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    useEffect(() => {
        const fetchMenus = async () => {
            const role = localStorage.getItem("candidateRole") || "admin";
            try {
                const res = await fetch(`/api/menus/sidebar?role=${role}`);
                if (res.ok) {
                    const data = await res.json();
                    setMenus(data);
                }
            } catch (err) {
                console.error("Failed to fetch sidebar menus", err);
            }
        };
        fetchMenus();
    }, []);

    // Expand the menu that contains the active submenu path on load/navigation
    useEffect(() => {
        if (menus.length > 0 && pathname) {
            const activeMenu = menus.find(item => 
                item.submenus && item.submenus.some(sub => sub.path && pathname.startsWith(sub.path))
            );
            if (activeMenu) {
                setOpenMenuId(activeMenu.id);
            }
        }
    }, [pathname, menus]);

    const toggleSubmenu = (id: string) => {
        if (isCollapsed) setIsCollapsed(false);
        setOpenMenuId((prev) => (prev === id ? null : id));
    };

    const renderMenu = (item: MenuItem) => {
        const hasSubmenus = item.submenus && item.submenus.length > 0;
        
        // Determine if this menu or any of its submenus are active
        const isSelfActive = item.path && item.path !== "/admin" && item.path !== "/" 
            ? pathname.startsWith(item.path) 
            : (item.path === "/admin" || item.path === "/") && (pathname === "/admin" || pathname === "/");
            
        const isChildActive = hasSubmenus && item.submenus!.some(sub => sub.path && pathname.startsWith(sub.path));
        const isActive = isSelfActive || isChildActive;
        const isOpen = openMenuId === item.id;

        const content = (
            <div className={`flex items-center justify-between relative rounded-[var(--radius-sm)] transition-all duration-200 group
                ${isCollapsed ? "px-0 justify-center h-11 w-11 mx-auto" : "px-3.5 py-2.5"}
                ${isActive
                    ? (isCollapsed 
                        ? "" 
                        : "bg-[var(--color-primary-light)] text-primary border border-[var(--color-border-accent)] shadow-[0_4px_12px_rgba(0,0,0,0.05)]")
                    : (isCollapsed 
                        ? "" 
                        : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-main)] hover:translate-x-1")
                }`}
            >
                {/* Active left bar indicator */}
                {(isActive && !isCollapsed) && (
                    <span className="absolute left-0 top-[15%] h-[70%] w-1 bg-primary rounded-r-full shadow-[0_0_15px_var(--color-primary-glow)]" />
                )}

                <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3 w-full"}`}>
                    <span 
                        style={{
                            maskImage: "url('/dashboard.png')",
                            WebkitMaskImage: "url('/dashboard.png')",
                            maskSize: "contain",
                            WebkitMaskSize: "contain",
                            maskRepeat: "no-repeat",
                            WebkitMaskRepeat: "no-repeat",
                            maskPosition: "center",
                            WebkitMaskPosition: "center",
                        }}
                        className={`w-5 h-5 flex-shrink-0 transition-all duration-200
                            ${isActive 
                                ? "bg-primary drop-shadow-[0_0_8px_var(--color-primary-glow)]" 
                                : "bg-[var(--color-text-muted)] group-hover:bg-primary group-hover/menu-item:bg-primary group-hover:scale-105"
                            }`} 
                    />
                    {!isCollapsed && (
                        <span className={`text-[13px] tracking-wide transition-colors font-medium flex-1 truncate
                            ${isActive ? "text-primary font-semibold" : "text-[var(--color-text-muted)] group-hover:text-[var(--color-text-main)]"}`}>
                            {item.name}
                        </span>
                    )}
                    {(!isCollapsed && hasSubmenus) && (
                        <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                            expand_more
                        </span>
                    )}
                </div>
            </div>
        );

        return (
            <div key={item.id} className="relative group/menu-item">
                {hasSubmenus ? (
                    <button onClick={() => toggleSubmenu(item.id)} className="w-full text-left">
                        {content}
                    </button>
                ) : (
                    <Link href={item.path || "#"} className="block">
                        {content}
                    </Link>
                )}
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                    <div className="absolute left-[65px] top-0 ml-2 w-48 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] py-2.5 px-3.5 invisible opacity-0 translate-x-[-10px] group-hover/menu-item:visible group-hover/menu-item:opacity-100 group-hover/menu-item:translate-x-0 transition-all duration-200 z-50 pointer-events-auto">
                        {!hasSubmenus ? (
                            <Link href={item.path || "#"} className="block text-[13px] font-semibold text-[var(--color-text-main)] hover:text-primary transition-colors py-1">
                                {item.name}
                            </Link>
                        ) : (
                            <div className="space-y-1">
                                <div className="text-[11px] font-black uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)] pb-1.5 mb-1.5 opacity-80">
                                    {item.name}
                                </div>
                                <div className="space-y-1">
                                    {item.submenus!.map(sub => {
                                        const isSubActive = sub.path && pathname.startsWith(sub.path);
                                        return (
                                            <Link 
                                                key={sub.id} 
                                                href={sub.path || "#"}
                                                className={`block py-1.5 px-2 rounded-lg text-[12px] font-medium transition-all
                                                    ${isSubActive 
                                                        ? "text-primary bg-[var(--color-primary-light)] font-semibold" 
                                                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-hover)]"
                                                    }`}
                                            >
                                                {sub.name}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Submenus Render */}
                {(hasSubmenus && isOpen && !isCollapsed) && (
                    <div className="pl-9 pr-2 space-y-1 mt-1 animate-slide-in-up origin-top">
                        {item.submenus!.map(sub => {
                            const isSubActive = sub.path && pathname.startsWith(sub.path);
                            return (
                                <Link 
                                    key={sub.id} 
                                    href={sub.path || "#"}
                                    className={`flex items-center gap-2.5 py-2 px-3 rounded-md transition-colors text-[13px]
                                        ${isSubActive 
                                            ? "text-primary bg-[var(--color-primary-light)]/50 font-semibold" 
                                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-hover)]"
                                        }`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                    <span className="truncate">{sub.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <aside
            className={`${isCollapsed ? "w-[80px]" : "w-[290px]"} flex-shrink-0 flex flex-col 
                bg-[var(--color-bg-surface)] border-r border-[var(--color-border)]
                shadow-[10px_0_30px_rgba(0,0,0,0.15)] transition-all duration-300 relative z-20 h-screen`}
        >
            {/* Gradient accent line on right edge */}
            <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-primary via-accent to-transparent opacity-40 pointer-events-none" />

            {/* Toggle button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-5 top-7 z-50 w-10 h-10 rounded-xl flex items-center justify-center
                    bg-gradient-to-br from-[var(--color-bg-elevated)] to-[var(--color-bg-surface)]
                    border border-[var(--color-border)] text-[var(--color-text-muted)]
                    hover:text-primary hover:border-[var(--color-border-accent)]
                    hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:scale-105
                    shadow-[var(--shadow-sm)] transition-all cursor-pointer"
            >
                <span className="material-symbols-outlined text-[14px]">
                    {isCollapsed ? "chevron_right" : "chevron_left"}
                </span>
            </button>

            <div className={`flex flex-col h-full py-8 px-4 ${isCollapsed ? "overflow-visible" : "overflow-hidden"}`}>
                {/* Logo */}
                <div className={`flex-shrink-0 flex items-center px-3.5 pb-9
                    ${isCollapsed ? "justify-center" : ""}`}>
                    <Link href="/dashboard" className="flex items-center overflow-hidden">
                        {isCollapsed ? (
                            <div className="relative flex-shrink-0 animate-float">
                                <img src="/logo.png" alt="SELEKSIA Logo" className="w-9 h-9 object-contain brightness-0 dark:brightness-100" />
                                {/* Online dot */}
                                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 bg-emerald-400 rounded-full
                                    border-2 border-[var(--color-bg-surface)] shadow-sm" />
                            </div>
                        ) : (
                            <img src="/full-logo.png" alt="SELEKSIA Logo" className="h-16 w-[220px] object-contain dark:brightness-0 dark:invert" />
                        )}
                    </Link>
                </div>

                {/* Navigation */}
                <div className={`flex-1 space-y-6 no-scrollbar ${isCollapsed ? "overflow-visible" : "overflow-y-auto"}`}>
                    {/* Main Menu */}
                    <div className="space-y-0.5">
                        {!isCollapsed && (
                            <p className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.05em] px-3.5 mb-2 opacity-60">
                                Main Menu
                            </p>
                        )}
                        {menus.length === 0 ? (
                            <div className="px-4 py-8 text-center text-xs text-[var(--color-text-muted)]">
                                Memuat menu...
                            </div>
                        ) : (
                            <>
                                {menus.map(renderMenu)}
                               
                            </>
                        )}
                    </div>
                </div>

                {/* Bottom actions */}
                <div className={`flex-shrink-0 border-t border-[var(--color-border)] pt-3
                    ${isCollapsed ? "flex flex-col items-center gap-2" : ""}`}>
                    {isCollapsed ? (
                        <>
                            <Link href="/settings"
                                className="size-9 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--color-text-muted)]
                                    hover:bg-[var(--color-bg-hover)] hover:text-primary transition-all"
                                title="Settings"
                            >
                                <span className="material-symbols-outlined text-[18px]">settings</span>
                            </Link>
                            <button
                                onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
                                className="size-9 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--color-text-muted)]
                                    hover:bg-[var(--color-danger-light)] hover:text-danger transition-all cursor-pointer"
                                title="Logout"
                            >
                                <span className="material-symbols-outlined text-[18px]">logout</span>
                            </button>
                        </>
                    ) : (
                        <div className="space-y-0.5">
                            <Link
                                href="/settings"
                                className="flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)]
                                    hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-main)] hover:translate-x-1 transition-all"
                            >
                                <span className="material-symbols-outlined text-[18px] text-[var(--color-text-muted)]">settings</span>
                                <span className="text-[13px] font-medium">Settings</span>
                            </Link>
                            <button
                                onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
                                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)]
                                    hover:bg-[var(--color-danger-light)] hover:text-danger hover:translate-x-1 transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[18px] text-[var(--color-text-muted)]">logout</span>
                                <span className="text-[13px] font-medium">Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Promo card */}
                {/* {!isCollapsed && (
                    <div className="mt-3 flex-shrink-0">
                        <div className="rounded-[var(--radius-sm)] p-4 relative overflow-hidden"
                            style={{
                                background: "linear-gradient(135deg, rgba(5,150,105,0.06) 0%, rgba(0,123,131,0.06) 100%)",
                                border: "1.5px solid rgba(5,150,105,0.15)"
                            }}
                        >
                            <div className="absolute -top-4 -right-4 size-16 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                            <div className="relative z-10">
                                <div className="size-7 rounded-lg bg-[var(--color-primary-light)] border border-primary/20 flex items-center justify-center mb-2">
                                    <span className="material-symbols-outlined text-primary text-[14px]">laptop_mac</span>
                                </div>
                                <h4 className="text-[var(--color-text-main)] text-[11px] font-bold leading-tight">Download Client App</h4>
                                <p className="text-[var(--color-text-sub)] text-[10px] mt-0.5 leading-snug">Premium lockdown browser tool</p>
                                <button className="mt-3 w-full py-1.5 bg-gradient-to-br from-primary to-accent hover:shadow-[0_6px_25px_var(--color-primary-glow)]
                                    text-white text-[10px] font-bold rounded-lg transition-all shadow-[0_4px_15px_var(--color-primary-glow)] cursor-pointer btn-press">
                                    Download Now
                                </button>
                            </div>
                        </div>
                    </div>
                )} */}
            </div>
        </aside>
    );
}
