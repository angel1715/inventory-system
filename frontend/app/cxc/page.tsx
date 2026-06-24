"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  HandCoins,
  DollarSign,
  Users,
  ReceiptText,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import { getCustomers, recordPayment } from "@/lib/api";

type Customer = {
  id: string;
  name: string;
  phone?: string;
  taxId?: string;
  maxCredit: number;
  currentDebt: number;
  active: boolean;
};

export default function CxCPage() {
  const router = useRouter();
  const [debtors, setDebtors] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  async function loadCxC() {
    try {
      setLoading(true);
      const data = await getCustomers();
      if (Array.isArray(data)) {
        const activeDebtors = data.filter((c: Customer) => c.currentDebt > 0);
        activeDebtors.sort((a, b) => b.currentDebt - a.currentDebt);
        setDebtors(activeDebtors);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Error al cargar las cuentas por cobrar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCxC();
  }, []);

  const totalInTheStreet = debtors.reduce((acc, c) => acc + c.currentDebt, 0);
  const totalDebtorsCount = debtors.length;

  function handleOpenCobro(customer: Customer) {
    setSelectedCustomer(customer);
    setAmount("");
    setNote("Abono a cuenta de crédito");
    setOpenModal(true);
  }

  async function handleProcesarCobro() {
    if (!selectedCustomer || submitting) return;

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Por favor, ingresa un monto válido mayor a cero.");
      return;
    }

    if (parsedAmount > selectedCustomer.currentDebt) {
      toast.error(
        `El abono no puede exceder la deuda actual (RD$ ${selectedCustomer.currentDebt})`,
      );
      return;
    }

    try {
      setSubmitting(true);
      await recordPayment(selectedCustomer.id, {
        amount: parsedAmount,
        note: note.trim() || undefined,
      });

      toast.success(
        `🎉 Cobro de RD$ ${parsedAmount.toLocaleString()} procesado correctamente`,
      );
      setOpenModal(false);
      await loadCxC();
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Error al procesar el cobro");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProtectedRoute>
      {/* Restricción de acceso a nivel de página */}
      <RoleGuard roles={["OWNER", "ADMIN"]}>
        <div className="min-h-screen bg-gray-50 p-8 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Cuentas por Cobrar (CxC)
              </h1>
              <p className="text-gray-500 mt-1">
                Monitorea el dinero en la calle, maneja saldos pendientes y
                registra los cobros.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 transition px-5 py-3 rounded-2xl font-medium shadow-sm"
            >
              <ArrowLeft size={16} /> Dashboard
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl flex items-center gap-5">
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl">
                <DollarSign size={32} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Total en la Calle
                </p>
                <h3 className="text-3xl font-black text-gray-900 mt-1">
                  RD${" "}
                  {totalInTheStreet.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl flex items-center gap-5">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                <Users size={32} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Clientes con Deuda
                </p>
                <h3 className="text-3xl font-black text-gray-900 mt-1">
                  {totalDebtorsCount}{" "}
                  {totalDebtorsCount === 1 ? "Cliente" : "Clientes"}
                </h3>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800">
                Listado de Balances Pendientes
              </h2>
            </div>

            {loading ? (
              <div className="p-16 text-center text-gray-500 font-medium">
                Analizando estados de cuenta...
              </div>
            ) : debtors.length === 0 ? (
              <div className="p-16 text-center text-gray-500 font-medium">
                🎉 ¡Excelente! No hay cuentas pendientes.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/70 border-b border-gray-100">
                    <tr>
                      <th className="p-4 text-sm font-bold text-gray-500">
                        Cliente
                      </th>
                      <th className="p-4 text-sm font-bold text-gray-500">
                        Contacto
                      </th>
                      <th className="p-4 text-sm font-bold text-gray-500">
                        Límite
                      </th>
                      <th className="p-4 text-sm font-bold text-gray-500">
                        Deuda
                      </th>
                      <th className="p-4 text-sm font-bold text-gray-500 text-right">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {debtors.map((customer) => (
                      <tr
                        key={customer.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="p-4 font-bold text-gray-900">
                          {customer.name}
                        </td>
                        <td className="p-4 text-gray-600 text-sm">
                          {customer.phone || "—"}
                        </td>
                        <td className="p-4 text-gray-500 text-sm font-medium">
                          RD$ {customer.maxCredit.toLocaleString()}
                        </td>
                        <td className="p-4 text-red-600 font-bold">
                          RD$ {customer.currentDebt.toLocaleString()}
                        </td>
                        <td className="p-4 text-right">
                          {/* Restricción extra para ocultar el botón de acción */}
                          <RoleGuard roles={["OWNER", "ADMIN"]}>
                            <button
                              onClick={() => handleOpenCobro(customer)}
                              className="inline-flex items-center gap-1.5 bg-black text-white hover:bg-gray-900 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm active:scale-[0.97]"
                            >
                              <HandCoins size={14} /> Recibir Pago
                            </button>
                          </RoleGuard>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </RoleGuard>

      {/* Modal de cobro */}
      {openModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl mt-16 border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4 text-gray-900">
              <ReceiptText className="text-gray-500" size={28} />
              <h2 className="text-2xl font-bold">Registrar Cobro</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between">
                  <span>Monto a Pagar (RD$)</span>
                  <span className="text-red-600 font-bold">
                    Deuda actual: RD${" "}
                    {selectedCustomer.currentDebt.toLocaleString()}
                  </span>
                </label>
                <input
                  type="number"
                  placeholder={`Máx: ${selectedCustomer.currentDebt}`} // Opcional: añade un placeholder
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-2xl p-4 mt-1.5 text-gray-900 font-bold text-xl outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Nota / Concepto
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full border border-gray-200 rounded-2xl p-4 mt-1.5 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setOpenModal(false)}
                className="flex-1 bg-gray-100 p-4 rounded-2xl font-semibold text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleProcesarCobro}
                disabled={submitting}
                className="flex-1 bg-black text-white p-4 rounded-2xl font-bold"
              >
                {submitting ? "Procesando..." : "Aplicar Abono"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
