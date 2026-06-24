"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getProduct, updateProduct } from "@/lib/api";
import ProductForm from "@/components/ProductForm";
import toast from "react-hot-toast";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false); // 🔥 NUEVO: Estado para bloquear el botón de guardado

  useEffect(() => {
    if (!params?.id) return;

    getProduct(params.id as string)
      .then(setData)
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load product data");
      });
  }, [params]);

  async function handleSubmit(form: any) {
    try {
      setLoading(true);

      // 👁️ REVISIÓN EN VIVO: Apaga el switch en la pantalla y dale a guardar.
      console.log("PAYLOAD QUE SALE DEL FORMULARIO:", form);

      await updateProduct(params.id as string, form);
      toast.success("Product updated successfully");
      router.push("/products");
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-gray-500 font-medium">
        Loading product information...
      </div>
    );
  }

  return (
    // 🔥 CORREGIDO: Mismo contenedor centrado y fondo gris que 'new/page.tsx' para uniformidad estética
    <div className="min-h-screen bg-slate-100 p-6 md:p-12 flex justify-center">
      <div className="w-full max-w-4xl">
        <ProductForm
          initialData={data}
          onSubmit={handleSubmit}
          loading={loading}
        />
      </div>
    </div>
  );
}
