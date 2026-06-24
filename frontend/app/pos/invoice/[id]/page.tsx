"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation"; // 1. Importa useParams
import { useAuth } from "@/hooks/useAuth";
import Receipt from "@/components/Receipt";

// 2. Elimina { params } de las props
export default function InvoicePage() {
  const params = useParams<{ id: string }>(); // 3. Obtén el id desde aquí
  const id = params?.id;

  const [data, setData] = useState<any>(null);
  const { loading: authLoading } = useAuth();
  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (!id) return; // 4. Valida que el ID exista

    fetch(`${API}/sales/${id}/invoice`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error(err));
  }, [id, API]); // 5. Usa 'id' en el array de dependencias

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
