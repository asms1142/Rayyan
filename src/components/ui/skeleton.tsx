"use client";

import React from "react";

/* ============================== */
/* ======= BASE SKELETON ======== */
/* ============================== */

type SkeletonProps = {
  className?: string;
};

export const Skeleton = ({ className = "" }: SkeletonProps) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

/* ============================== */
/* ======= TEXT SKELETON ======= */
/* ============================== */

type SkeletonTextProps = {
  lines?: number;
  className?: string;
};

export const SkeletonText = ({ lines = 1, className = "" }: SkeletonTextProps) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, idx) => (
      <Skeleton key={idx} className="h-4 w-full rounded" />
    ))}
  </div>
);

/* ============================== */
/* ======= CARD SKELETON ======= */
/* ============================== */

type SkeletonCardProps = {
  className?: string;
};

export const SkeletonCard = ({ className = "" }: SkeletonCardProps) => (
  <div className={`p-4 border rounded shadow ${className}`}>
    <Skeleton className="h-6 w-1/3 mb-2 rounded" />
    <Skeleton className="h-4 w-full mb-1 rounded" />
    <Skeleton className="h-4 w-full mb-1 rounded" />
    <Skeleton className="h-4 w-1/2 rounded" />
  </div>
);

/* ============================== */
/* ======= TABLE ROW SKELETON === */
/* ============================== */

type SkeletonTableRowProps = {
  columns?: number;
};

export const SkeletonTableRow = ({ columns = 5 }: SkeletonTableRowProps) => (
  <tr>
    {Array.from({ length: columns }).map((_, idx) => (
      <td key={idx} className="p-2">
        <Skeleton className="h-4 w-full rounded" />
      </td>
    ))}
  </tr>
);

/* ============================== */
/* ======= USAGE EXAMPLES ======= */
/* ============================== */

/*
<Skeleton className="h-10 w-32" />
<SkeletonText lines={3} />
<SkeletonCard />
<table>
  <tbody>
    <SkeletonTableRow columns={6} />
    <SkeletonTableRow columns={6} />
  </tbody>
</table>
*/
