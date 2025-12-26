// src/app/public/get-started/page.tsx
"use client";

import { useRouter } from "next/navigation";

export default function GetStartedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--bg-app)]">
      {/* ================= LEFT INFO PANEL ================= */}
      <div className="lg:w-1/2 flex flex-col justify-center px-12 py-16 lg:py-32 bg-[var(--primary)] text-white">
        <h1 className="text-5xl font-bold mb-6">SAAS CRM</h1>
        <p className="text-lg leading-relaxed max-w-lg opacity-90 mb-10">
          The complete business management platform to control inventory, sales, 
          users, subscriptions, accounting, and analytics — all in one place.
        </p>

        <ul className="space-y-3 text-sm opacity-90">
          <li>• Secure role-based access</li>
          <li>• Real-time Tickets tracking</li>
          <li>• Subscription & billing management</li>
          <li>• Enterprise-grade reporting</li>
          <li>• Multi-user collaboration</li>
        </ul>

        <div className="mt-16 text-xs opacity-70">
          © {new Date().getFullYear()} SAAS CRM · All rights reserved
        </div>
      </div>

      {/* ================= RIGHT ILLUSTRATION/PREVIEW PANEL ================= */}
      <div className="lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md h-80 bg-[var(--bg-card)] rounded-xl shadow-lg p-6 flex flex-col justify-between">
          {/* Top: illustration icon */}
          <div className="flex justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-[var(--primary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m-6-8h6m-7 10h8a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h1"
              />
            </svg>
          </div>

          {/* Middle: feature list */}
          <ul className="text-sm text-[var(--text-secondary)] space-y-2">
            <li>• Real-time inventory tracking</li>
            <li>• Sales & purchase management</li>
            <li>• Multi-user role access control</li>
            <li>• Subscription & billing automation</li>
            <li>• Detailed reporting & analytics</li>
          </ul>

          {/* Bottom: CTA button */}
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push("/public/select-plan")}
              className="mt-4 bg-[var(--primary)] hover:bg-purple-700 text-white px-8 py-3 rounded text-lg font-semibold"
            >
              Get Started
            </button>
            <span className="block text-xs text-gray-400 mt-2">
              Trusted by businesses worldwide
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
