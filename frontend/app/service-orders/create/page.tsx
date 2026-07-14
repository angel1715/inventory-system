"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  ClipboardPlus,
  User,
  Smartphone,
  Wrench,
} from "lucide-react";

import toast from "react-hot-toast";

import { createServiceOrder, getCustomers, getUsers } from "@/lib/api";

interface Customer {
  id: string;
  name: string;
}

interface Technician {
  id: string;
  name: string;
  active: boolean;
}

const DEVICE_TYPES = [
  { value: "PHONE", label: "📱 Celular" },
  { value: "LAPTOP", label: "💻 Laptop" },
  { value: "TABLET", label: "📟 Tablet" },
  { value: "PC", label: "🖥️ Computadora" },
  { value: "PRINTER", label: "🖨️ Impresora" },
  { value: "TV", label: "📺 Televisor" },
  { value: "CONSOLE", label: "🎮 Consola" },
  { value: "OTHER", label: "📦 Otro" },
];

const ACCESSORIES = [
  "Cargador", "Cable USB", "Caja", "Funda", "Protector",
  "SIM", "Memoria SD", "Adaptador", "Mouse", "Teclado",
];

export default function CreateServiceOrderPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const [form, setForm] = useState({
    customerId: "",
    technicianId: "",
    deviceType: "PHONE",
    deviceBrand: "",
    deviceModel: "",
    serialOrImei: "",
    color: "",
    password: "",
    batteryLevel: "",
    hasSim: false,
    hasMemoryCard: false,
    deviceTurnsOn: false,
    hasWaterDamage: false,
    accessories: [] as string[],
    cosmeticCondition: "",
    problem: "",
    observations: "",
    estimatedDelivery: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [customersData, usersData] = await Promise.all([
          getCustomers(),
          getUsers(),
        ]);
        setCustomers(customersData);
        setTechnicians(usersData.filter((u: Technician) => u.active));
      } catch {
        toast.error("No fue posible cargar la información.");
      }
    }
    loadData();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleAccessory = (accessory: string) => {
    setForm((prev) => ({
      ...prev,
      accessories: prev.accessories.includes(accessory)
        ? prev.accessories.filter((a) => a !== accessory)
        : [...prev.accessories, accessory],
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setLoading(true);

      const payload = {
        customerId: form.customerId,
        technicianId: form.technicianId || undefined,
        deviceType: form.deviceType,
        deviceBrand: form.deviceBrand.trim(),
        deviceModel: form.deviceModel.trim(),
        serialOrImei: form.serialOrImei.trim() || undefined,
        color: form.color.trim() || undefined,
        password: form.password.trim() || undefined,
        accessories: form.accessories.length > 0 ? form.accessories : undefined,
        cosmeticCondition: form.cosmeticCondition.trim() || undefined,
        batteryLevel: form.batteryLevel === "" ? undefined : Number(form.batteryLevel),
        hasSim: form.hasSim,
        hasMemoryCard: form.hasMemoryCard,
        deviceTurnsOn: form.deviceTurnsOn,
        hasWaterDamage: form.hasWaterDamage,
        problem: form.problem.trim(),
        observations: form.observations.trim() || undefined,
        estimatedDelivery: form.estimatedDelivery || undefined,
      };

      await createServiceOrder(payload);
      toast.success("Orden creada correctamente");
      router.push("/service-orders");
    } catch (error: any) {
      toast.error(error?.message ?? "No fue posible crear la orden.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-slate-100 pb-12">
      <div className="max-w-7xl mx-auto px-4 pt-8 space-y-8">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="h-12 w-12 rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50 transition flex items-center justify-center text-zinc-600 hover:text-zinc-900"
            >
              <ArrowLeft size={22} />
            </button>

            <div>
              <h1 className="text-4xl font-semibold text-zinc-900 tracking-tight flex items-center gap-3">
                <ClipboardPlus className="text-blue-600" />
                Nueva Orden de Servicio
              </h1>
              <p className="text-zinc-500 mt-1 text-lg">
                Registra un nuevo equipo para reparación
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* CLIENTE */}
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 p-6 flex items-center gap-3 bg-zinc-50">
              <User className="text-blue-600" />
              <h2 className="font-semibold text-xl text-zinc-900">Información del Cliente</h2>
            </div>
            <div className="p-6 grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Cliente <span className="text-red-500">*</span>
                </label>
                <select
                  name="customerId"
                  value={form.customerId}
                  onChange={handleChange}
                  className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-4 text-zinc-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  required
                >
                  <option value="">Seleccione un cliente</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Técnico asignado
                </label>
                <select
                  name="technicianId"
                  value={form.technicianId}
                  onChange={handleChange}
                  className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-4 text-zinc-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  <option value="">Sin asignar</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* EQUIPO */}
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 p-6 flex items-center gap-3 bg-zinc-50">
              <Smartphone className="text-green-600" />
              <h2 className="font-semibold text-xl text-zinc-900">Información del Equipo</h2>
            </div>
            <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* ... todos los inputs con el nuevo estilo ... */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Tipo de dispositivo</label>
                <select
                  name="deviceType"
                  value={form.deviceType}
                  onChange={handleChange}
                  className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-4 text-zinc-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  {DEVICE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Marca <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  name="deviceBrand"
                  value={form.deviceBrand}
                  onChange={handleChange}
                  placeholder="Samsung"
                  className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-4 text-zinc-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Modelo <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  name="deviceModel"
                  value={form.deviceModel}
                  onChange={handleChange}
                  placeholder="Galaxy S24 Ultra"
                  className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-4 text-zinc-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">IMEI / Serial</label>
                <input
                  name="serialOrImei"
                  value={form.serialOrImei}
                  onChange={handleChange}
                  placeholder="3568XXXXXXXX"
                  className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-4 text-zinc-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Color</label>
                <input
                  name="color"
                  value={form.color}
                  onChange={handleChange}
                  placeholder="Negro"
                  className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-4 text-zinc-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Contraseña</label>
                <input
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-4 text-zinc-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Nivel batería (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  name="batteryLevel"
                  value={form.batteryLevel}
                  onChange={handleChange}
                  className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-4 text-zinc-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          {/* CHECKLIST */}
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 p-6 flex items-center gap-3 bg-zinc-50">
              <Wrench className="text-orange-600" />
              <h2 className="font-semibold text-xl text-zinc-900">Estado de Recepción</h2>
            </div>
            <div className="p-6 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: "hasSim", label: "Tiene SIM" },
                { name: "hasMemoryCard", label: "Tiene memoria SD" },
                { name: "deviceTurnsOn", label: "Enciende" },
                { name: "hasWaterDamage", label: "Daño por humedad" },
              ].map((item) => (
                <label key={item.name} className="flex items-center gap-3 cursor-pointer text-zinc-700">
                  <input
                    type="checkbox"
                    name={item.name}
                    checked={form[item.name as keyof typeof form] as boolean}
                    onChange={handleChange}
                    className="w-5 h-5 accent-blue-600"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          {/* ACCESORIOS */}
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 p-6 bg-zinc-50">
              <h2 className="text-xl font-semibold text-zinc-900">Accesorios Recibidos</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Selecciona todo lo que entrega el cliente
              </p>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {ACCESSORIES.map((item) => (
                <label
                  key={item}
                  onClick={() => toggleAccessory(item)}
                  className={`cursor-pointer rounded-2xl border p-4 text-center font-medium transition-all ${
                    form.accessories.includes(item)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-700"
                  }`}
                >
                  {item}
                </label>
              ))}
            </div>
          </div>

          {/* ESTADO FÍSICO, PROBLEMA, OBSERVACIONES, ENTREGA */}
          {["cosmeticCondition", "problem", "observations"].map((field) => (
            <div key={field} className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
              <div className="border-b border-zinc-100 p-6 bg-zinc-50">
                <h2 className="text-xl font-semibold text-zinc-900">
                  {field === "cosmeticCondition" && "Estado Físico"}
                  {field === "problem" && "Problema Reportado"}
                  {field === "observations" && "Observaciones"}
                  {field === "problem" && <span className="text-red-500">*</span>}
                </h2>
              </div>
              <div className="p-6">
                <textarea
                  rows={field === "problem" ? 5 : 4}
                  name={field}
                  value={form[field as keyof typeof form] as string}
                  onChange={handleChange}
                  required={field === "problem"}
                  placeholder={
                    field === "cosmeticCondition"
                      ? "Rayones, golpes, pantalla rota..."
                      : field === "problem"
                      ? "Describe el problema reportado por el cliente..."
                      : "Información adicional..."
                  }
                  className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-4 text-zinc-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 min-h-[120px]"
                />
              </div>
            </div>
          ))}

          {/* ENTREGA ESTIMADA */}
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 p-6 bg-zinc-50">
              <h2 className="text-xl font-semibold text-zinc-900">Entrega Estimada</h2>
            </div>
            <div className="p-6">
              <input
                type="date"
                name="estimatedDelivery"
                value={form.estimatedDelivery}
                onChange={handleChange}
                className="w-full md:w-96 bg-white border border-zinc-200 rounded-2xl px-4 py-4 text-zinc-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* BOTONES */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-8 py-3.5 rounded-2xl border border-zinc-200 hover:bg-zinc-50 transition text-zinc-700 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold transition active:scale-[0.985] disabled:opacity-70 shadow-lg shadow-zinc-200"
            >
              {loading ? "Creando Orden..." : "Crear Orden"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}