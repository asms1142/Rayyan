"use client";

import React from "react";

interface TokenDrawerProps {
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

export default function TokenDrawer({
  open,
  onClose,
  children,
}: TokenDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="flex-1 bg-black/40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="w-[420px] bg-white p-5 overflow-y-auto animate-slideIn">
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h2 className="text-lg font-semibold">Token</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
