// File: protected/project-tokens/[project_id]/page.tsx
"use client"; // <-- Use client if you want to receive router params from a client navigation

import TokensClient from "./TokensClient";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";

export default function ProjectTokensPage() {
  const params = useParams(); // Client-side hook to get URL params
  const projectIdStr = params?.project_id;
  const [projectName, setProjectName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectIdStr) {
        console.error("No project_id found in params!");
        setLoading(false);
        return;
      }

      const projectIdNum = Number(projectIdStr);
      if (isNaN(projectIdNum)) {
        console.error("Invalid projectId:", projectIdStr);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("project")
        .select("project_name")
        .eq("project_id", projectIdNum)
        .single();

      if (error) {
        console.error("Error fetching project:", error);
        setLoading(false);
        return;
      }

      if (!data) {
        console.warn("No project found with id:", projectIdNum);
        setLoading(false);
        return;
      }

      console.log("Project fetched:", data.project_name);
      setProjectName(data.project_name);
      setLoading(false);
    };

    fetchProject();
  }, [projectIdStr]);

  if (loading) return <div>Loading project...</div>;
  if (!projectIdStr || !projectName) return <div>No project found</div>;

// Convert projectIdStr to number
const projectId = Array.isArray(projectIdStr) ? Number(projectIdStr[0]) : Number(projectIdStr);

return <TokensClient projectId={projectId} projectName={projectName} />;
}
