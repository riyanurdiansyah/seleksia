"use client";

import { useState, useEffect } from "react";

export interface RBACAccess {
  allowed: boolean;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export function useRbac(path: string) {
  const [access, setAccess] = useState<RBACAccess>({
    allowed: false,
    canRead: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      const role = localStorage.getItem("candidateRole") || "user";
      try {
        const res = await fetch(`/api/rbac/check?path=${encodeURIComponent(path)}&role=${role}`);
        if (res.ok) {
          const data = await res.json();
          setAccess(data);
        }
      } catch (error) {
        console.error("Failed to fetch RBAC data for path:", path, error);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [path]);

  return { access, loading };
}
