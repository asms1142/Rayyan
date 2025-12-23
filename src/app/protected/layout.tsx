"use client";

import { ReactNode } from "react";
import LayoutWrapper from "@/components/layout/LayoutWrapper";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <LayoutWrapper>{children}</LayoutWrapper>;
}
