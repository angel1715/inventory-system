"use client";

import { useEffect, useState, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getSales, getSalesExport } from "@/lib/api";
import toast from "react-hot-toast";
import SaleDetailModal from "@/components/sales/SaleDetailModal";
import Link from "next/link";
import { jsPDF } from "jspdf";
import "jspdf-autotable"; // Esto registra el plugin automáticamente
import * as XLSX from "xlsx";

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getSales(
        page,
        10,
        search,
        paymentFilter,
        dateFilter,
      );
      setSales(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
    } catch (err: any) {
      toast.error("Error al cargar ventas");
    } finally {
      setLoading(false);
    }
  }, [page, search, paymentFilter, dateFilter]);

  useEffect(() => {
    const timer = setTimeout(loadSales, 500);
    return () => clearTimeout(timer);
  }, [loadSales]);

  // Función de ayuda para colores
  const getMethodColor = (method: string) => {
    switch (method) {
      case "CREDIT":
        return "bg-red-100 text-red-700";
      case "CASH":
        return "bg-green-100 text-green-700";
      case "CARD":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const exportData = async () => {
    try {
      // Cambia dateRange por dateFilter
      const allSales = await getSalesExport(paymentFilter, dateFilter);
      return allSales;
    } catch (error) {
      toast.error("Error al obtener datos para exportar");
      return [];
    }
  };

  // =========================
  // FUNCIONES DE EXPORTACIÓN
  // =========================
  const exportToExcel = async () => {
    const allSales = await exportData(); // Obtenemos TODOS
    const worksheet = XLSX.utils.json_to_sheet(
      allSales.map((s: any) => ({
        Invoice: s.invoiceNumber,
        Empleado: s.createdBy?.name || "N/A",
        Metodo: s.paymentMethod,
        Total: s.total,
        Fecha: new Date(s.createdAt).toLocaleDateString(),
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");
    XLSX.writeFile(workbook, "Reporte_Ventas_Completo.xlsx");
  };

  const exportToPDF = async () => {
    toast.loading("Generando PDF..."); // Muestra un indicador
    
    const allSales = await exportData();
    
    if (allSales.length === 0) {
        toast.dismiss(); // Quita el loading
        toast.error("No hay datos para exportar");
        return;
    }

    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF();
    doc.text("Reporte de Ventas - Historial Completo", 14, 15);

    autoTable(doc, {
      startY: 20,
      head: [["Invoice", "Empleado", "Método", "Total"]],
      body: allSales.map((s: any) => [
        s.invoiceNumber,
        s.createdBy?.name || "N/A",
        s.paymentMethod,
        `RD$${Number(s.total || 0).toFixed(2)}`,
      ]),
    });

    doc.save("Reporte_Ventas_Completo.pdf");
    toast.dismiss(); // Quita el loading al terminar
    toast.success("PDF generado con éxito");
};
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-gray-700 text-3xl font-bold">
            Historial de ventas
          </h1>
          <div className="flex gap-2">
            <button
              onClick={exportToPDF}
              className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-medium"
            >
              Exportar PDF
            </button>
            <button
              onClick={exportToExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
            >
              Exportar Excel
            </button>
            <Link
              href="/dashboard"
              className="bg-gray-800 text-white px-5 py-3 rounded-2xl"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-3xl border p-4 mb-6 grid md:grid-cols-4 gap-4">
          <input
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Buscar..."
            className="text-gray-700 border rounded-2xl px-4 py-3"
          />
          <select
            value={paymentFilter}
            onChange={(e) => {
              setPage(1);
              setPaymentFilter(e.target.value);
            }}
            className="text-gray-700 border rounded-2xl px-4 py-3"
          >
            <option value="ALL">Todos los métodos</option>
            <option value="CASH">Efectivo</option>
            <option value="CARD">Tarjeta</option>
            <option value="TRANSFER">Transferencia</option>
            <option value="CREDIT">Crédito</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => {
              setPage(1);
              setDateFilter(e.target.value);
            }}
            className="text-gray-700 border rounded-2xl px-4 py-3"
          >
            <option value="ALL">Todo el tiempo</option>
            <option value="TODAY">Hoy</option>
            <option value="WEEK">Últimos 7 días</option>
            <option value="MONTH">Último mes</option>
          </select>
        </div>

        <div className="bg-white rounded-3xl border overflow-hidden">
          {loading ? (
            <div className="p-10 text-center">Cargando...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-gray-700 p-4 text-left">Invoice</th>
                  <th className="text-gray-700 p-4 text-left">Empleado</th>
                  <th className="text-gray-700 p-4 text-left">Método</th>
                  <th className="text-gray-700 p-4 text-right">Total</th>
                  <th className="text-gray-700 p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sales.length > 0 ? (
                  sales.map((sale) => (
                    <tr key={sale.id} className="border-b">
                      <td className="text-gray-700 p-4">
                        {sale.invoiceNumber}
                      </td>
                      <td className="text-gray-700 p-4">
                        {sale.createdBy?.name || "N/A"}
                      </td>
                      <td className="text-gray-700 p-4">
                        <span
                          className={`text-gray-700 px-3 py-1 rounded-full text-xs font-bold ${getMethodColor(sale.paymentMethod)}`}
                        >
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="text-gray-700 p-4 text-right">
                        RD${Number(sale.total).toFixed(2)}
                      </td>
                      <td className=" text-gray-700p-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedSale(sale);
                            setOpen(true);
                          }}
                          className="bg-black text-white px-4 py-2 rounded-xl"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-gray-500">
                      No se encontraron ventas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          <div className="p-4 flex justify-between items-center border-t">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="bg-black px-4 py-2 border rounded-xl"
            >
              Anterior
            </button>
            <span className="text-gray-700">
              Página {page} de {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="bg-black px-4 py-2 border rounded-xl"
            >
              Siguiente
            </button>
          </div>
        </div>

        <SaleDetailModal
          open={open}
          sale={selectedSale}
          onClose={() => setOpen(false)}
        />
      </div>
    </ProtectedRoute>
  );
}
