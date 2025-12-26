// app/get-started/page.tsx
"use client";

import { useRouter } from "next/navigation";

export default function GetStartedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="text-5xl font-bold text-blue-600 mb-4">Rayyan</h1>
      <p className="text-xl text-gray-700 mb-8 text-center max-w-xl">
        Easy and reliable solution for your business <br />
        System Combined Customers, Projects, Tickets, Reports and more...!
      </p>

      <div className="flex gap-4 mb-6">
        <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-semibold">
          Start Free Trial
        </span>
        <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-semibold">
          Secure and Easy
        </span>
      </div>

      <button
        onClick={() => router.push("/select-plan")}
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded text-lg font-semibold"
      >
        Get Started
      </button>
    </div>
  );
}
