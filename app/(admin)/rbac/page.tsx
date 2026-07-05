"use client";

import { useState, useEffect } from "react";
import Breadcrumb from "../components/Breadcrumb";

interface Menu {
    id: string;
    name: string;
    path: string | null;
    submenus?: Menu[];
}

interface RoleMatrix {
    [role: string]: {
        [menuId: string]: { r: boolean; c: boolean; u: boolean; d: boolean };
    };
}

export default function RBACPage() {
    const [menus, setMenus] = useState<Menu[]>([]);
    const [roles, setRoles] = useState<string[]>([]);
    const [matrix, setMatrix] = useState<RoleMatrix>({});
    const [selectedRole, setSelectedRole] = useState<string>("admin");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        const fetchRBAC = async () => {
            try {
                const res = await fetch("/api/rbac");
                if (res.ok) {
                    const data = await res.json();
                    setMenus(data.menus || []);
                    setRoles(data.roles || []);
                    setMatrix(data.roleAccess || {});
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchRBAC();
    }, []);

    const handleCheckboxChange = (menuId: string, perm: 'r' | 'c' | 'u' | 'd', checked: boolean) => {
        setMatrix(prev => {
            const newMatrix = { ...prev };
            if (!newMatrix[selectedRole]) newMatrix[selectedRole] = {};
            if (!newMatrix[selectedRole][menuId]) newMatrix[selectedRole][menuId] = { r: false, c: false, u: false, d: false };
            
            newMatrix[selectedRole][menuId][perm] = checked;

            // If a child is checked, ensure parent can Read
            // Since this is a simple implementation, we'll let the user manage parent explicitly.
            return newMatrix;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage("");
        try {
            const res = await fetch("/api/rbac", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ matrix })
            });

            if (res.ok) {
                setMessage("Hak akses berhasil disimpan.");
                setTimeout(() => setMessage(""), 3000);
            } else {
                setMessage("Gagal menyimpan hak akses.");
            }
        } catch (error) {
            console.error(error);
            setMessage("Terjadi kesalahan.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <Breadcrumb
                items={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Manajemen Akses" }
                ]}
            />

            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-[var(--color-text-main)]">Manajemen Akses (RBAC)</h1>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <span className="material-symbols-outlined text-[20px]">save</span>
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-lg ${message.includes('berhasil') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message}
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex">
                <div className="w-1/4 bg-gray-50 border-r border-gray-200 p-4">
                    <h3 className="font-bold text-gray-700 mb-4 uppercase text-sm tracking-wider">Pilih Role</h3>
                    <div className="space-y-2">
                        {roles.map(role => (
                            <button
                                key={role}
                                onClick={() => setSelectedRole(role)}
                                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${selectedRole === role ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                            >
                                <span className="capitalize">{role}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-3/4 p-6">
                    <h3 className="font-bold text-gray-800 text-lg mb-6 flex items-center gap-2">
                        Hak Akses untuk Role: <span className="text-primary capitalize">{selectedRole}</span>
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-gray-200">
                                    <th className="py-3 px-4 text-sm font-bold text-gray-600">Menu</th>
                                    <th className="py-3 px-4 text-center text-sm font-bold text-gray-600">Read</th>
                                    <th className="py-3 px-4 text-center text-sm font-bold text-gray-600">Create</th>
                                    <th className="py-3 px-4 text-center text-sm font-bold text-gray-600">Update</th>
                                    <th className="py-3 px-4 text-center text-sm font-bold text-gray-600">Delete</th>
                                </tr>
                            </thead>
                            <tbody>
                                {menus.map(menu => (
                                    <MenuRow 
                                        key={menu.id} 
                                        menu={menu} 
                                        selectedRole={selectedRole} 
                                        matrix={matrix} 
                                        onChange={handleCheckboxChange} 
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MenuRow({ menu, selectedRole, matrix, onChange, depth = 0 }: { menu: Menu, selectedRole: string, matrix: RoleMatrix, onChange: any, depth?: number }) {
    const roleAccess = matrix[selectedRole]?.[menu.id] || { r: false, c: false, u: false, d: false };

    return (
        <>
            <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                <td className="py-3 px-4">
                    <div className="flex items-center" style={{ paddingLeft: `${depth * 1.5}rem` }}>
                        {depth > 0 && <span className="text-gray-300 mr-2">└</span>}
                        <span className={`text-sm ${depth === 0 ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{menu.name}</span>
                    </div>
                </td>
                <td className="py-3 px-4 text-center">
                    <input type="checkbox" className="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer" checked={roleAccess.r} onChange={(e) => onChange(menu.id, 'r', e.target.checked)} />
                </td>
                <td className="py-3 px-4 text-center">
                    <input type="checkbox" className="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer" checked={roleAccess.c} onChange={(e) => onChange(menu.id, 'c', e.target.checked)} />
                </td>
                <td className="py-3 px-4 text-center">
                    <input type="checkbox" className="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer" checked={roleAccess.u} onChange={(e) => onChange(menu.id, 'u', e.target.checked)} />
                </td>
                <td className="py-3 px-4 text-center">
                    <input type="checkbox" className="w-4 h-4 text-red-500 rounded focus:ring-red-500 cursor-pointer" checked={roleAccess.d} onChange={(e) => onChange(menu.id, 'd', e.target.checked)} />
                </td>
            </tr>
            {menu.submenus && menu.submenus.length > 0 && menu.submenus.map(sub => (
                <MenuRow key={sub.id} menu={sub} selectedRole={selectedRole} matrix={matrix} onChange={onChange} depth={depth + 1} />
            ))}
        </>
    );
}
