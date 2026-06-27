"use client";
import { forgotPassword } from "@/lib/api";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      await forgotPassword(email);
      setMessage({
        type: "success",
        text: "¡Enviado! Revisa tu bandeja de entrada o spam para continuar con el restablecimiento.",
      });
    } catch (error: any) {
      // Incluso si el usuario pone un correo que no existe, es buena práctica decir
      // "Si el correo existe, recibirás un mensaje" para no revelar correos registrados.
      setMessage({
        type: "success", // Mantenemos "success" para no dar pistas a atacantes
        text: "Si el correo está registrado, recibirás un mensaje en breve.",
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          ¿Olvidaste tu contraseña?
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Introduce tu correo para recibir las instrucciones.
        </p>

        <input
          type="email"
          placeholder="correo@ejemplo.com"
          className="text-gray-700 w-full rounded-lg border border-gray-300 p-3 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 text-white font-semibold py-3 hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar instrucciones"}
        </button>

        {message.text && (
          <p
            className={`mt-4 text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}
          >
            {message.text}
          </p>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-indigo-600 hover:underline"
          >
            Regresar al login
          </Link>
        </div>
      </form>
    </div>
  );
}
