"use client";

import { SkeletonCard, SkeletonTableRow } from "./skeleton";

type LoaderProps = {
  type?: "card" | "table";
  count?: number;
  message?: string; // ✅ NEW (optional)
};

export const Loader = ({
  type = "card",
  count = 3,
  message,
}: LoaderProps) => {
  // ✅ If message is provided, show simple spinner + text
  if (message) {
    return (
      <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-600">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></span>
        <span>{message}</span>
      </div>
    );
  }

  // ✅ Table skeleton loader
  if (type === "table") {
    return (
      <table className="w-full border-collapse">
        <tbody>
          {Array.from({ length: count }).map((_, idx) => (
            <SkeletonTableRow key={idx} />
          ))}
        </tbody>
      </table>
    );
  }

  // ✅ Default card skeleton loader
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </div>
  );
};
