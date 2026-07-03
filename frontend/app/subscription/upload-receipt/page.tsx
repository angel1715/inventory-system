"use client";
import { useState } from "react";
import { uploadReceipt } from "@/lib/api"; // Asegúrate de tener esta función en tu api.ts
import { uploadImage } from "@/lib/upload";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function UploadReceiptPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const file = form.file.files[0];

    if (!file) return;

    try {
      setLoading(true);

      // 1. Subir a Cloudinary primero
      const imageUrl = await uploadImage(file);

      // 2. Preparar el objeto con la URL completa y los datos del formulario
      const payload = {
        amount: Number(form.amount.value),
        referenceNumber: form.referenceNumber.value,
        receiptUrl: imageUrl, // Aquí enviamos la URL completa
      };

      // 3. Enviar al backend
      await uploadReceipt(payload as any);

      toast.success("Comprobante enviado exitosamente.");
      router.push("/subscription/waiting-approval");
    } catch (error) {
      console.error(error);
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
