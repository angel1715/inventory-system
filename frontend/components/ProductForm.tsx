"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { UploadCloud } from "lucide-react";
import { uploadImage } from "@/lib/upload";
import { getSuppliers } from "@/lib/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function ProductForm({ initialData, onSubmit, loading }: any) {
  const [form, setForm] = useState({
    name: initialData?.name || "",
    barcode: initialData?.barcode || "",
    costPrice: initialData?.costPrice || "",
    salePrice: initialData?.salePrice || "",
    stock: initialData?.stock || "",
    minStock: initialData?.minStock || 5,
    supplierId: initialData?.supplierId || "",
    category: initialData?.category || "OTHER", // 🔥 INTEGRACIÓN CATEGORÍA
    isSerialized: initialData?.isSerialized || false,
    hasExpiry: initialData?.hasExpiry || false,
  });

  const router = useRouter();

  const errors = {
    name: !form.name.trim(),
    costPrice: !form.costPrice || Number(form.costPrice) <= 0,
    salePrice:
      !form.salePrice || Number(form.salePrice) < Number(form.costPrice),
    stock: form.stock === "" || Number(form.stock) < 0,
    minStock: form.minStock === "" || Number(form.minStock) < 0,
  };

  const isValid =
    !errors.name &&
    !errors.costPrice &&
    !errors.salePrice &&
    !errors.stock &&
    !errors.minStock;

  const [preview, setPreview] = useState(initialData?.imageUrl || "");
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");
  const [uploading, setUploading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    async function loadSuppliers() {
      try {
        const data = await getSuppliers();
        setSuppliers(data);
      } catch (err: any) {
        console.error(err);
        toast.error("Failed loading suppliers");
      }
    }
    loadSuppliers();
  }, []);

  function handleChange(key: string, value: any) {
    setForm({
      ...form,
      [key]: value,
    });
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));

    try {
      setUploading(true);
      const uploadedUrl = await uploadImage(file);
      setImageUrl(uploadedUrl);
    } catch (err) {
      console.error(err);
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!isValid) return;

    await onSubmit({
      ...form,
      costPrice: Number(form.costPrice),
      salePrice: Number(form.salePrice),
      stock: Number(form.stock),
      minStock: Number(form.minStock),
      imageUrl,
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-8">
      {/* HEADER */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          {initialData ? "Edit Product" : "Create Product"}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage inventory product information
        </p>
      </div>

      {!isValid && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4">
          Please fix the highlighted fields before saving.
        </div>
      )}

      {/* FORM GRID */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* NAME */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Product Name
          </label>
          <input
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="iPhone 15 Pro Max"
            className={`w-full border rounded-2xl p-3 text-gray-800 outline-none focus:ring-2 ${
              errors.name
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-200 focus:ring-black"
            }`}
          />
        </div>

        {/* BARCODE */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Barcode
          </label>
          <input
            value={form.barcode}
            onChange={(e) => handleChange("barcode", e.target.value)}
            placeholder="123456789"
            className="w-full border border-gray-200 rounded-2xl p-3 text-gray-800 outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* SUPPLIER */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Supplier
          </label>
          <select
            value={form.supplierId}
            onChange={(e) => handleChange("supplierId", e.target.value)}
            className="w-full border border-gray-200 rounded-2xl p-3 text-gray-800 outline-none focus:ring-2 focus:ring-black bg-white"
          >
            <option value="">Select supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        {/* CATEGORY - 🔥 NUEVA INTEGRACIÓN */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Category
          </label>
          <select
            value={form.category}
            onChange={(e) => handleChange("category", e.target.value)}
            className="w-full border border-gray-200 rounded-2xl p-3 text-gray-800 outline-none focus:ring-2 focus:ring-black bg-white"
          >
            <option value="SPARE_PART">Repuesto</option>
            <option value="ACCESSORY">Accesorio</option>
            <option value="DEVICE">Dispositivo</option>
            <option value="SERVICE">Servicio</option>
            <option value="OTHER">Otro</option>
          </select>
        </div>

        {/* COST PRICE */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Cost Price (RD$)
          </label>
          <input
            type="number"
            value={form.costPrice}
            onChange={(e) => handleChange("costPrice", e.target.value)}
            className="w-full border border-gray-200 rounded-2xl p-3 text-gray-800 outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* SALE PRICE */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Sale Price (RD$)
          </label>
          <input
            type="number"
            value={form.salePrice}
            onChange={(e) => handleChange("salePrice", e.target.value)}
            className="w-full border border-gray-200 rounded-2xl p-3 text-gray-800 outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* STOCK */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Initial Stock
          </label>
          <input
            type="number"
            value={form.stock}
            onChange={(e) => handleChange("stock", e.target.value)}
            className="w-full border border-gray-200 rounded-2xl p-3 text-gray-800 outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* MIN STOCK */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Minimum Stock
          </label>
          <input
            type="number"
            value={form.minStock}
            onChange={(e) => handleChange("minStock", e.target.value)}
            className="w-full border border-gray-200 rounded-2xl p-3 text-gray-800 outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      {/* TOGGLES CONFIGURACIÓN AVANZADA */}
      <div className="mt-6 pt-6 border-t border-gray-100 grid md:grid-cols-2 gap-6">
        <div className="flex items-center justify-between p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
          <div>
            <label className="block text-sm font-semibold text-purple-950">
              Maneja Números de Serie / IMEI
            </label>
          </div>
          <button
            type="button"
            onClick={() => handleChange("isSerialized", !form.isSerialized)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition ${form.isSerialized ? "bg-purple-600" : "bg-gray-300"}`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${form.isSerialized ? "translate-x-6" : "translate-x-0"}`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
          <div>
            <label className="block text-sm font-semibold text-amber-950">
              Maneja Lote y Vencimiento
            </label>
          </div>
          <button
            type="button"
            onClick={() => handleChange("hasExpiry", !form.hasExpiry)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition ${form.hasExpiry ? "bg-amber-600" : "bg-gray-300"}`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${form.hasExpiry ? "translate-x-6" : "translate-x-0"}`}
            />
          </button>
        </div>
      </div>

      {/* IMAGE UPLOAD */}
      <div className="mt-8">
        <label className="block text-sm font-medium mb-3 text-gray-700">
          Product Image
        </label>
        <label className="border-2 border-dashed border-gray-300 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-black transition bg-gray-50">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          <UploadCloud className="w-10 h-10 text-gray-400 mb-3" />
          <p className="font-semibold text-gray-700">Click to upload image</p>
        </label>
        {preview && (
          <Image
            src={preview}
            alt="preview"
            width={180}
            height={180}
            className="mt-6 rounded-3xl object-cover border shadow-sm"
          />
        )}
      </div>

      {/* ACTIONS */}
      <div className="mt-8 flex gap-4">
        <button
          type="button"
          onClick={() => router.push("/products")}
          className="flex-1 border border-gray-300 bg-red-500 py-4 rounded-2xl font-semibold hover:bg-red-400 transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || uploading || !isValid}
          className="flex-1 bg-black text-white py-4 rounded-2xl font-semibold hover:opacity-80 transition"
        >
          {loading || uploading ? "Saving..." : "Save Product"}
        </button>
      </div>
    </div>
  );
}
