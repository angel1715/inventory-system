"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/lib/api";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    businessName: "", // Nuevo campo
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validamos el nuevo campo
    if (!form.businessName || !form.name || !form.email || !form.password) {
      toast.error("All fields are required");
      return;
    }

    try {
      setLoading(true);

      // El backend ahora espera businessName
      await register(form);

      // AUTO LOGIN
      const data = await login({
        email: form.email,
        password: form.password,
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      window.location.href = "/dashboard";
    } catch (err: any) {
      toast.error(err.message || "Error creating account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md"
      >
        <h1 className="text-gray-900 text-3xl font-bold mb-6">
          Create Account
        </h1>

        <div className="space-y-4">
          {/* Campo nuevo para el negocio */}
          <input
            type="text"
            placeholder="Business Name"
            className="text-gray-700 w-full border p-3 rounded-xl"
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
          />

          <input
            type="text"
            placeholder="Your Name"
            className="text-gray-700 w-full border p-3 rounded-xl"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            type="email"
            placeholder="Email"
            className="text-gray-700 w-full border p-3 rounded-xl"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <input
            type="password"
            placeholder="Password"
            className="text-gray-700 w-full border p-3 rounded-xl"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white p-3 rounded-xl"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </div>
      </form>
    </div>
  );
}
