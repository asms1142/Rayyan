"use client";

import { useEffect, useState, Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

/* ================= TYPES ================= */
interface MenuItem {
  id: number;
  menu_name: string;
  page_name: string;
  module_id: number;
  visibility: boolean;
  sort_index: number | null;
}

interface ModuleItem {
  module_id: number;
  name: string;
  menus: MenuItem[];
}

export interface SidebarProps {
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
}

/* ================= COMPONENT ================= */
export default function Sidebar({
  collapsed,
  setCollapsed,
}: SidebarProps) {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [openModule, setOpenModule] = useState<number | null>(null);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState("Company");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const pathname = usePathname();

  /* ================= AUTH ================= */
  useEffect(() => {
    const fetchUserInfo = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoggedIn(false);
        return;
      }

      setIsLoggedIn(true);

      const { data: userData, error } = await supabase
        .from("userinfo")
        .select("role_id, comp_id")
        .eq("auth_uid", user.id)
        .single();

      if (error || !userData) {
        console.error("User info error:", error?.message);
        return;
      }

      setRoleId(userData.role_id);

      const { data: compData } = await supabase
        .from("company")
        .select("compname")
        .eq("comp_id", userData.comp_id)
        .single();

      setCompanyName(compData?.compname ?? "Company");
    };

    fetchUserInfo();
  }, []);

  /* ================= LOAD SIDEBAR ================= */
  useEffect(() => {
    if (!roleId) return;

    const loadSidebar = async () => {
      try {
        const { data: modulesData } = await supabase
          .from("module")
          .select("*")
          .order("sort_index", { ascending: true });

        const { data: menusData } = await supabase
          .from("module_menu")
          .select("*")
          .eq("visibility", true)
          .order("sort_index", { ascending: true });

        const { data: accessData } = await supabase
          .from("menu_access")
          .select("*")
          .eq("role_id", roleId);

        const finalModules: ModuleItem[] =
          modulesData
            ?.map((mod) => {
              const allowedMenus =
                menusData
                  ?.filter((menu) => menu.module_id === mod.module_id)
                  .filter((menu) =>
                    accessData?.some(
                      (a) =>
                        a.menu_id === menu.id &&
                        a.module_id === mod.module_id &&
                        a.view === true
                    )
                  ) ?? [];

              return { ...mod, menus: allowedMenus };
            })
            .filter((mod) => mod.menus.length > 0) ?? [];

        setModules(finalModules);
      } catch (err) {
        console.error("Sidebar load error:", err);
        setModules([]);
      }
    };

    loadSidebar();
  }, [roleId]);

  /* ================= HELPERS ================= */
  const buildHref = (pageName: string) =>
    pageName.startsWith("/") ? pageName : `/protected/${pageName}`;

  const isActiveMenu = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const handleMenuClick = () => {
    if (mobileOpen) setMobileOpen(false);
  };

  if (!isLoggedIn) return null;

  /* ================= SIDEBAR CONTENT ================= */
  const SidebarContent = (
    <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
      {modules.map((mod) => (
        <div key={mod.module_id}>
          <button
            onClick={() =>
              setOpenModule(openModule === mod.module_id ? null : mod.module_id)
            }
            className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-gray-100"
          >
            <span className={collapsed ? "hidden" : "block"}>
              {mod.name}
            </span>
            <ChevronDown size={16} />
          </button>

          {openModule === mod.module_id && !collapsed && (
            <div className="ml-4 space-y-1">
              {mod.menus.map((menu) => {
                const href = buildHref(menu.page_name);
                return (
                  <Link
                    key={menu.id}
                    href={href}
                    onClick={handleMenuClick}
                    className={`block px-3 py-1 rounded text-sm hover:bg-gray-100 ${
                      isActiveMenu(href)
                        ? "bg-gray-200 font-semibold"
                        : ""
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
  );

  /* ================= UI ================= */
  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r bg-white transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        } h-full`}
      >
        <div className="flex items-center justify-between p-3 border-b">
          {!collapsed && (
            <span className="font-bold truncate">{companyName}</span>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setCollapsed((v) => !v)}
          >
            <Menu size={18} />
          </Button>
        </div>
        {SidebarContent}
      </aside>

      {/* Mobile Hamburger */}
      <div className="fixed top-[60px] left-2 z-50 md:hidden">
        <Button size="icon" variant="ghost" onClick={() => setMobileOpen(true)}>
          <Menu size={24} />
        </Button>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r z-50 transform transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-3 border-b">
          <span className="font-bold">{companyName}</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setMobileOpen(false)}
          >
            ✕
          </Button>
        </div>
        {SidebarContent}
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
