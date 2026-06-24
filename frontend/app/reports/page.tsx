"use client";

import { useEffect, useMemo, useState } from "react";

import ProtectedRoute from "@/components/ProtectedRoute";

import { getSales } from "@/lib/api";

import * as XLSX from "xlsx";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Link from "next/link";

export default function ReportsPage() {
  const [sales, setSales] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    try {
      setLoading(true);

      const response = await getSales();
      setSales(response.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // FILTERED SALES

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const saleDate = new Date(sale.createdAt);

      if (from && saleDate < new Date(from)) {
        return false;
      }

      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59);

        if (saleDate > end) {
          return false;
        }
      }

      return true;
    });
  }, [sales, from, to]);

  // KPIs

  const totalRevenue = filteredSales.reduce(
    (acc, sale) => acc + Number(sale.total),
    0,
  );

  const totalOrders = filteredSales.length;

  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // EXPORT EXCEL

  function exportExcel() {
    const data = filteredSales.map((sale) => ({
      Invoice: sale.invoiceNumber,
      Date: new Date(sale.createdAt).toLocaleString(),
      Payment: sale.paymentMethod,
      Total: Number(sale.total),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");

    XLSX.writeFile(workbook, "sales-report.xlsx");
  }

  // EXPORT PDF

  function exportPDF() {
    const doc = new jsPDF();

    doc.setFontSize(18);

    doc.text("Sales Report", 14, 22);

    autoTable(doc, {
      startY: 30,

      head: [["Invoice", "Date", "Payment", "Total"]],

      body: filteredSales.map((sale) => [
        sale.invoiceNumber,

        new Date(sale.createdAt).toLocaleString(),

        sale.paymentMethod,

        `RD$${Number(sale.total).toFixed(2)}`,
      ]),
    });

    doc.save("sales-report.pdf");
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 p-6">
        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>

            <p className="text-gray-500">Analiticas de ventas y reportes</p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="
      bg-gray-900
      text-white
      px-5
      py-3
      rounded-2xl
      hover:opacity-90
      transition
    "
            >
              Dashboard
            </Link>

            <button
              onClick={exportExcel}
              className="
                bg-green-600
                text-white
                px-5
                py-3
                rounded-2xl
              "
            >
              Exportar a Excel
            </button>

            <button
              onClick={exportPDF}
              className="
                bg-black
                text-white
                px-5
                py-3
                rounded-2xl
              "
            >
              Exportar PDF
            </button>
          </div>
        </div>

        {/* FILTERS */}

        <div className="bg-white border rounded-3xl p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2 text-gray-600">Desde</label>

              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="
                  w-full
                  border
                  rounded-2xl
                  p-3
                  text-gray-700
                "
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-600">Hasta</label>

              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="
                  w-full
                  border
                  rounded-2xl
                  p-3
                  text-gray-700
                "
              />
            </div>
          </div>
        </div>

        {/* KPIs */}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border rounded-3xl p-6">
            <p className="text-gray-500 text-sm">Ingresos</p>

            <h3 className="text-gray-700 text-4xl font-bold mt-3">
              RD$
              {totalRevenue.toFixed(2)}
            </h3>
          </div>

          <div className="bg-white border rounded-3xl p-6">
            <p className="text-gray-500 text-sm">Ordenes</p>

            <h3 className="text-gray-700 text-4xl font-bold mt-3">
              {totalOrders}
            </h3>
          </div>

          <div className="bg-white border rounded-3xl p-6">
            <p className="text-gray-500 text-sm">Facturacion promedio</p>

            <h3 className="text-gray-700 text-4xl font-bold mt-3">
              RD$
              {averageTicket.toFixed(2)}
            </h3>
          </div>
        </div>

        {/* TABLE */}

        <div className="bg-white border rounded-3xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-center">Loading...</div>
          ) : filteredSales.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No sales found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-gray-700 text-left p-4">Invoice</th>

                    <th className="text-gray-700 text-left p-4">Fecha</th>

                    <th className="text-gray-700 text-left p-4">
                      Metodo de pago
                    </th>

                    <th className="text-gray-700 text-right p-4">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="border-b">
                      <td className="p-4 font-semibold text-gray-600">
                        {sale.invoiceNumber}
                      </td>

                      <td className="p-4 text-gray-600">
                        {new Date(sale.createdAt).toLocaleString()}
                      </td>

                      <td className="p-4 text-gray-600">
                        {sale.paymentMethod}
                      </td>

                      <td className="text-gray-600 p-4 text-right font-bold">
                        RD$
                        {Number(sale.total).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
