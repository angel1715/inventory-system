"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Receipt from "@/components/Receipt";

export default function InvoicePage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const { loading: authLoading } = useAuth();
  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    fetch(`${API}/sales/${params.id}/invoice`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error(err));
  }, [params.id, API]);

  if (authLoading || !data) {
    return (
      <div className="flex h-screen items-center justify-center">
        Cargando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex justify-center print:bg-white print:p-0">
      <div className="bg-white shadow-lg print:shadow-none">
        <Receipt sale={data} />
      </div>
    </div>
  );
}
