import { supabase } from "@/lib/supabaseClient";

export interface Menu {
  menu_id: number;
  name: string;
  path: string;
  sort_index: number;
}

export interface Module {
  module_id: number;
  name: string;
  group_name: string | null;
  sort_index: number;
  menu: Menu[];
}

export async function getSidebar(role_id: number): Promise<Module[]> {
  // 1️⃣ Get module IDs that this role has access to
  const { data: accessData, error: accessError } = await supabase
    .from("module_access")
    .select("module_id")
    .eq("role_id", role_id);

  if (accessError) throw accessError;
  if (!accessData || accessData.length === 0) return [];

  const moduleIds = accessData.map((m: any) => m.module_id);

  // 2️⃣ Fetch modules and nested menus (simplified typing)
  const { data, error } = await supabase
    .from("module")
    .select(`
      module_id,
      name,
      group_name,
      sort_index,
      menu (
        menu_id,
        name,
        path,
        sort_index
      )
    `)
    .in("module_id", moduleIds)
    .order("sort_index", { ascending: true });

  if (error) throw error;
  return (data as Module[]) || [];
}
