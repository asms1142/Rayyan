"use client";
import { SkeletonCard, SkeletonTableRow } from "./skeleton";

type LoaderProps = {
  type?: "card" | "table";
  count?: number;
};

export const Loader = ({ type = "card", count = 3 }: LoaderProps) => {
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

  // Default card loader
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </div>
  );
};
