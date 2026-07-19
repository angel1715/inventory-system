"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Receipt from "@/components/Receipt";
import EcfStatusCard from "@/components/EcfStatusCard";

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [data, setData] = useState<any>(null);
  const { loading: authLoading } = useAuth();
  const API = process.env.NEXT_PUBLIC_API_URL;

  function loadInvoice() {
    if (!id) return;
    fetch(`${API}/sales/${id}/invoice`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error(err));
  }

  useEffect(() => {
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, API]);

  if (authLoading || !data) {
    return (
      <div className="flex h-screen items-center justify-center">
        Cargando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center print:bg-white print:p-0">
      <EcfStatusCard sale={data} onUpdated={setData} />
      <div className="bg-white shadow-lg print:shadow-none">
        <Receipt sale={data} />
      </div>
    </div>
  );
}
