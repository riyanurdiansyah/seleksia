"use client";

import React, { useState, useMemo } from "react";

export interface ColumnDef<T> {
    header: string;
    accessorKey?: Extract<keyof T, string>;
    cell?: (row: T) => React.ReactNode;
    filterable?: boolean;
    sortable?: boolean;
    className?: string; // Custom header class
}

interface DataTableProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    globalSearchPlaceholder?: string;
    itemsPerPageOptions?: number[];
    defaultItemsPerPage?: number;
    emptyMessage?: string;
}

export default function DataTable<T>({
    data,
    columns,
    globalSearchPlaceholder = "Search...",
    itemsPerPageOptions = [10, 20, 50, 100],
    defaultItemsPerPage = 10,
    emptyMessage = "No records found.",
}: DataTableProps<T>) {
    const [globalSearch, setGlobalSearch] = useState("");
    const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);

    // Dynamic Search & Sort
    const filteredData = useMemo(() => {
        let result = data;

        // Global Search
        if (globalSearch) {
            const lowerGlobal = globalSearch.toLowerCase();
            result = result.filter((row) => {
                return columns.some((col) => {
                    if (col.accessorKey) {
                        const val = row[col.accessorKey];
                        return String(val || "").toLowerCase().includes(lowerGlobal);
                    }
                    return false;
                });
            });
        }

        // Column Specific Search
        Object.entries(columnSearch).forEach(([key, value]) => {
            if (value) {
                const lowerValue = value.toLowerCase();
                result = result.filter((row) => {
                    const cellValue = row[key as keyof T];
                    return String(cellValue || "").toLowerCase().includes(lowerValue);
                });
            }
        });

        // Sorting
        if (sortConfig) {
            result = [...result].sort((a, b) => {
                const aVal = a[sortConfig.key as keyof T];
                const bVal = b[sortConfig.key as keyof T];

                if (aVal === bVal) return 0;

                const aString = String(aVal || "");
                const bString = String(bVal || "");

                if (sortConfig.direction === "asc") {
                    return aString.localeCompare(bString, undefined, { numeric: true });
                } else {
                    return bString.localeCompare(aString, undefined, { numeric: true });
                }
            });
        }

        return result;
    }, [data, columns, globalSearch, columnSearch, sortConfig]);

    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(start, start + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    // Handlers
    const handleSort = (key: string) => {
        if (sortConfig && sortConfig.key === key) {
            if (sortConfig.direction === "asc") {
                setSortConfig({ key, direction: "desc" });
            } else {
                setSortConfig(null);
            }
        } else {
            setSortConfig({ key, direction: "asc" });
        }
    };

    const handleColumnSearchChange = (key: string, value: string) => {
        setColumnSearch((prev) => ({ ...prev, [key]: value }));
        setCurrentPage(1); // Reset to first page
    };

    return (
        <div className="flex flex-col h-full bg-transparent">


            {/* Table Container */}
            <div className="overflow-x-auto flex-1 bg-white rounded-t-md">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#E6F4EA] text-[#1B835E] uppercase tracking-wide border-b-2 border-[#1B835E]">
                        <tr>
                            {columns.map((col, idx) => (
                                <th key={idx} className={`px-4 py-3 align-top border-r border-white/50 last:border-r-0 ${col.className || ""}`}>
                                    <div className="flex flex-col gap-1.5">
                                        <div
                                            className={`flex items-center justify-between gap-1 ${col.sortable ? "cursor-pointer select-none" : ""}`}
                                            onClick={() => col.sortable && col.accessorKey && handleSort(col.accessorKey)}
                                        >
                                            <span className="text-[10px] font-bold">{col.header}</span>
                                            {col.sortable && col.accessorKey && (
                                                <div className="flex flex-col ml-1 items-center justify-center space-y-[2px]">
                                                    <svg width="8" height="5" viewBox="0 0 8 5" fill="none" xmlns="http://www.w3.org/2000/svg" className={sortConfig?.key === col.accessorKey && sortConfig.direction === "asc" ? "text-[#1B835E]" : "text-[#1B835E]/30"}>
                                                        <path d="M4 0L8 5H0L4 0Z" fill="currentColor"/>
                                                    </svg>
                                                    <svg width="8" height="5" viewBox="0 0 8 5" fill="none" xmlns="http://www.w3.org/2000/svg" className={sortConfig?.key === col.accessorKey && sortConfig.direction === "desc" ? "text-[#1B835E]" : "text-[#1B835E]/30"}>
                                                        <path d="M4 5L8 0H0L4 5Z" fill="currentColor"/>
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        {col.filterable && col.accessorKey && (
                                            <div className="relative mt-1">
                                                <input
                                                    type="text"
                                                    value={columnSearch[col.accessorKey] || ""}
                                                    onChange={(e) => handleColumnSearchChange(col.accessorKey!, e.target.value)}
                                                    placeholder={`Search ${col.header.split(' ')[0]}...`}
                                                    className="w-full h-7 px-3 rounded-sm bg-white border border-transparent text-[10px] text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#33997A] focus:ring-1 focus:ring-[#33997A] transition-all font-normal normal-case shadow-sm"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center border-b border-gray-200 border-dashed">
                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                        <span className="material-symbols-outlined text-5xl mb-3 opacity-40">
                                            search_off
                                        </span>
                                        <p className="text-base font-medium text-gray-500">{emptyMessage}</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, rowIndex) => (
                                <tr
                                    key={rowIndex}
                                    className="border-b border-gray-200 border-dashed hover:bg-gray-50 transition-colors text-gray-800"
                                >
                                    {columns.map((col, colIndex) => (
                                        <td key={colIndex} className={`px-4 py-3 border-r border-gray-200 border-dashed last:border-r-0 text-xs ${col.className || ""}`}>
                                            {col.cell ? col.cell(row) : col.accessorKey ? (row[col.accessorKey] as React.ReactNode) : null}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="pt-3 pb-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 bg-transparent">
                <div>
                    {filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="size-7 rounded flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-500"
                    >
                        <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum = currentPage;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`size-7 rounded flex items-center justify-center font-medium transition-all ${
                                        currentPage === pageNum
                                            ? "bg-[#33997A] text-white"
                                            : "bg-transparent text-gray-600 hover:bg-gray-100"
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="size-7 rounded flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-500"
                    >
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
