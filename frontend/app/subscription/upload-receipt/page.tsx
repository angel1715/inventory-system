"use client";
import { useState } from "react";
import { uploadReceipt } from "@/lib/api"; // Asegúrate de tener esta función en tu api.ts
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function UploadReceiptPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();

    // Captura los valores de los inputs
    formData.append("amount", e.currentTarget.amount.value);
    formData.append("referenceNumber", e.currentTarget.referenceNumber.value);
    formData.append("file", e.currentTarget.file.files[0]); // El archivo

    try {
      setLoading(true);
      await uploadReceipt(formData); // ¡Ya usa tu nueva función de API!
      toast.success("Comprobante enviado exitosamente.");
      router.push("/subscription/waiting-approval");
    } catch (error) {
      toast.error("Error al subir el comprobante");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white shadow-lg rounded-2xl">
      <h2 className="text-2xl font-bold mb-6">Subir Comprobante</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="amount"
          type="number"
          placeholder="Monto depositado"
          className="w-full p-3 border rounded-lg"
          required
        />
        <input
          name="referenceNumber"
          type="text"
          placeholder="Número de referencia"
          className="w-full p-3 border rounded-lg"
          required
        />
        <input name="file" type="file" className="w-full" required />
        <button
          disabled={loading}
          className="w-full bg-black text-white p-3 rounded-lg"
        >
          {loading ? "Enviando..." : "Confirmar Transferencia"}
        </button>
      </form>
    </div>
  );
}
