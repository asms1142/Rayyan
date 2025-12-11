// pages/superadmin/subscription-management.tsx

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Plan {
  plan_id: number;
  plan_name: string;
  price: number;
  duration_months: number;
  max_users: number;
  description: string;
  sortindex: number;
}

export default function SubscriptionManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const [planName, setPlanName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [maxUsers, setMaxUsers] = useState("");
  const [description, setDescription] = useState("");
  const [sortIndex, setSortIndex] = useState("");

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

  // Add New Plan
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("subscription_plans").insert([
      {
        plan_name: planName,
        price: parseFloat(price),
        duration_months: parseInt(duration),
        max_users: parseInt(maxUsers || "1"),
        description,
        sortindex: parseInt(sortIndex || "0"),
      },
    ]);
    if (error) alert(error.message);
    else {
      alert("Plan added successfully!");
      resetForm();
      fetchPlans();
    }
  };

  // Edit Plan
  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanName(plan.plan_name);
    setPrice(plan.price.toString());
    setDuration(plan.duration_months.toString());
    setMaxUsers(plan.max_users.toString());
    setDescription(plan.description || "");
    setSortIndex(plan.sortindex.toString());
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    const { error } = await supabase
      .from("subscription_plans")
      .update({
        plan_name: planName,
        price: parseFloat(price),
        duration_months: parseInt(duration),
        max_users: parseInt(maxUsers || "1"),
        description,
        sortindex: parseInt(sortIndex || "0"),
        updated_at: new Date(),
      })
      .eq("plan_id", editingPlan.plan_id);
    if (error) alert(error.message);
    else {
      alert("Plan updated successfully!");
      resetForm();
      fetchPlans();
      setEditingPlan(null);
    }
  };

  // Delete Plan
  const handleDelete = async (plan_id: number) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    const { error } = await supabase
      .from("subscription_plans")
      .delete()
      .eq("plan_id", plan_id);
    if (error) alert(error.message);
    else fetchPlans();
  };

  const resetForm = () => {
    setPlanName("");
    setPrice("");
    setDuration("");
    setMaxUsers("");
    setDescription("");
    setSortIndex("");
    setEditingPlan(null);
  };

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">
        {editingPlan ? "Edit Subscription Plan" : "Add Subscription Plan"}
      </h2>

      {/* Form */}
      <form
        onSubmit={editingPlan ? handleUpdate : handleAdd}
        className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6"
      >
        <input
          type="text"
          placeholder="Plan Name"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          className="border p-2 rounded col-span-2"
          required
        />
        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="number"
          placeholder="Duration (Months)"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="number"
          placeholder="Max Users"
          value={maxUsers}
          onChange={(e) => setMaxUsers(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="number"
          placeholder="Sort Index"
          value={sortIndex}
          onChange={(e) => setSortIndex(e.target.value)}
          className="border p-2 rounded"
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border p-2 rounded col-span-2 md:col-span-6"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 col-span-1 md:col-span-1"
        >
          {editingPlan ? "Update Plan" : "Add Plan"}
        </button>
        {editingPlan && (
          <button
            type="button"
            onClick={resetForm}
            className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600 col-span-1 md:col-span-1"
          >
            Cancel
          </button>
        )}
      </form>

      {/* Plans Table */}
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Name</th>
            <th className="border p-2">Price</th>
            <th className="border p-2">Duration</th>
            <th className="border p-2">Max Users</th>
            <th className="border p-2">Sort Index</th>
            <th className="border p-2">Description</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.plan_id}>
              <td className="border p-2">{plan.plan_name}</td>
              <td className="border p-2">{plan.price}</td>
              <td className="border p-2">{plan.duration_months} months</td>
              <td className="border p-2">{plan.max_users}</td>
              <td className="border p-2">{plan.sortindex}</td>
              <td className="border p-2">{plan.description}</td>
              <td className="border p-2 space-x-2">
                <button
                  onClick={() => handleEdit(plan)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(plan.plan_id)}
                  className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
