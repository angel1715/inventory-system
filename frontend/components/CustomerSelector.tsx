/// <reference types="react" />
"use client";

import { useEffect, useState } from "react";
// 🔥 Importamos la función nativa de tu API
import { getCustomers } from "@/lib/api";

interface Customer {
  id: string;
  name: string;
  taxId?: string | null;
  creditAccount?: {
    id: string;
    balance: number;
    creditLimit: number;
  };
}

interface CustomerSelectorProps {
  onSelectCustomer: (customerId: string, customer?: Customer) => void;
  selectedCustomerId: string;
}

export default function CustomerSelector({
  onSelectCustomer,
  selectedCustomerId,
}: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);

        // 🔥 Usamos tu llamada centralizada con token integrado
        const data = await getCustomers();

        // Validamos que data sea un arreglo
        setCustomers(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || "Hubo un problema al cargar los clientes");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  if (loading) {
    return (
      <p className="text-sm text-gray-500 animate-pulse">
        Cargando clientes...
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500">❌ {error}</p>;
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-semibold text-gray-700">
        Seleccionar Cliente <span className="text-red-500">*</span>
      </label>
      <select
        value={selectedCustomerId}
        onChange={(e) => {
          const customer = customers.find((c) => c.id === e.target.value);
          onSelectCustomer(e.target.value, customer);
        }}
        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 text-sm outline-none transition-all"
      >
        <option value="">-- Seleccione un cliente para el crédito --</option>
        {customers.map((customer) => {
          const balance = customer.creditAccount?.balance || 0;
          return (
            <option key={customer.id} value={customer.id}>
              {customer.name} (Balance: RD$ {balance.toFixed(2)})
            </option>
          );
        })}
      </select>
    </div>
  );
}
