"use client";
import { useState, useEffect } from "react";
import { getAllSubscriptions, updateSubscriptionPlan } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react"; // Importamos el icono

export default function SubscriptionManager() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    loadSubs();
  }, []);

  const loadSubs = async () => {
    const data = await getAllSubscriptions();
    setSubs(data);
  };

  const handleUpdate = async (
    businessId: string,
    accessType: string, // Sigue siendo string por venir del evento
    status: string,
  ) => {
    setLoadingId(businessId);
    try {
      await updateSubscriptionPlan(businessId, {
        // Usamos "as" para asegurar a TS que son los tipos correctos
        accessType: accessType as "SUBSCRIPTION" | "LIFETIME",
        subscriptionStatus: status as "ACTIVE" | "EXPIRED",
      });
      toast.success("Plan actualizado");
      await loadSubs();
    } catch (e) {
      toast.error("Error al actualizar");
      await loadSubs();
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <h3 className="font-bold mb-4">Gestión de Suscripciones</h3>
      {subs.map((s) => (
        <div
          key={s.businessId}
          className="flex items-center justify-between p-3 border-b border-gray-100 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{s.business.name}</span>
            {/* Spinner con icono */}
            {loadingId === s.businessId && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            )}
          </div>

          <div
            className={`flex items-center gap-6 ${loadingId === s.businessId ? "opacity-50 pointer-events-none" : "opacity-100"}`}
          >
            <select
              value={s.accessType}
              onChange={(e) =>
                handleUpdate(s.businessId, e.target.value, s.subscriptionStatus)
              }
              className="text-xs p-1 border rounded cursor-pointer"
            >
              <option value="SUBSCRIPTION">Mensual</option>
              <option value="LIFETIME">Lifetime</option>
            </select>

            <div className="flex gap-3 text-xs">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  className="cursor-pointer"
                  checked={s.subscriptionStatus === "ACTIVE"}
                  onChange={() =>
                    handleUpdate(s.businessId, s.accessType, "ACTIVE")
                  }
                />
                Activo
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  className="cursor-pointer"
                  checked={s.subscriptionStatus === "EXPIRED"}
                  onChange={() =>
                    handleUpdate(s.businessId, s.accessType, "EXPIRED")
                  }
                />
                Vencido
              </label>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
