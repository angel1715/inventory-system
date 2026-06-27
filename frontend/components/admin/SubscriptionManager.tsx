"use client";
import { useState, useEffect } from "react";
import { getAllSubscriptions, toggleSubscriptionStatus } from "@/lib/api";
import { toast } from "sonner";

export default function SubscriptionManager() {
  const [subs, setSubs] = useState<any[]>([]);

  useEffect(() => {
    loadSubs();
  }, []);

  const loadSubs = async () => {
    try {
      const data = await getAllSubscriptions();
      setSubs(data);
    } catch (error) {
      toast.error("Error al cargar suscripciones");
    }
  };

  const handleToggle = async (businessId: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "EXPIRED" : "ACTIVE";
    try {
      await toggleSubscriptionStatus(businessId, newStatus);
      toast.success(`Suscripción actualizada a ${newStatus}`);
      loadSubs(); // Recargamos para ver los cambios reflejados
    } catch (error) {
      toast.error("Error al cambiar estado");
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Gestión de Suscripciones</h3>
      <div className="space-y-3">
        {subs.map((s) => (
          <div
            key={s.id}
            className="flex justify-between items-center p-3 border border-zinc-100 rounded-xl hover:bg-zinc-50"
          >
            <div>
              {/* Accedemos al nombre a través de la relación business */}
              <p className="font-medium text-sm">
                {s.business?.name || "Sin nombre"}
              </p>
              <p className="text-[10px] text-zinc-400">
                {/* Usamos currentPeriodEnd que es el campo correcto en el modelo Subscription */}
                Expira:{" "}
                {s.currentPeriodEnd
                  ? new Date(s.currentPeriodEnd).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>

            {/* El botón usa businessId porque toggleSubscriptionStatus necesita el ID del negocio */}
            <button
              onClick={() => handleToggle(s.businessId, s.subscriptionStatus)}
              className={`w-12 h-6 rounded-full transition-colors flex items-center p-1 ${
                s.subscriptionStatus === "ACTIVE"
                  ? "bg-green-500"
                  : "bg-zinc-300"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  s.subscriptionStatus === "ACTIVE"
                    ? "translate-x-6"
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
