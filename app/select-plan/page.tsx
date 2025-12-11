// app/select-plan/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SelectPlanPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [isTrial, setIsTrial] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("sortindex", { ascending: true });
    if (error) console.log(error);
    else setPlans(data || []);
  };

  const handleNext = () => {
    if (!selectedPlan) {
      alert("Please select a plan.");
      return;
    }
    router.push({
      pathname: "/customer-info",
      query: { plan_id: selectedPlan, trial: isTrial },
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 px-4 py-10">
      <h2 className="text-3xl font-bold mb-6">Select a Plan</h2>

      <label className="flex items-center gap-2 mb-6">
        <input
          type="checkbox"
          checked={isTrial}
          onChange={() => setIsTrial(!isTrial)}
          className="w-5 h-5"
        />
        Switch to Trial (15 Days)
      </label>

      <div className="grid md:grid-cols-3 gap-4 mb-6 w-full max-w-4xl">
        {plans.map((plan) => (
          <div
            key={plan.plan_id}
            className={`p-4 border rounded-lg cursor-pointer ${
              selectedPlan === plan.plan_id
                ? "border-blue-600 bg-blue-50"
                : "border-gray-300"
            }`}
            onClick={() => setSelectedPlan(plan.plan_id)}
          >
            <h3 className="text-xl font-bold">{plan.plan_name}</h3>
            <p>Price: ${plan.price}</p>
            <p>Duration: {plan.duration_months} months</p>
            <p>{plan.description}</p>
          </div>
        ))}
      </div>

      <button
        onClick={handleNext}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-semibold"
      >
        Next
      </button>
    </div>
  );
}
