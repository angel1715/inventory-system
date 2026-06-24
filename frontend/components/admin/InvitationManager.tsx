"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
// Importamos las nuevas funciones del API
import { generateInvitation, getInvitations } from "@/lib/api";

export default function InvitationManager() {
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      // Usamos la función centralizada
      const data = await getInvitations();
      setInvites(data);
    } catch (error) {
      console.error("Error al obtener invitaciones:", error);
    }
  };

  const generate = async () => {
    setLoading(true);
    try {
      // Usamos la función centralizada
      const data = await generateInvitation();

      const link = `${window.location.origin}/register?token=${data.token}`;
      await navigator.clipboard.writeText(link);
      toast.success("¡Link copiado al portapapeles!");
      fetchInvitations(); // Refrescar lista
    } catch (e: any) {
      toast.error(e.message || "Error al generar invitación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md border border-gray-200 mt-6">
      <h2 className="text-xl font-bold mb-4">Administrador de Invitaciones</h2>
      <button
        onClick={generate}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded-lg disabled:opacity-50"
      >
        {loading ? "Generando..." : "Generar nueva invitación"}
      </button>

      <div className="mt-4">
        {invites.map((inv) => (
          <div
            key={inv.id}
            className="flex justify-between p-2 border-b text-sm"
          >
            <span>{inv.token.substring(0, 10)}...</span>
            <span className={inv.used ? "text-red-500" : "text-green-500"}>
              {inv.used ? "Usada" : "Disponible"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
