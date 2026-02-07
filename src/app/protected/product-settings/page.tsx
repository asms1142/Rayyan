// File: src/app/protected/product-settings/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";

type ProductSettings = {
  org_id: number;
  is_brand_applicable: boolean;
  is_product_group_applicable: boolean;
  product_code_mode: "AUTO" | "MANUAL";
  is_barcode_applicable: boolean;
  barcode_mode: "SINGLE" | "PRICE_WISE" | null;
  is_warranty_applicable: boolean;
  is_serial_no_applicable: boolean;
  is_expiry_applicable: boolean;
  default_tax_rate: number;
  default_currency: string;
};

export default function ProductSettingsPage() {
  const [settings, setSettings] = useState<ProductSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const orgId = 58; // Replace with dynamic org ID from session/auth

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await axios.get(`/api/product-settings?org_id=${orgId}`);
        setSettings(res.data);
      } catch (err) {
        console.error("Failed to load settings", err);
        setMessage("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!settings) return;
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await axios.post("/api/product-settings", settings);
      setSettings(res.data);
      setMessage("Saved changes");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      console.error("Failed to save settings", err);
      setMessage("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">Organization Product Settings</h1>
      {message && (
        <div className="mb-4 p-2 bg-green-100 text-green-800 rounded">{message}</div>
      )}
      {settings && (
        <div className="space-y-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="is_brand_applicable"
              checked={settings.is_brand_applicable}
              onChange={handleChange}
            />
            <span>Brand Applicable</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="is_product_group_applicable"
              checked={settings.is_product_group_applicable}
              onChange={handleChange}
            />
            <span>Product Group Applicable</span>
          </label>

          <label className="flex items-center space-x-2">
            <span>Product Code Mode:</span>
            <select
              name="product_code_mode"
              value={settings.product_code_mode}
              onChange={handleChange}
              className="border p-1 rounded"
            >
              <option value="AUTO">AUTO</option>
              <option value="MANUAL">MANUAL</option>
            </select>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="is_barcode_applicable"
              checked={settings.is_barcode_applicable}
              onChange={handleChange}
            />
            <span>Barcode Applicable</span>
          </label>

          {settings.is_barcode_applicable && (
            <label className="flex items-center space-x-2">
              <span>Barcode Mode:</span>
              <select
                name="barcode_mode"
                value={settings.barcode_mode || ""}
                onChange={handleChange}
                className="border p-1 rounded"
              >
                <option value="">Select</option>
                <option value="SINGLE">SINGLE</option>
                <option value="PRICE_WISE">PRICE_WISE</option>
              </select>
            </label>
          )}

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="is_warranty_applicable"
              checked={settings.is_warranty_applicable}
              onChange={handleChange}
            />
            <span>Warranty Applicable</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="is_serial_no_applicable"
              checked={settings.is_serial_no_applicable}
              onChange={handleChange}
            />
            <span>Serial No Applicable</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="is_expiry_applicable"
              checked={settings.is_expiry_applicable}
              onChange={handleChange}
            />
            <span>Expiry Applicable</span>
          </label>

          <label className="flex items-center space-x-2">
            <span>Default Tax Rate:</span>
            <input
              type="number"
              name="default_tax_rate"
              value={settings.default_tax_rate}
              onChange={handleChange}
              className="border p-1 rounded w-20"
            />
          </label>

          <label className="flex items-center space-x-2">
            <span>Default Currency:</span>
            <input
              type="text"
              name="default_currency"
              value={settings.default_currency}
              onChange={handleChange}
              className="border p-1 rounded w-20"
            />
          </label>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      )}
    </div>
  );
}
