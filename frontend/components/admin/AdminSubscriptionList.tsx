"use client";
import { useEffect, useState } from "react";
import { getPendingPayments, approveManualPayment } from "@/lib/api";
import { toast } from "sonner";
import { SubscriptionReceiptModal } from "../SubscriptionReceiptModal"; // Asegúrate de la ruta

interface ManualPaymentLog {
  id: string;
  amount: number;
  referenceNumber: string;
  businessId: string;
  receiptUrl: string; // Asegúrate de incluir esto
  business: {
    name: string;
  };
}

export default function AdminSubscriptionList() {
  const [pendings, setPendings] = useState<ManualPaymentLog[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

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
    try {
      await approveManualPayment(businessId, logId);
      setPendings((prev) => prev.filter((p) => p.id !== logId));
      toast.success("Suscripción extendida exitosamente");
    } catch (error) {
      toast.error("Error al aprobar el pago");
    }
  };

  return (
    <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
      <h2 className="text-xl font-bold mb-4">Pagos Pendientes de Aprobación</h2>

      {pendings.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">No hay pagos pendientes.</p>
      ) : (
        <div className="space-y-2">
          {pendings.map((p) => (
            <div
              key={p.id}
              className="flex justify-between items-center p-4 bg-white shadow-sm border border-gray-100 rounded-lg"
            >
              <div>
                <p className="font-bold text-gray-900">{p.business.name}</p>
                <p className="text-sm text-gray-500">
                  Monto: RD${p.amount} | Ref: {p.referenceNumber}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedReceipt(p.receiptUrl)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Ver Comprobante
                </button>
                <button
                  onClick={() => handleApprove(p.businessId, p.id)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  Aprobar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReceipt && (
        <SubscriptionReceiptModal
          url={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
