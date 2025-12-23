import { supabase } from "./supabaseClient";

export interface MenuItem {
  id: number;
  menu_name: string;
  page_name: string;
  sort_index: number;
}

export interface ModuleItem {
  module_id: number;
  name: string;
  sort_index: number;
  menus: MenuItem[];
}

/**
 * Fetch sidebar modules and menus for a given role
 * @param roleId number
 * @returns array of modules with nested menus
 */
export async function getSidebar(roleId: number): Promise<ModuleItem[]> {
  try {
    // 1️⃣ Get allowed module IDs for this role
    const { data: moduleAccessData, error: moduleAccessError } = await supabase
      .from("module_access")
      .select("module_id")
      .eq("role_id", roleId);

    if (moduleAccessError) {
      console.error("Module access fetch error:", moduleAccessError);
      return [];
    }

    const moduleIds = moduleAccessData?.map((m: any) => m.module_id) || [];
    if (moduleIds.length === 0) return [];

    // 2️⃣ Fetch modules
    const { data: modulesData, error: modulesError } = await supabase
      .from("module")
      .select("module_id, name, sort_index")
      .in("module_id", moduleIds)
      .order("sort_index", { ascending: true });

    if (modulesError) {
      console.error("Modules fetch error:", modulesError);
      return [];
    }

    if (!modulesData || modulesData.length === 0) return [];

    // 3️⃣ Fetch menus for these modules where visibility = true
    const { data: menusData, error: menusError } = await supabase
      .from("module_menu")
      .select("id, module_id, menu_name, page_name, sort_index, visibility")
      .in("module_id", moduleIds)
      .eq("visibility", true)
      .order("sort_index", { ascending: true });

    if (menusError) {
      console.error("Module menus fetch error:", menusError);
      return [];
    }

    // 4️⃣ Group menus under their modules
    const modulesWithMenus: ModuleItem[] = modulesData.map((mod: any) => ({
      module_id: mod.module_id,
      name: mod.name,
      sort_index: mod.sort_index,
      menus: (menusData || [])
        .filter((menu: any) => menu.module_id === mod.module_id)
        .map((menu: any) => ({
          id: menu.id,
          menu_name: menu.menu_name,
          page_name: menu.page_name,
          sort_index: menu.sort_index,
        })),
    }));

    return modulesWithMenus;
  } catch (err) {
    console.error("getSidebar unexpected error:", err);
    return [];
  }
}
