"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface MenuPermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  pdf: boolean;
  export: boolean;
}

interface UseMenuPermissionResult {
  permission: MenuPermission | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * RBAC hook
 * - Reads permission from DB (menu_access)
 * - Safe against permission revocation
 * - Can be revalidated before any action
 */
export const useMenuPermission = (
  pageName: string,
  roleId?: number
): UseMenuPermissionResult => {
  const [permission, setPermission] = useState<MenuPermission | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPermission = async () => {
    if (!roleId) {
      setPermission(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    /*
      SELECT ma.*
      FROM module_menu mm
      JOIN menu_access ma ON ma.menu_id = mm.id
      WHERE mm.page_name = ?
        AND ma.role_id = ?
    */

    const { data, error } = await supabase
      .from("module_menu")
      .select(
        `
        id,
        menu_access (
          view,
          create,
          edit,
          delete,
          pdf,
          export,
          role_id
        )
      `
      )
      .eq("page_name", pageName)
      .eq("menu_access.role_id", roleId)
      .limit(1)
      .maybeSingle();

    if (
      error ||
      !data ||
      !data.menu_access ||
      data.menu_access.length === 0
    ) {
      setPermission(null);
    } else {
      const ma = data.menu_access[0];

      setPermission({
        view: Boolean(ma.view),
        create: Boolean(ma.create),
        edit: Boolean(ma.edit),
        delete: Boolean(ma.delete),
        pdf: Boolean(ma.pdf),
        export: Boolean(ma.export),
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageName, roleId]);

  return {
    permission,
    loading,
    refresh: fetchPermission, // 🔐 critical for re-check before actions
  };
};
