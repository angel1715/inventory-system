"use client";
import { useEffect, useState } from "react";
import { getPendingPayments, approveManualPayment } from "@/lib/api";
import { toast } from "sonner";
import { SubscriptionReceiptModal } from "../SubscriptionReceiptModal";

interface ManualPaymentLog {
  id: string;
  amount: number;
  referenceNumber: string;
  businessId: string;
  receiptUrl: string;
  business: {
    name: string;
  };
}

export default function AdminSubscriptionList() {
  const [pendings, setPendings] = useState<ManualPaymentLog[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [selectedPlans, setSelectedPlans] = useState<
    Record<string, "SUBSCRIPTION" | "LIFETIME">
  >({});

  useEffect(() => {
    fetchPendings();
  }, []);

  const fetchPendings = async () => {
    try {
      const data = await getPendingPayments();
      setPendings(data);
    } catch (error) {
      toast.error("Error al cargar pagos pendientes");
    }
  };

  const handleApprove = async (businessId: string, logId: string) => {
    console.log("Intentando aprobar:", { businessId, logId });
    const planType = selectedPlans[logId] || "SUBSCRIPTION";

    try {
      // 1. Llamada al backend
      await approveManualPayment(businessId, logId, planType);

      // 2. ACTUALIZACIÓN DEL ESTADO (Esto hace que desaparezca de la lista)
      setPendings((prev) => prev.filter((p) => p.id !== logId));

      // 3. Feedback visual
      toast.success(
        `Suscripción ${planType === "LIFETIME" ? "Lifetime" : "Mensual"} aprobada`,
      );
    } catch (error: any) {
      // 4. Manejo real de errores
      console.error("Error completo:", error);

      // Si el error viene de tu backend, intentamos mostrar su mensaje
      const message = error.message || "Error al aprobar el pago";
      toast.error(message);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200">
      <div className="space-y-4">
        {pendings.map((p) => (
          <div
            key={p.id}
            className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 rounded-lg"
          >
            <div>
              <p className="font-bold text-gray-900">{p.business.name}</p>
              <p className="text-sm text-gray-500">
                RD${p.amount} | Ref: {p.referenceNumber}
              </p>
            </div>

            <div className="flex gap-2 items-center">
              <select
                className="bg-white border border-gray-300 text-sm rounded-lg p-2"
                onChange={(e) =>
                  setSelectedPlans({
                    ...selectedPlans,
                    [p.id]: e.target.value as "SUBSCRIPTION" | "LIFETIME",
                  })
                }
              >
                <option value="SUBSCRIPTION">Mensual</option>
                <option value="LIFETIME">Lifetime</option>
              </select>

              <button
                onClick={() => setSelectedReceipt(p.receiptUrl)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Ver
              </button>
              <button
                onClick={() => handleApprove(p.businessId, p.id)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Aprobar
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedReceipt && (
        <SubscriptionReceiptModal
          url={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
