"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { register, login, validateInvitationToken } from "@/lib/api";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [form, setForm] = useState({
    token: token,
    businessName: "",
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  // 1. Validar el token al cargar la página
  useEffect(() => {
    async function checkToken() {
      if (!token) {
        setIsValidating(false);
        return;
      }
      try {
        await validateInvitationToken(token);
        setIsTokenValid(true);
      } catch (err) {
        toast.error("El link de invitación no es válido o ya expiró");
        setIsTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    }
    checkToken();
  }, [token]);

  // Añade esto debajo de tu primer useEffect de validación
  useEffect(() => {
    setForm((prev) => ({ ...prev, token: token }));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // El backend ahora marcará el token como usado en este proceso
      await register(form);

      const data = await login({
        email: form.email,
        password: form.password,
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      window.location.href = "/dashboard";
    } catch (err: any) {
      toast.error(err.message || "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  }

  // 2. Estados de carga o error de validación
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Validando invitación...
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Acceso Denegado
          </h1>
          <p className="text-gray-600">
            Este registro es privado. Por favor, solicita un link de invitación
            válido a tu administrador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md"
      >
        <h1 className="text-gray-900 text-3xl font-bold mb-6">Crear Cuenta</h1>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nombre del Negocio"
            required
            className="text-gray-700 w-full border p-3 rounded-xl"
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
          />
          <input
            type="text"
            placeholder="Tu Nombre"
            required
            className="text-gray-700 w-full border p-3 rounded-xl"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            type="email"
            placeholder="Email"
            required
            className="text-gray-700 w-full border p-3 rounded-xl"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="Contraseña"
            required
            className="text-gray-700 w-full border p-3 rounded-xl"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white p-3 rounded-xl hover:bg-gray-800 transition-colors"
          >
            {loading ? "Creando cuenta..." : "Registrarse"}
          </button>
        </div>
      </form>
    </div>
  );
}
