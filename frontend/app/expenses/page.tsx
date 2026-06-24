"use client";

import { useEffect, useState } from "react";

import { Trash2, Receipt } from "lucide-react";

import { createExpense, deleteExpense, getExpenses } from "@/lib/api";

import PageHeader from "@/components/PageHeader";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    amount: "",
    category: "OTHER",
  });

  async function load() {
    try {
      const data = await getExpenses();

      setExpenses(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit() {
    try {
      setLoading(true);

      await createExpense({
        ...form,
        amount: Number(form.amount),
      });

      setForm({
        title: "",
        description: "",
        amount: "",
        category: "OTHER",
      });

      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmDelete = confirm("Delete expense?");

    if (!confirmDelete) return;

    await deleteExpense(id);

    load();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* HEADER */}
      <PageHeader title="Expenses" subtitle="Business operational expenses" />
      <div className="grid lg:grid-cols-3 gap-8">
        {/* FORM */}
        <div className="bg-white border rounded-3xl p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">New Expense</h2>

          <div className="space-y-4">
            <input
              placeholder="Title"
              value={form.title}
              onChange={(e) =>
                setForm({
                  ...form,
                  title: e.target.value,
                })
              }
              className="w-full border rounded-2xl p-4 text-gray-800"
            />

            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
              className="w-full border rounded-2xl p-4 text-gray-800"
            />

            <input
              type="number"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) =>
                setForm({
                  ...form,
                  amount: e.target.value,
                })
              }
              className="w-full border rounded-2xl p-4 text-gray-800"
            />

            <select
              value={form.category}
              onChange={(e) =>
                setForm({
                  ...form,
                  category: e.target.value,
                })
              }
              className="w-full border rounded-2xl p-4 text-gray-800"
            >
              <option value="RENT">Rent</option>

              <option value="UTILITIES">Utilities</option>

              <option value="INTERNET">Internet</option>

              <option value="PAYROLL">Payroll</option>

              <option value="TRANSPORT">Transport</option>

              <option value="MARKETING">Marketing</option>

              <option value="OTHER">Other</option>
            </select>

            <button
              disabled={loading}
              onClick={handleSubmit}
              className="w-full bg-black text-white rounded-2xl py-4 font-semibold"
            >
              {loading ? "Saving..." : "Create Expense"}
            </button>
          </div>
        </div>

        {/* LIST */}
        <div className="lg:col-span-2">
          <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                Expense History
              </h2>
            </div>

            <div className="divide-y">
              {expenses.length === 0 && (
                <div className="p-10 text-center text-gray-400">
                  No expenses found
                </div>
              )}

              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="p-6 flex justify-between items-center"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-gray-700" />
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {expense.title}
                      </h3>

                      <p className="text-sm text-gray-500">
                        {expense.category}
                      </p>

                      <p className="text-xs text-gray-400">
                        {new Date(expense.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-bold text-lg text-red-500">
                      -RD$
                      {Number(expense.amount).toFixed(2)}
                    </span>

                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="text-red-500 hover:bg-red-50 p-3 rounded-xl"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
