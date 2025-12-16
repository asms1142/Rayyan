"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface MenuPermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export const useMenuPermission = (
  pageName: string,
  roleId?: number
) => {
  const [permission, setPermission] = useState<MenuPermission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleId) {
      setLoading(false);
      return;
    }

    const fetchPermission = async () => {
      /*
        SELECT ma.*
        FROM module_menu mm
        JOIN menu_access ma ON ma.menu_id = mm.id
        WHERE mm.page_name = 'terms-conditions'
          AND ma.role_id = ?
      */

      const { data, error } = await supabase
        .from("module_menu")
        .select(`
          id,
          menu_access!inner (
            view,
            create,
            edit,
            delete,
            role_id
          )
        `)
        .eq("page_name", pageName)
        .eq("menu_access.role_id", roleId)
        .single();

      if (error || !data) {
        setPermission(null);
      } else {
        const ma = data.menu_access[0];
        setPermission({
          view: ma.view,
          create: ma.create,
          edit: ma.edit,
          delete: ma.delete,
        });
      }

      setLoading(false);
    };

    fetchPermission();
  }, [pageName, roleId]);

  return { permission, loading };
};
