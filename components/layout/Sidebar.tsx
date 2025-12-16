"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSidebar, ModuleItem } from "@/lib/getSidebar";
import { supabase } from "@/lib/supabaseClient";

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

  const pathname = usePathname();

  // Check if user is logged in and fetch role + company info
  useEffect(() => {
    const fetchUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);

      // Get userinfo with role_id and comp_id
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

      // Get company name
      const { data: compData, error: compError } = await supabase
        .from("company")
        .select("compname")
        .eq("comp_id", userData.comp_id)
        .single();

      if (compError || !compData) {
        console.error("Error fetching company:", compError?.message);
        setCompanyName("Company");
      } else {
        setCompanyName(compData.compname);
      }
    };

    fetchUserInfo();
  }, []);

  // Fetch sidebar modules + menus based on role
  useEffect(() => {
    if (!roleId) return;

    setLoading(true);
    getSidebar(roleId)
      .then((data) => {
        setModules(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading sidebar:", err);
        setLoading(false);
      });
  }, [roleId]);

  const isActiveMenu = (page: string) => pathname === page;

  if (!isLoggedIn) return null; // Hide sidebar if not logged in

  if (loading) {
    return (
      <aside
        className={`border-r bg-white transition-all duration-200 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="p-4 text-center text-gray-500">Loading sidebar...</div>
      </aside>
    );
  }

  return (
    <aside
      className={`border-r bg-white transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Sidebar Header */}
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
      <nav className="p-2 space-y-1">
        {modules.map((mod) => (
          <div key={mod.module_id}>
            {/* Module Button */}
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

            {/* Menu Items */}
            {!collapsed && openModule === mod.module_id && (
              <div className="ml-4 space-y-1">
                {mod.menus.map((menu) => (
                  <Link
                    key={menu.id}
                    href={menu.page_name}
                    className={`block px-3 py-1 rounded text-sm hover:bg-gray-100 ${
                      isActiveMenu(menu.page_name)
                        ? "bg-gray-200 font-semibold"
                        : ""
                    }`}
                  >
                    {menu.menu_name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
