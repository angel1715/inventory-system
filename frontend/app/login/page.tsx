"use client";

import { login as loginApi } from "@/lib/api";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      const data = await loginApi({ email, password });

      if (!data?.token || !data?.user)
        throw new Error("Respuesta inválida del servidor");

      // 1. Guardar token en tu contexto
      await login(data.token);

      // 2. GUARDAR COOKIES PARA EL MIDDLEWARE (Crucial)
      // Guardamos el token y el status de suscripción
      document.cookie = `token=${data.token}; path=/; max-age=86400; SameSite=Lax;`;
      document.cookie = `subStatus=${data.user.subscriptionStatus}; path=/; max-age=86400; SameSite=Lax;`;

      toast.success("¡Bienvenido!");

      // 3. Redirección inteligente basada en el estado
      if (data.user.subscriptionStatus === "ACTIVE") {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/pricing";
      }
    } catch (err: any) {
      console.error("LOGIN ERROR:", err);
      toast.error(err?.message || "Error al iniciar sesión");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-slate-100 px-4">
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 p-10">
          {/* Header */}
          <div className="flex flex-col items-center mb-5">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center mb-6 shadow-md shadow-violet-900/20 border border-white/10 p-3">
              <img
                src="/mi_logo.png"
                alt="Logo OGAdmin"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <div className="flex flex-col items-center mb-10">
            <h1 className="text-4xl font-semibold text-zinc-900 tracking-tight">
              Bienvenido
            </h1>
            <p className="text-zinc-500 mt-2 text-center">
              Inicia sesión para continuar a tu espacio
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div>
              <label className="text-sm font-medium text-zinc-700 block mb-2">
                Correo electrónico
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-600 transition-colors">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full bg-white border border-zinc-200 rounded-2xl pl-11 pr-4 py-4 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="text-sm font-medium text-zinc-700 block mb-2">
                Contraseña
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-600 transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full bg-white border border-zinc-200 rounded-2xl pl-11 pr-4 py-4 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              className="w-full group relative overflow-hidden bg-gradient-to-br from-blue-600 to-violet-600 hover:bg-black text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.985] disabled:opacity-70 mt-2 shadow-lg shadow-zinc-200"
            >
              <span>{loading ? "Validando..." : "Iniciar sesión"}</span>
              {!loading && (
                <ArrowRight
                  className="group-hover:translate-x-1 transition-transform"
                  size={20}
                />
              )}
            </button>

            {/* Enlaces */}
            <div className="flex flex-col items-center gap-4 pt-4">
              <a
                href="/forgot-password"
                className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-400 text-xs mt-8">
          © {new Date().getFullYear()}{" "}
          <span className="bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(165,243,252,0.5)]">
            OGAdmin
          </span>
        </p>
      </div>
    </div>
  );
}
