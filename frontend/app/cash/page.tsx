"use client";

import { useEffect, useState } from "react";
import { openCash, getCashSession } from "@/lib/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function CashPage() {
  const [openingAmount, setOpeningAmount] = useState("");
  const [cashSession, setCashSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetchSession();
  }, []);

  async function fetchSession() {
    const session = await getCashSession();
    setCashSession(session);
  }

  // 🔥 Redirige si ya hay caja abierta
  useEffect(() => {
    if (cashSession) {
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    }
  }, [cashSession]);

  async function handleOpen() {
    if (!openingAmount || Number(openingAmount) < 0) {
      toast.error("Enter valid amount");
      return;
    }

    try {
      setLoading(true);

      await openCash(Number(openingAmount));

      toast.success("Cash register opened");

      await fetchSession();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-[420px]">
        <h1 className="text-gray-900 text-3xl font-bold mb-6 text-center">
          Cash Register
        </h1>

        {cashSession ? (
          <p className="text-center text-green-600 font-bold">
            Cash is already OPEN
          </p>
        ) : (
          <>
            <input
              type="number"
              placeholder="Opening amount"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              className="text-gray-700 w-full p-4 border rounded-xl mb-6"
            />

            <button
              onClick={handleOpen}
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-xl disabled:opacity-50 
              disabled:cursor-not-allowed
              "
            >
              {loading ? "Opening..." : "Open Cash"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
