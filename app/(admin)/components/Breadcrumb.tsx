"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import React from "react";

export default function Breadcrumb() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter((s) => s !== "");

    // Format segments (e.g., "master" -> "Master")
    const formatSegment = (segment: string) => {
        if (segment.toLowerCase() === "user") return "User";
        if (segment.toLowerCase() === "roles") return "Roles";
        if (segment.toLowerCase() === "rbac") return "RBAC";
        return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    };

    return (
        <div className="inline-flex items-center gap-2 bg-[#EFF8F4] border border-[#D5EDE2] rounded-full px-[16px] py-[6px]">
            <Link href="/dashboard" className="flex items-center text-[#4FA58E] hover:text-[#3B806D] transition-colors">
                <svg className="w-[15px] h-[15px] fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
            </Link>
            
            {segments.map((segment, index) => {
                const isLast = index === segments.length - 1;
                const path = `/${segments.slice(0, index + 1).join("/")}`;

                return (
                    <React.Fragment key={path}>
                        <svg className="w-[9px] h-[9px] text-[#A5D8C3] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                        {isLast ? (
                            <span className="text-[13px] font-bold text-[#2D3748] select-none leading-none">
                                {formatSegment(segment)}
                            </span>
                        ) : (
                            <Link href={path} className="text-[13px] font-semibold text-[#4FA58E] hover:text-[#3B806D] transition-colors leading-none">
                                {formatSegment(segment)}
                            </Link>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
