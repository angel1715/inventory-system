"use client";

import { useEffect, useState } from "react";
import { getCashSummary, closeCash } from "@/lib/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function CloseCashPage() {
  const [summary, setSummary] = useState<any>(null);
  const [actualCash, setActualCash] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetchSummary();
  }, []);

  async function fetchSummary() {
    const data = await getCashSummary();
    setSummary(data);
  }

  async function handleClose() {
    if (!actualCash) return alert("Enter actual cash");

    try {
      setLoading(true);
      const confirmed = confirm("Cerrar caja?");
      if (!confirmed) return;
      const result = await closeCash(Number(actualCash));

      toast.success(
        `Cash Closed

Expected: RD$${Number(result.expectedCash).toFixed(2)}

Actual: RD$${Number(result.actualCash).toFixed(2)}

Difference: RD$${Number(result.difference).toFixed(2)}`,
      );

      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!summary) {
    return <div className="p-10 text-center">No open session</div>;
  }

  const difference = Number(actualCash || 0) - summary.expectedCash;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-10 rounded-3xl w-[500px]">
        <h1 className="text-2xl font-bold mb-6 text-center">Close Cash</h1>

        <p>Expected: ${summary.expectedCash.toFixed(2)}</p>

        <input
          type="number"
          value={actualCash}
          onChange={(e) => setActualCash(e.target.value)}
          className="w-full p-3 border my-4"
        />

        <p
          className={`font-bold mt-2 ${
            difference < 0 ? "text-red-600" : "text-green-600"
          }`}
        >
          Difference: RD$
          {difference.toFixed(2)}
        </p>

        <button
          onClick={handleClose}
          className="w-full bg-black text-white p-3 mt-4
          bg-black
    text-white
    disabled:opacity-50
    disabled:cursor-not-allowed
          "
        >
          Close Cash
        </button>
      </div>
    </div>
  );
}
