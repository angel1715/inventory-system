"use client";
import { useState } from "react";
import { uploadReceipt } from "@/lib/api";
import { uploadImage } from "@/lib/uploadImage";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function UploadReceiptPage() {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file || !amount || !reference) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    try {
      setLoading(true);

      // 1. Subir a Cloudinary
      const imageUrl = await uploadImage(file);

      // 2. Preparar el payload con tipos explícitos
      const payload = {
        amount: parseFloat(amount), // Fuerza a número
        referenceNumber: String(reference), // Fuerza a string
        receiptUrl: String(imageUrl),
      };

      // 3. Enviar a la API
      await uploadReceipt(payload);

      toast.success("Comprobante enviado exitosamente.");
      router.push("/subscription/waiting-approval");
    } catch (error) {
      console.error("Error detallado:", error);
      toast.error("Error al enviar al servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white shadow-lg rounded-2xl">
      <h2 className="text-2xl font-bold mb-6">Subir Comprobante</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="number"
          placeholder="Monto depositado"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-3 border rounded-lg"
          required
        />
        <input
          type="text"
          placeholder="Número de referencia"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className="w-full p-3 border rounded-lg"
          required
        />
        <input
          type="file"
          className="w-full"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
        />
        <button
          disabled={loading}
          className="w-full bg-black text-white p-3 rounded-lg disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Confirmar Transferencia"}
        </button>
      </form>
    </div>
  );
}
