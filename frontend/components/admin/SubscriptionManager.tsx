"use client";
import { useState, useEffect } from "react";
import { getAllSubscriptions, updateSubscriptionPlan } from "@/lib/api";
import { toast } from "sonner";

export default function SubscriptionManager() {
  const [subs, setSubs] = useState<any[]>([]);

  useEffect(() => {
    loadSubs();
  }, []);

  const loadSubs = async () => {
    const data = await getAllSubscriptions();
    setSubs(data);
  };

  const handleUpdate = async (
    businessId: string,
    accessType: any,
    status: any,
  ) => {
    try {
      await updateSubscriptionPlan(businessId, {
        accessType,
        subscriptionStatus: status,
      });
      toast.success("Plan actualizado");
      loadSubs();
    } catch (e) {
      toast.error("Error al actualizar");
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <h3 className="font-bold mb-4">
        Gestión de Suscripciones (Todos los Clientes)
      </h3>
      {subs.map((s) => (
        <div
          key={s.businessId}
          className="flex items-center justify-between p-3 border-b border-gray-100"
        >
          <span className="font-medium">{s.business.name}</span>
          <div className="flex gap-2">
            <select
              defaultValue={s.accessType}
              onChange={(e) =>
                handleUpdate(s.businessId, e.target.value, s.subscriptionStatus)
              }
              className="text-xs p-1 border rounded"
            >
              <option value="SUBSCRIPTION">Mensual</option>
              <option value="LIFETIME">Lifetime</option>
            </select>

            <select
              defaultValue={s.subscriptionStatus}
              onChange={(e) =>
                handleUpdate(s.businessId, s.accessType, e.target.value)
              }
              className="text-xs p-1 border rounded"
            >
              <option value="ACTIVE">Activo</option>
              <option value="EXPIRED">Vencido</option>
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}
