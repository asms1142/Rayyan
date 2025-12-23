// src/app/public/select-plan/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

interface Plan {
  plan_id: number;
  plan_name: string;
  price: number;
  duration_months: number;
  description: string;
  sortindex: number;
}

export default function SelectPlanPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [isTrial, setIsTrial] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("sortindex", { ascending: true });

    if (error) {
      console.error("Error fetching plans:", error.message);
    } else {
      setPlans(data || []);
    }

    setLoading(false);
  };

  const handleNext = () => {
    if (!selectedPlan) {
      alert("Please select a plan.");
      return;
    }

    router.push(
      `/public/customer-info?plan_id=${selectedPlan}&trial=${isTrial ? 1 : 0}`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading plans...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-[var(--bg-app)] px-4 py-12">
      <h2 className="text-4xl lg:text-5xl font-bold mb-8 text-[var(--text-primary)]">
        Choose Your Plan
      </h2>

      {/* Trial Switch */}
      <label className="flex items-center gap-3 mb-8 text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={isTrial}
          onChange={() => setIsTrial(!isTrial)}
          className="w-5 h-5 accent-[var(--primary)]"
        />
        Enable 15-Day Trial
      </label>

      {/* Plan Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mb-8">
        {plans.map((plan) => (
          <div
            key={plan.plan_id}
            className={`flex flex-col p-6 border rounded-xl shadow-md cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
              selectedPlan === plan.plan_id
                ? "border-[var(--primary)] bg-blue-50"
                : "border-gray-300 bg-[var(--bg-card)]"
            }`}
            onClick={() => setSelectedPlan(plan.plan_id)}
          >
            <h3 className="text-2xl font-semibold mb-2 text-[var(--text-primary)]">
              {plan.plan_name}
            </h3>
            <p className="text-lg font-bold text-[var(--primary)] mb-1">
              ${plan.price} / {plan.duration_months} month
            </p>
            <p className="text-sm text-[var(--text-secondary)]">{plan.description}</p>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <button
        onClick={handleNext}
        className="bg-[var(--primary)] hover:bg-purple-700 text-white px-8 py-3 rounded-xl text-lg font-semibold shadow-lg transition-colors"
      >
        Next
      </button>
    </div>
  );
}
