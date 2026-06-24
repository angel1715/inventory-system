"use client";

import { useState } from "react";
import { createProduct } from "@/lib/api";
import { useRouter } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import toast from "react-hot-toast";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: any) {
    try {
      setLoading(true);
      await createProduct(data);
      toast.success("Product created successfully");
      router.push("/products");
    } catch (e: any) {
      toast.error(e.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  }

  return (
    // 🔥 CORREGIDO: Cambiado de flex/items-center a p-6 con max-width limpio para formularios anchos
    <div className="min-h-screen bg-slate-100 p-6 md:p-12 flex justify-center">
      <div className="w-full max-w-4xl">
        <ProductForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
}
