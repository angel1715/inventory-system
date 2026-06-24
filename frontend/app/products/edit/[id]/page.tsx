"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getProduct, updateProduct } from "@/lib/api";
import ProductForm from "@/components/ProductForm";
import toast from "react-hot-toast";

export default function EditProductPage() {
  const router = useRouter();
  // 1. Forzamos que params sea tratado como un objeto que contiene un id
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 2. Acceso seguro al id
    const id = params?.id;
    if (!id) return;

    getProduct(id)
      .then(setData)
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load product data");
      });
  }, [params?.id]); // 3. Dependencia más específica

  async function handleSubmit(form: any) {
    // 4. Verificación de seguridad antes de llamar a la API
    const id = params?.id;
    if (!id) return;

    try {
      setLoading(true);
      await updateProduct(id, form);
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
