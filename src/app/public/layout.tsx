"use client";

import { ReactNode } from "react";
import AppLayout from "@/components/layout/AppLayout";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <AppLayout variant="public">{children}</AppLayout>;
}
