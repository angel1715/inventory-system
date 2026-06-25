"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { generateInvitation, getInvitations } from "@/lib/api";
import { Copy, Check, Plus, RefreshCw } from "lucide-react";

export default function InvitationManager() {
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const data = await getInvitations();
      setInvites(data);
    } catch (error) {
      console.error("Error al obtener invitaciones:", error);
    }
  };

  const generate = async () => {
    setLoading(true);
    try {
      const data = await generateInvitation();
      const link = `${window.location.origin}/register?token=${data.token}`;
      await navigator.clipboard.writeText(link);
      toast.success("¡Link copiado al portapapeles!");
      fetchInvitations();
    } catch (e: any) {
      toast.error(e.message || "Error al generar invitación");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (token: string, id: string) => {
    const link = `${window.location.origin}/register?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success("Link copiado");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Invitaciones</h2>
          <p className="text-sm text-zinc-500">
            Gestiona los accesos de nuevos usuarios
          </p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="animate-spin" size={18} />
          ) : (
            <Plus size={18} />
          )}
          {loading ? "Generando..." : "Nueva Invitación"}
        </button>
      </div>

      <div className="space-y-3">
        {invites.length === 0 && (
          <p className="text-center text-zinc-400 py-4">
            No hay invitaciones generadas aún.
          </p>
        )}
        {invites.map((inv) => (
          <div
            key={inv.id}
            className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100"
          >
            <div className="flex items-center gap-4">
              <span className="font-mono text-sm bg-white px-3 py-1 rounded-lg border border-zinc-200 text-zinc-600">
                {inv.token.substring(0, 8)}...
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  inv.used
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {inv.used ? "Usada" : "Disponible"}
              </span>
            </div>

            {!inv.used && (
              <button
                onClick={() => copyToClipboard(inv.token, inv.id)}
                className="text-zinc-400 hover:text-black transition-colors"
                title="Copiar link"
              >
                {copiedId === inv.id ? (
                  <Check size={18} className="text-emerald-600" />
                ) : (
                  <Copy size={18} />
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
