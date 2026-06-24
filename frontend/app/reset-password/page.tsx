"use client";
import { resetPassword } from "@/lib/api";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);

    try {
      await resetPassword(token, password);
      alert("¡Contraseña actualizada! Ya puedes iniciar sesión.");
      router.push("/login");
    } catch (error: any) {
      alert(
        "Error al actualizar la contraseña. El token podría haber expirado.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token)
    return (
      <div className="p-10 text-center text-red-600">
        Token no válido. Solicita uno nuevo.
      </div>
    );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Restablecer Contraseña
        </h1>

        <input
          type="password"
          placeholder="Nueva contraseña"
          className="text-gray-700 w-full rounded-lg border border-gray-300 p-3 mb-6 focus:ring-2 focus:ring-indigo-500 outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 text-white font-semibold py-3 hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? "Procesando..." : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-10">Cargando...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
