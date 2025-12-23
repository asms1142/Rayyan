"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PermissionAction = "view" | "create" | "edit" | "delete" | "pdf" | "export";

interface Permissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  pdf: boolean;
  export: boolean;
}

export function usePermission(menuName: string) {
  const [permissions, setPermissions] = useState<Permissions>({
    view: false,
    create: false,
    edit: false,
    delete: false,
    pdf: false,
    export: false,
  });
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean>(false);

  useEffect(() => {
    const fetchPermissions = async () => {
      setLoading(true);

      // 1️⃣ Get session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      // 2️⃣ Get user role
      const { data: user } = await supabase
        .from("userinfo")
        .select("role_id")
        .eq("auth_uid", session.user.id)
        .single();

      if (!user?.role_id) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      // 3️⃣ Get menu ID
      const { data: menu } = await supabase
        .from("module_menu")
        .select("id")
        .eq("page_name", menuName)
        .single();

      if (!menu?.id) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      // 4️⃣ Get permissions
      const { data: access } = await supabase
        .from("menu_access")
        .select("view, create, edit, delete, pdf, export")
        .eq("menu_id", menu.id)
        .eq("role_id", user.role_id)
        .maybeSingle();

      const perms: Permissions = {
        view: !!access?.view,
        create: !!access?.create,
        edit: !!access?.edit,
        delete: !!access?.delete,
        pdf: !!access?.pdf,
        export: !!access?.export,
      };

      setPermissions(perms);
      setAuthorized(perms.view);
      setLoading(false);
    };

    fetchPermissions();
  }, [menuName]);

  // Optional: live check function
  const can = async (action: PermissionAction) => permissions[action];

  return { permissions, authorized, loading, can };
}
