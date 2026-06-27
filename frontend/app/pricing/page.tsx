"use client";

import { useState } from "react";
import { uploadReceipt } from "@/lib/api";
import { Check, Crown, Zap, Upload, X } from "lucide-react";
import toast from "react-hot-toast";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // Estado para cambiar entre plan y formulario

  const handleManualPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      await uploadReceipt(formData);
      toast.success(
        "Comprobante enviado. El administrador lo revisará pronto.",
      );
      setIsUploading(false);
    } catch (error) {
      toast.error("Error al enviar el comprobante");
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

      <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 border border-gray-100 shadow-xl transition-all">
        {!isUploading ? (
          /* VISTA NORMAL DEL PLAN */
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-black text-white rounded-2xl">
                <Crown size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Plan</h2>
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
              onClick={() => setIsUploading(true)}
              className="w-full flex items-center justify-center gap-2 bg-black text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 transition shadow-lg active:scale-95"
            >
              Comenzar Suscripción
            </button>
          </>
        ) : (
          /* VISTA DEL FORMULARIO DE PAGO MANUAL */
          <div className="animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-gray-700 text-xl font-bold">
                Cargar Comprobante
              </h2>
              <button
                onClick={() => setIsUploading(false)}
                className="text-gray-400 hover:text-black"
              >
                <X size={24} />
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
              <p className="text-sm font-bold text-gray-700 mb-4">
                Datos para transferencia:
              </p>
              <div className="text-xs text-gray-600 space-y-4">
                {/* Banco Popular */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                    <img
                      src="/logopopular.png"
                      alt="Banco Popular"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">Banco Popular</p>
                    <p>Cuenta: 819295254</p>
                  </div>
                </div>

                {/* Banco BHD */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                    <img
                      src="/logobhd.jpg"
                      alt="Banco BHD"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">Banco BHD</p>
                    <p>Cuenta: 28907980015</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 mt-2">
                  <p>
                    <strong>A nombre de:</strong> Angel Francisco Garcia
                  </p>
                  <p>
                    <strong>RNC/Cédula:</strong> 402-430-1267-7
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleManualPayment} className="space-y-4">
              <div>
                <label className="text-gray-700 block text-sm font-medium mb-1">
                  Monto Depositado
                </label>
                <input
                  name="amount"
                  type="number"
                  required
                  className="text-gray-700 w-full p-3 border rounded-xl"
                  placeholder="RD$1,500"
                />
              </div>
              <div>
                <label className="text-gray-700 block text-sm font-medium mb-1">
                  Número de Referencia
                </label>
                <input
                  name="referenceNumber"
                  type="text"
                  required
                  className="text-gray-700 w-full p-3 border rounded-xl"
                  placeholder="Ref: 12345678"
                />
              </div>
              <div>
                <label className="text-gray-700 block text-sm font-medium mb-1">
                  Adjuntar Comprobante
                </label>
                <input
                  name="file"
                  type="file"
                  required
                  className="text-gray-700 w-full p-3 border rounded-xl file:mr-4 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2"
                />
              </div>

              <button
                disabled={loading}
                className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold hover:bg-green-700 transition disabled:opacity-50"
              >
                {loading ? "Enviando..." : "Enviar Comprobante"}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Tu cuenta será activada una vez verifiquemos tu transferencia.
        </p>
      </div>
    </div>
  );
}
