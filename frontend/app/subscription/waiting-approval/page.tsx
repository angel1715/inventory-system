"use client";
import { useRouter } from "next/navigation";

export default function WaitingApprovalPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="max-w-sm">
        <h1 className="text-3xl font-bold mb-4">Validando pago...</h1>
        <p className="text-gray-600 mb-6">
          Hemos recibido tu comprobante. Nuestro equipo lo revisará y activará
          tu cuenta en menos de 24 horas.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="text-indigo-600 font-semibold"
        >
          ¿Ya fue aprobado? Reintentar acceso
        </button>
      </div>
    </div>
  );
}
