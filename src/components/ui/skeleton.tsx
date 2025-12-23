"use client";

import React from "react";

type SkeletonProps = {
  className?: string;
};

export const Skeleton = ({ className = "" }: SkeletonProps) => (
  <div
    className={`animate-pulse bg-gray-200 rounded ${className}`}
  />
);

export const SkeletonText = ({ lines = 1 }: { lines?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, idx) => (
      <Skeleton key={idx} className="h-4 w-full" />
    ))}
  </div>
);

export const SkeletonCard = () => (
  <div className="p-4 border rounded shadow">
    <Skeleton className="h-6 w-1/3 mb-2" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

export const SkeletonTableRow = () => (
  <tr>
    {Array.from({ length: 5 }).map((_, idx) => (
      <td key={idx} className="p-2">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);
