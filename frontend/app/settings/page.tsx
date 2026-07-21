"use client";

import {
  getSettings,
  updateSettings,
  getSequences,
  activateSequence,
  testEcfConnection,
  getEcfTaxes,
} from "@/lib/api";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ProtectedRoute from "@/components/ProtectedRoute";
import NewSequenceModal from "@/components/NewSequenceModal";
import { uploadImage } from "@/lib/uploadImage";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [sequences, setSequences] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSequence, setEditingSequence] = useState<any>(null);
  const [ecfTesting, setEcfTesting] = useState(false);
  const [ecfConnection, setEcfConnection] = useState<{ client_name?: string; state?: string } | null>(null);
  const [ecfTaxes, setEcfTaxes] = useState<{ id: number; name: string; amount: number }[]>([]);

  const [form, setForm] = useState({
    businessName: "",
    tradeName: "",
    rnc: "",
    phone: "",
    email: "",
    website: "",
    instagram: "",
    facebook: "",
    address: "",
    city: "",
    country: "",
    logoUrl: "",
    taxRate: 18,
    currency: "DOP",
    invoiceFooter: "",
    useItbis: false,
    useNcf: false,
    ecfEnabled: false,
    ecfApiKey: "",
    ecfBaseUrl: "",
    ecfTaxId: null as number | null,
  });

  async function load() {
    try {
      const data = await getSettings();
      setForm({
        businessName: data.businessName || "",
        tradeName: data.tradeName || "",
        rnc: data.rnc || "",
        phone: data.phone || "",
        email: data.email || "",
        website: data.website || "",
        instagram: data.instagram || "",
        facebook: data.facebook || "",
        address: data.address || "",
        city: data.city || "",
        country: data.country || "",
        logoUrl: data.logoUrl || "",
        taxRate: data.taxRate ?? 18,
        currency: data.currency || "DOP",
        invoiceFooter: data.invoiceFooter || "",
        useItbis: data.useItbis ?? false,
        useNcf: data.useNcf ?? false,
        ecfEnabled: data.ecfEnabled ?? false,
        ecfApiKey: data.ecfApiKey || "",
        ecfBaseUrl: data.ecfBaseUrl || "",
        ecfTaxId: data.ecfTaxId ?? null,
      });
    } catch (err: any) {
      toast.error("Error al cargar la configuración");
    }
  }

  async function handleTestEcfConnection() {
    try {
      setEcfTesting(true);
      setEcfConnection(null);
      const result = await testEcfConnection();
      setEcfConnection(result);
      toast.success(`Conectado: ${result.client_name} (${result.state})`);

      const taxes = await getEcfTaxes();
      setEcfTaxes(taxes || []);
    } catch (err: any) {
      toast.error(err.message || "No se pudo conectar con el conector e-CF");
    } finally {
      setEcfTesting(false);
    }
  }

  async function loadSequences() {
    try {
      const data = await getSequences();
      setSequences(data);
    } catch (err) {
      toast.error("Error al cargar las secuencias fiscales");
    }
  }

  useEffect(() => {
    load();
    loadSequences();
  }, []);

  const handleChange = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  async function handleActivate(id: string) {
    try {
      setLoading(true);
      await activateSequence(id);
      toast.success("Secuencia activada correctamente");
      await loadSequences();
    } catch (err: any) {
      toast.error(err.message || "No se pudo activar la secuencia");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    // Validaciones de Integridad
    if (form.useItbis) {
      if (form.taxRate <= 0) {
        return toast.error("Debe especificar el porcentaje del ITBIS.");
      }
    }

    if (!form.businessName.trim()) {
      return toast.error("El nombre de la empresa es obligatorio");
    }

    if (form.useItbis) {
      if (form.taxRate < 0 || form.taxRate > 100) {
        return toast.error("El ITBIS debe estar entre 0 y 100");
      }
    }

    try {
      setLoading(true);
      await updateSettings(form);
      toast.success("Configuración guardada correctamente");
      await load(); // Sincronizar estado con el servidor
    } catch (err: any) {
      toast.error(err.message || "Error al guardar la configuración");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* BLOQUE 1: CONFIGURACIÓN */}
          <div className="bg-white rounded-3xl border p-8 shadow-sm">
            <div className="mb-10">
              <h1 className="text-3xl font-bold text-gray-900">
                Business Settings
              </h1>
              <p className="text-gray-500 mt-2">
                Configura la información de tu empresa, impuestos y facturación
              </p>
            </div>

            {form.logoUrl && (
              <div className="mb-8 flex justify-center">
                <img
                  src={form.logoUrl}
                  alt="Logo"
                  className="w-32 h-32 object-cover rounded-2xl border shadow-sm"
                />
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-5">
              <input
                value={form.businessName}
                onChange={(e) => handleChange("businessName", e.target.value)}
                placeholder="Business Name *"
                className="text-gray-700 w-full border rounded-2xl p-4 outline-none focus:ring-2 focus:ring-black"
              />
              <input
                value={form.tradeName}
                onChange={(e) => handleChange("tradeName", e.target.value)}
                placeholder="Trade Name"
                className="text-gray-700 w-full border rounded-2xl p-4 outline-none focus:ring-2 focus:ring-black"
              />
              <input
                value={form.rnc}
                onChange={(e) => handleChange("rnc", e.target.value)}
                placeholder="RNC / Tax ID"
                className="text-gray-700 w-full border rounded-2xl p-4 outline-none focus:ring-2 focus:ring-black"
              />
              <input
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="Phone"
                className="text-gray-700 w-full border rounded-2xl p-4 outline-none focus:ring-2 focus:ring-black"
              />
              <input
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="Email"
                className="text-gray-700 w-full border rounded-2xl p-4 outline-none focus:ring-2 focus:ring-black"
              />
              <input
                value={form.website}
                onChange={(e) => handleChange("website", e.target.value)}
                placeholder="Website"
                className="text-gray-700 w-full border rounded-2xl p-4 outline-none focus:ring-2 focus:ring-black"
              />
              <input
                value={form.instagram}
                onChange={(e) => handleChange("instagram", e.target.value)}
                placeholder="Instagram"
                className="text-gray-700 w-full border rounded-2xl p-4 outline-none focus:ring-2 focus:ring-black"
              />
              <input
                value={form.facebook}
                onChange={(e) => handleChange("facebook", e.target.value)}
                placeholder="Facebook"
                className="text-gray-700 w-full border rounded-2xl p-4 outline-none focus:ring-2 focus:ring-black"
              />
              <input
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Address"
                className="text-gray-700 md:col-span-2 w-full border rounded-2xl p-4 outline-none focus:ring-2 focus:ring-black"
              />
              <input
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="City"
                className="text-gray-700 w-full border rounded-2xl p-4 outline-none focus:ring-2 focus:ring-black"
              />
              <input
                value={form.country}
                onChange={(e) => handleChange("country", e.target.value)}
                placeholder="Country"
                className="text-gray-700 w-full border rounded-2xl p-4 outline-none focus:ring-2 focus:ring-black"
              />

              <div className="md:col-span-2">
                <label className="block mb-2 font-medium text-gray-700">
                  Business Logo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    try {
                      setLoading(true);

                      // 1. Subimos a Cloudinary (ya no toca tu backend, por eso no da 401)
                      const imageUrl = await uploadImage(file);

                      // 2. Guardamos la URL en tu estado local
                      handleChange("logoUrl", imageUrl);

                      toast.success("Logo subido a la nube correctamente");
                    } catch (err: any) {
                      console.error(err);
                      toast.error("Error al subir el logo");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="text-gray-700 w-full border rounded-2xl p-4"
                />
              </div>
              {form.useItbis && (
                <div className="md:col-span-2">
                  <label className="block mb-2 font-medium text-gray-700">
                    ITBIS
                  </label>

                  <input
                    type="number"
                    value={form.taxRate}
                    onChange={(e) =>
                      handleChange("taxRate", Number(e.target.value))
                    }
                    placeholder="ITBIS / Tax Rate (%)"
                    className="text-gray-700 w-full border rounded-2xl p-4 outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              )}

              <div className="md:col-span-2 flex items-center justify-between border rounded-2xl p-4">
                <div>
                  <h3 className="font-semibold text-gray-800">Utilizar NCF</h3>

                  <p className="text-sm text-gray-500">
                    Activa esta opción si tu negocio utiliza comprobantes
                    fiscales.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={form.useNcf}
                  onChange={(e) => handleChange("useNcf", e.target.checked)}
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-between border rounded-2xl p-4">
                <div>
                  <h3 className="font-semibold text-gray-800">
                    Utilizar ITBIS
                  </h3>

                  <p className="text-sm text-gray-500">
                    Activa esta opción si tu negocio cobra impuestos.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={form.useItbis}
                  onChange={(e) => handleChange("useItbis", e.target.checked)}
                />
              </div>

              <select
                value={form.currency}
                onChange={(e) => handleChange("currency", e.target.value)}
                className="text-gray-700 w-full border rounded-2xl p-4 outline-none focus:ring-2 focus:ring-black"
              >
                <option value="DOP">🇩🇴 Dominican Peso (DOP)</option>
                <option value="USD">🇺🇸 US Dollar (USD)</option>
                <option value="EUR">🇪🇺 Euro (EUR)</option>
              </select>
              <textarea
                value={form.invoiceFooter}
                onChange={(e) => handleChange("invoiceFooter", e.target.value)}
                placeholder="Gracias por su compra"
                className="text-gray-700 md:col-span-2 w-full border rounded-2xl p-4 h-32 outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="mt-10">
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-black text-white py-4 rounded-2xl font-semibold disabled:opacity-50"
              >
                {loading ? "Guardando..." : "Guardar Configuración"}
              </button>
            </div>
          </div>

          {/* BLOQUE 1.5: FACTURACIÓN ELECTRÓNICA (e-CF / DGII) */}
          {form.useNcf && (
            <div className="bg-white rounded-3xl border p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Facturación Electrónica (e-CF)
                </h2>
                <p className="text-gray-500 mt-2">
                  Conecta con el conector e-CF de RutiversoTech para firmar y
                  enviar tus comprobantes fiscales electrónicos a la DGII.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="md:col-span-2 flex items-center justify-between border rounded-2xl p-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      Activar conector e-CF
                    </h3>
                    <p className="text-sm text-gray-500">
                      Cuando está activo, las ventas con NCF electrónico (serie
                      E) se envían automáticamente a la DGII.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.ecfEnabled}
                    onChange={(e) => handleChange("ecfEnabled", e.target.checked)}
                  />
                </div>

                <input
                  value={form.ecfBaseUrl}
                  onChange={(e) => handleChange("ecfBaseUrl", e.target.value)}
                  placeholder="URL del conector (ej: https://tuconector.rutiversotech.com)"
                  className="text-gray-700 md:col-span-2 w-full border rounded-2xl p-4 outline-none focus:ring-2 focus:ring-black"
                />
                <input
                  type="password"
                  value={form.ecfApiKey}
                  onChange={(e) => handleChange("ecfApiKey", e.target.value)}
                  placeholder="API Key (ECF-...)"
                  className="text-gray-700 md:col-span-2 w-full border rounded-2xl p-4 outline-none focus:ring-2 focus:ring-black"
                />

                <div className="md:col-span-2 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleTestEcfConnection}
                    disabled={ecfTesting || !form.ecfApiKey || !form.ecfBaseUrl}
                    className="px-4 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {ecfTesting ? "Probando..." : "Probar conexión"}
                  </button>
                  {ecfConnection && (
                    <span className="text-sm text-gray-600">
                      {ecfConnection.client_name} — estado: {ecfConnection.state}
                    </span>
                  )}
                </div>

                {ecfTaxes.length > 0 && (
                  <div className="md:col-span-2">
                    <label className="block mb-2 font-medium text-gray-700">
                      Impuesto ITBIS (conector)
                    </label>
                    <select
                      value={form.ecfTaxId ?? ""}
                      onChange={(e) =>
                        handleChange(
                          "ecfTaxId",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      className="text-gray-700 w-full border rounded-2xl p-4 outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="">Selecciona el impuesto...</option>
                      {ecfTaxes.map((tax) => (
                        <option key={tax.id} value={tax.id}>
                          {tax.name} ({tax.amount}%)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BLOQUE 2: SECUENCIAS FISCALES */}
          {form.useNcf && (
            <div className="bg-white rounded-3xl border p-8 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Secuencias Fiscales (NCF)
                </h2>

                <button
                  onClick={() => {
                    setEditingSequence(null);
                    setIsModalOpen(true);
                  }}
                  className="bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800"
                >
                  + Nueva Secuencia
                </button>
              </div>

              <div className="space-y-4">
                {sequences.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No hay secuencias configuradas aún.
                  </p>
                ) : (
                  sequences.map((seq) => (
                    <div
                      key={seq.id}
                      className="flex items-center justify-between p-5 border rounded-2xl hover:bg-gray-50 transition"
                    >
                      <div>
                        <p className="font-bold text-lg">
                          {seq.type} - {seq.prefix}
                        </p>

                        <p className="text-sm text-gray-500 mt-1">
                          Rango: {seq.startAt} - {seq.endAt} | Actual:{" "}
                          {seq.current}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <span
                          className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                            seq.active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {seq.active ? "Activa" : "Inactiva"}
                        </span>

                        {!seq.active && (
                          <button
                            onClick={() => handleActivate(seq.id)}
                            disabled={loading}
                            className="text-black font-semibold underline hover:text-gray-700 disabled:opacity-50"
                          >
                            Activar
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setEditingSequence(seq);
                            setIsModalOpen(true);
                          }}
                          disabled={loading}
                          className="text-blue-600 font-semibold underline hover:text-blue-800 disabled:opacity-50"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <NewSequenceModal
          isOpen={isModalOpen}
          sequence={editingSequence}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSequence(null);
          }}
          onCreated={() => {
            loadSequences();
            setIsModalOpen(false);
            setEditingSequence(null);
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
