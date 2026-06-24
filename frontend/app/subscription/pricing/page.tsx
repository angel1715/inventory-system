"use client";

import { useState } from "react";
import { createCheckoutSession } from "@/lib/api";
import toast from "react-hot-toast";
import { Check, Crown, Zap } from "lucide-react";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (priceId: string) => {
    try {
      setLoading(true);
      const data = await createCheckoutSession(priceId);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(error.message || "Error al procesar la suscripción");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-20 px-6">
      <div className="max-w-4xl mx-auto text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
          Elige el plan para tu negocio
        </h1>
        <p className="text-lg text-gray-600">
          Escala tu sistema AG-POS con funcionalidades ilimitadas.
        </p>
      </div>

      <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 border border-gray-100 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-black text-white rounded-2xl">
            <Crown size={24} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Plan Pro</h2>
        </div>

        <div className="text-left mb-8">
          <span className="text-5xl font-extrabold text-gray-900">
            RD$1,500
          </span>
          <span className="text-gray-500 font-medium">/mes</span>
        </div>

        <ul className="space-y-4 mb-8 text-gray-600">
          {[
            "Gestión de Inventario Ilimitada",
            "Módulo de Taller y Reparaciones",
            "Dashboard Analítico Avanzado",
            "Soporte prioritario 24/7",
            "Cuentas de usuario ilimitadas",
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-3">
              <Check className="text-green-500" size={20} />
              {item}
            </li>
          ))}
        </ul>


        <button
          disabled={loading}
          onClick={() => handleSubscribe("price_1ThwI3A0zwBcaZWABvbkPphg")} // Sustituye con tu ID real de Stripe
          className="w-full flex items-center justify-center gap-2 bg-black text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 transition shadow-lg active:scale-95 disabled:bg-gray-400"
        >
          {loading ? (
            <>
              <Zap className="animate-pulse" /> Procesando...
            </>
          ) : (
            "Comenzar Suscripción"
          )}
        </button>
        <p className="text-center text-xs text-gray-400 mt-4">
          Pagos seguros procesados por Stripe
        </p>
      </div>
    </div>
  );
}
