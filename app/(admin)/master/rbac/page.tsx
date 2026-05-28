"use client";

import { useState, useEffect, Fragment } from "react";
import Breadcrumb from "../../components/Breadcrumb";

interface Menu {
  id: string;
  name: string;
  path: string | null;
  icon: string | null;
  parentId: string | null;
  isActive: boolean;
  submenus?: Menu[];
}

type PermTypes = "r" | "c" | "u" | "d";
type MatrixData = Record<string, Record<string, Record<PermTypes, boolean>>>;

interface RbacData {
  menus: Menu[];
  roles: string[];
  roleAccess: MatrixData;
}

export default function RBACMatrixPage() {
  const [data, setData] = useState<RbacData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // currentMatrix structure: { role: { menuId: { r: true, c: false, u: true, d: false } } }
  const [currentMatrix, setCurrentMatrix] = useState<MatrixData>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rbac");
      if (!res.ok) throw new Error("Gagal mengambil data RBAC");
      const json: RbacData = await res.json();

      // Filter out root menus (where parentId is null)
      const rootMenus = json.menus.filter((m) => !m.parentId);
      // Map submenus into their respective parents
      rootMenus.forEach((root) => {
        root.submenus = json.menus.filter((m) => m.parentId === root.id);
      });
      json.menus = rootMenus;

      setData(json);

      // Initialize the matrix with default false if not present
      const initialMatrix: MatrixData = {};
      json.roles.forEach((role) => {
        initialMatrix[role] = {};
        json.menus.forEach((menu) => {
          initialMatrix[role][menu.id] = {
            r: json.roleAccess[role]?.[menu.id]?.r || false,
            c: json.roleAccess[role]?.[menu.id]?.c || false,
            u: json.roleAccess[role]?.[menu.id]?.u || false,
            d: json.roleAccess[role]?.[menu.id]?.d || false,
          };
          // Initialize for submenus too
          if (menu.submenus) {
            menu.submenus.forEach((sub) => {
              initialMatrix[role][sub.id] = {
                r: json.roleAccess[role]?.[sub.id]?.r || false,
                c: json.roleAccess[role]?.[sub.id]?.c || false,
                u: json.roleAccess[role]?.[sub.id]?.u || false,
                d: json.roleAccess[role]?.[sub.id]?.d || false,
              };
            });
          }
        });
      });
      
      setCurrentMatrix(initialMatrix);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggle = (role: string, menuId: string, perm: PermTypes) => {
    setCurrentMatrix((prev) => {
      const currentRoleData = prev[role] || {};
      const currentMenuData = currentRoleData[menuId] || { r: false, c: false, u: false, d: false };
      
      return {
        ...prev,
        [role]: {
          ...currentRoleData,
          [menuId]: {
            ...currentMenuData,
            [perm]: !currentMenuData[perm],
          },
        },
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/rbac", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matrix: currentMatrix,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal menyimpan data akses");
      }

      setSuccessMsg("Matriks akses menu berhasil diperbarui");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-[var(--color-text-muted)] gap-4 animate-fade-in">
        <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-bold tracking-wider uppercase">Memuat Matriks Akses...</span>
      </div>
    );
  }

  const renderPermButton = (role: string, menuId: string, perm: PermTypes, label: string) => {
    const isActive = currentMatrix[role]?.[menuId]?.[perm] || false;

    // Define colors similar to BarengWarga
    const styleConfigs = {
      r: { active: "text-blue-500 bg-blue-50/50 border-blue-200", inactive: "text-gray-300 bg-gray-50 border-gray-200" },
      c: { active: "text-emerald-500 bg-emerald-50/50 border-emerald-200", inactive: "text-gray-300 bg-gray-50 border-gray-200" },
      u: { active: "text-amber-500 bg-amber-50/50 border-amber-200", inactive: "text-gray-300 bg-gray-50 border-gray-200" },
      d: { active: "text-red-500 bg-red-50/50 border-red-200", inactive: "text-gray-300 bg-gray-50 border-gray-200" },
    };

    const style = isActive ? styleConfigs[perm].active : styleConfigs[perm].inactive;

    return (
      <button
        onClick={() => handleToggle(role, menuId, perm)}
        className={`flex flex-col items-center justify-between w-[28px] h-[42px] py-1 rounded-full border-[1.5px] transition-transform duration-200 cursor-pointer hover:scale-105 active:scale-95 ${style}`}
        title={`Toggle ${label} for ${role}`}
      >
        <span className="text-[11px] font-black leading-none mt-0.5">{label}</span>
        <div className="relative flex items-center justify-center">
          <div className="absolute w-3 h-3 bg-white rounded-full"></div>
          <span className="material-symbols-outlined text-[18px] leading-none relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isActive ? "check_circle" : "cancel"}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6 animate-slide-in-up">
      {/* Page Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">
              Matriks Akses Menu
            </h1>
            <p className="text-[var(--color-text-sub)] text-sm mt-1 font-medium">
              Kelola hak akses Read, Create, Update, dan Delete untuk setiap peran secara granular.
            </p>
          </div>
          <Breadcrumb />
        </div>
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={fetchData}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] text-[13px] font-bold text-[var(--color-text-sub)] bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] transition-all cursor-pointer btn-press"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh Data
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-[var(--radius-sm)] text-[13px] font-bold text-white
              bg-gradient-to-br from-primary to-accent transition-all shadow-[0_4px_15px_var(--color-primary-glow)] 
              hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] cursor-pointer w-fit btn-press btn-shine disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">save</span>
                Simpan Perubahan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-[var(--color-success-light)] border border-[var(--color-success)]/20 rounded-[var(--radius-lg)] animate-fade-in shadow-[var(--shadow-sm)]">
          <span className="material-symbols-outlined text-[var(--color-success)] text-xl">check_circle</span>
          <p className="text-sm text-[var(--color-success)] font-semibold">{successMsg}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-[var(--color-danger-light)] border border-[var(--color-danger)]/20 rounded-[var(--radius-lg)] animate-fade-in shadow-[var(--shadow-sm)]">
          <span className="material-symbols-outlined text-[var(--color-danger)] text-xl">error</span>
          <p className="text-sm text-[var(--color-danger)] font-semibold">{error}</p>
        </div>
      )}

      {/* Main Container - The Matrix */}
      <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden relative">
        <div className="card-shimmer" />

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-[var(--color-bg-hover)] p-4 border-b border-[var(--color-border)] text-xs font-extrabold text-[var(--color-text-sub)] uppercase tracking-wider w-[250px] shadow-[4px_0_15px_rgba(0,0,0,0.02)]">
                  MODUL / MENU
                </th>
                {data?.roles.map((role) => (
                  <th key={role} className="p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-hover)] text-center">
                    <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-blue-200/50 bg-blue-50/50 text-blue-600 text-[10px] font-bold uppercase tracking-widest gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">shield_person</span>
                      {role}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-[var(--color-bg-card)] divide-y divide-[var(--color-border)]">
              {data?.menus.map((menu) => (
                <Fragment key={menu.id}>
                  {/* Parent Row */}
                  <tr className="hover:bg-[var(--color-bg-elevated)] transition-colors group">
                    <td className="sticky left-0 z-10 bg-[var(--color-bg-card)] group-hover:bg-[var(--color-bg-elevated)] p-4 border-r border-transparent shadow-[4px_0_15px_rgba(0,0,0,0.02)] transition-colors">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-[var(--color-text-main)] flex items-center gap-2">
                          {menu.icon && <span className="material-symbols-outlined text-[16px] text-[var(--color-text-muted)]">{menu.icon}</span>}
                          {menu.name}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 ml-6">{menu.path || "/"}</span>
                      </div>
                    </td>
                    {data.roles.map((role) => (
                      <td key={`${role}-${menu.id}`} className="p-3 text-center align-middle">
                        <div className="flex items-center justify-center gap-2 p-1.5 rounded-full bg-white shadow-[0_4px_15px_rgba(0,0,0,0.06)] border border-gray-100 inline-flex transition-transform hover:scale-[1.02]">
                          {renderPermButton(role, menu.id, "r", "R")}
                          {renderPermButton(role, menu.id, "c", "C")}
                          {renderPermButton(role, menu.id, "u", "U")}
                          {renderPermButton(role, menu.id, "d", "D")}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Child Rows */}
                  {menu.submenus?.map((child) => (
                    <tr key={child.id} className="hover:bg-[var(--color-bg-elevated)] transition-colors group">
                      <td className="sticky left-0 z-10 bg-[var(--color-bg-card)] group-hover:bg-[var(--color-bg-elevated)] p-3 pl-8 border-r border-transparent shadow-[4px_0_15px_rgba(0,0,0,0.02)] transition-colors relative">
                        {/* Indent line visual */}
                        <div className="absolute left-6 top-0 bottom-1/2 w-px bg-[var(--color-border-strong)]"></div>
                        <div className="absolute left-6 bottom-1/2 w-2.5 h-px bg-[var(--color-border-strong)]"></div>
                        
                        <div className="flex flex-col pl-3">
                          <span className="text-[12px] font-semibold text-[var(--color-text-sub)] flex items-center gap-2">
                            {child.name}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{child.path}</span>
                        </div>
                      </td>
                      {data.roles.map((role) => (
                        <td key={`${role}-${child.id}`} className="p-3 text-center align-middle">
                          <div className="flex items-center justify-center gap-2 p-1.5 rounded-full bg-white shadow-[0_4px_15px_rgba(0,0,0,0.06)] border border-gray-100 inline-flex opacity-90 group-hover:opacity-100 transition-all hover:scale-[1.02]">
                            {renderPermButton(role, child.id, "r", "R")}
                            {renderPermButton(role, child.id, "c", "C")}
                            {renderPermButton(role, child.id, "u", "U")}
                            {renderPermButton(role, child.id, "d", "D")}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}

              {data?.menus.length === 0 && (
                <tr>
                  <td colSpan={data.roles.length + 1} className="text-center py-10 text-[var(--color-text-muted)]">
                    Belum ada data menu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
