import { supabase } from "@/lib/supabaseClient";

export async function getSidebar(role_id: number) {
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
    .order("sort_index", { ascending: true })
    .in(
      "module_id",
      supabase
        .from("module_access")
        .select("module_id")
        .eq("role_id", role_id)
    );

  if (error) throw error;
  return data || [];
}
