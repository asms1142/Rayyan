"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

interface MenuItem {
  id: number;
  menu_name: string;
  page_name: string;
  module_id: number;
}

interface ModuleItem {
  module_id: number;
  name: string;
  menus: MenuItem[];
}

export default function Sidebar({
  collapsed,
  setCollapsed,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [openModule, setOpenModule] = useState<number | null>(null);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState<string>("Company");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const pathname = usePathname();

  // ---------------------------
  // Auth + User info
  // ---------------------------
  useEffect(() => {
    const fetchUserInfo = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);

      const { data: userData, error: userError } = await supabase
        .from("userinfo")
        .select("role_id, comp_id")
        .eq("auth_uid", user.id)
        .single();

      if (userError || !userData) {
        console.error("Error fetching user info:", userError?.message);
        setLoading(false);
        return;
      }

      setRoleId(userData.role_id);

      const { data: compData } = await supabase
        .from("company")
        .select("compname")
        .eq("comp_id", userData.comp_id)
        .single();

      setCompanyName(compData?.compname || "Company");
    };

    fetchUserInfo();
  }, []);

  // ---------------------------
  // Sidebar menu load with RBAC
  // ---------------------------
  useEffect(() => {
    if (!roleId) return;

    const fetchModulesWithAccess = async () => {
      setLoading(true);
      try {
        // 1️⃣ Fetch modules
        const { data: modulesData } = await supabase
          .from("module")
          .select("*")
          .order("sort_index", { ascending: true });

        if (!modulesData) {
          setModules([]);
          setLoading(false);
          return;
        }

        // 2️⃣ Fetch menus
        const { data: menusData } = await supabase
          .from("module_menu")
          .select("*");

        // 3️⃣ Fetch menu_access for current role
        const { data: accessData } = await supabase
          .from("menu_access")
          .select("*")
          .eq("role_id", roleId);

        // 4️⃣ Filter menus based on view access
        const modulesWithMenus = modulesData.map((mod) => {
          const modMenus = menusData
            .filter((menu: any) => menu.module_id === mod.module_id)
            .filter((menu: any) => {
              const access = accessData?.find(
                (a: any) => a.menu_id === menu.id && a.module_id === mod.module_id
              );
              return access?.view; // show only if view=true
            });
          return { ...mod, menus: modMenus };
        });

        // 5️⃣ Keep only modules that have at least one menu
        const filteredModules = modulesWithMenus.filter((mod) => mod.menus.length > 0);

        setModules(filteredModules);
      } catch (err) {
        console.error("Error loading sidebar:", err);
        setModules([]);
      } finally {
        setLoading(false);
      }
    };

    fetchModulesWithAccess();
  }, [roleId]);

  // ---------------------------
  // Helpers
  // ---------------------------
  const buildHref = (pageName: string) => {
    return pageName.startsWith("/")
      ? pageName
      : `/protected/${pageName}`;
  };

  const isActiveMenu = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  if (!isLoggedIn) return null;

  // ---------------------------
  // Sidebar UI
  // ---------------------------
  const SidebarContent = (
    <aside
      className={`border-r bg-white flex flex-col transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      } h-full`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        {!collapsed && <span className="font-bold">{companyName}</span>}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu size={18} />
        </Button>
      </div>

      {/* Modules */}
      <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
        {modules.map((mod) => (
          <div key={mod.module_id}>
            <button
              onClick={() =>
                setOpenModule(openModule === mod.module_id ? null : mod.module_id)
              }
              className={`w-full flex items-center justify-between px-3 py-2 rounded hover:bg-gray-100 ${
                collapsed ? "justify-center" : ""
              }`}
            >
              {!collapsed && <span>{mod.name}</span>}
              {!collapsed && <ChevronDown size={16} />}
            </button>

            {!collapsed && openModule === mod.module_id && (
              <div className="ml-4 space-y-1">
                {mod.menus.map((menu) => {
                  const href = buildHref(menu.page_name);

                  return (
                    <Link
                      key={menu.id}
                      href={href}
                      className={`block px-3 py-1 rounded text-sm hover:bg-gray-100 ${
                        isActiveMenu(href) ? "bg-gray-200 font-semibold" : ""
                      }`}
                    >
                      {menu.menu_name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );

  if (loading) {
    return (
      <aside
        className={`border-r bg-white transition-all duration-200 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="p-4 text-center text-gray-500">
          Loading sidebar...
        </div>
      </aside>
    );
  }

  // ---------------------------
  // Responsive render
  // ---------------------------
  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">{SidebarContent}</div>

      {/* Mobile sidebar overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 md:hidden ${
          mobileOpen ? "block" : "hidden"
        }`}
        onClick={() => setMobileOpen(false)}
      />
      <div
        className={`fixed z-50 top-0 left-0 h-full border-r bg-white transition-transform md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } w-64`}
      >
        {SidebarContent}
      </div>
    </>
  );
}
