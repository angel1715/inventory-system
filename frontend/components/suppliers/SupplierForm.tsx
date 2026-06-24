"use client";

import { useState } from "react";

type Props = {
  onSubmit: (data: any) => void;
  loading?: boolean;
};

export default function SupplierForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  function handleChange(key: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  return (
    <div className="bg-white border rounded-3xl p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">New Supplier</h2>

      <div className="space-y-4">
        <input
          placeholder="Supplier name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className="w-full border rounded-2xl p-4 text-gray-800"
        />

        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          className="w-full border rounded-2xl p-4 text-gray-800"
        />

        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          className="w-full border rounded-2xl p-4 text-gray-800"
        />

        <textarea
          placeholder="Address"
          value={form.address}
          onChange={(e) => handleChange("address", e.target.value)}
          className="w-full border rounded-2xl p-4 text-gray-800"
        />

        <button
          disabled={loading}
          onClick={() => onSubmit(form)}
          className="w-full bg-black text-white rounded-2xl py-4 font-semibold"
        >
          {loading ? "Saving..." : "Create Supplier"}
        </button>
      </div>
    </div>
  );
}
