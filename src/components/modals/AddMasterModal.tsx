"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type MasterType = "brand" | "product_group" | "category" | "uom";

interface Props {
  type: MasterType;
  orgId: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddMasterModal({
  type,
  orgId,
  onClose,
  onSaved,
}: Props) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const getConfig = () => {
    switch (type) {
      case "brand":
        return {
          table: "brands",
          field: "brand_name",
          payload: { org_id: orgId },
          title: "Add Brand",
        };
      case "product_group":
        return {
          table: "product_groups",
          field: "group_name",
          payload: { org_id: orgId },
          title: "Add Product Group",
        };
      case "category":
        return {
          table: "product_categories",
          field: "category_name",
          payload: {},
          title: "Add Category",
        };
      case "uom":
        return {
          table: "uom",
          field: "uom_name",
          payload: {
            uom_code: name.substring(0, 3).toUpperCase(),
            uom_category_id: 1,
            uom_type: "reference",
            factor: 1,
          },
          title: "Add UOM",
        };
      default:
        throw new Error("Invalid master type");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Name is required");
      return;
    }

    setSaving(true);

    const config = getConfig();

    const { error } = await supabase.from(config.table).insert([
      {
        [config.field]: name.trim(),
        ...config.payload,
      },
    ]);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    onSaved(); // refresh dropdown
    onClose(); // close modal
    setName("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded shadow-lg w-full max-w-md p-5">
        <h2 className="text-lg font-semibold mb-4">
          {getConfig().title}
        </h2>

        <input
          className="w-full border rounded px-3 py-2 mb-4"
          placeholder="Enter name"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded"
            disabled={saving}
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
