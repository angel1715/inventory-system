"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Truck, Trash2, Plus } from "lucide-react";

import SupplierForm from "@/components/suppliers/SupplierForm";

import { createSupplier, deleteSupplier, getSuppliers } from "@/lib/api";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      const data = await getSuppliers();

      setSuppliers(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(form: any) {
    try {
      setLoading(true);

      await createSupplier(form);

      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmDelete = confirm("Delete supplier?");

    if (!confirmDelete) return;

    try {
      await deleteSupplier(id);

      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Suppliers</h1>

          <p className="text-gray-600">Manage suppliers</p>
        </div>

        <Link
          href="/dashboard"
          className="bg-black text-white px-6 py-3 rounded-2xl"
        >
          Dashboard
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* FORM */}
        <div>
          <SupplierForm onSubmit={handleCreate} loading={loading} />
        </div>

        {/* TABLE */}
        <div className="lg:col-span-2">
          <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                Supplier List
              </h2>
            </div>

            <div className="divide-y">
              {suppliers.length === 0 && (
                <div className="p-10 text-center text-gray-400">
                  No suppliers found
                </div>
              )}

              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="p-6 flex justify-between items-center"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                      <Truck className="w-6 h-6 text-gray-700" />
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {supplier.name}
                      </h3>

                      <p className="text-sm text-gray-500">
                        {supplier.phone || "-"}
                      </p>

                      <p className="text-sm text-gray-500">
                        {supplier.email || "-"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="text-red-500 hover:bg-red-50 p-3 rounded-xl"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
