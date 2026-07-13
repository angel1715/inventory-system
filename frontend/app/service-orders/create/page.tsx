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

//Tipos de dispositivos
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

//Accesorios
const ACCESSORIES = [
  "Cargador",
  "Cable USB",
  "Caja",
  "Funda",
  "Protector",
  "SIM",
  "Memoria SD",
  "Adaptador",
  "Mouse",
  "Teclado",
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
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;

      setForm((prev) => ({
        ...prev,
        [name]: checked,
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
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

        batteryLevel:
          form.batteryLevel === "" ? undefined : Number(form.batteryLevel),

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
    <div className="max-w-7xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="h-12 w-12 rounded-xl border bg-white hover:bg-gray-100 transition flex items-center justify-center"
          >
            <ArrowLeft size={22} />
          </button>

          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ClipboardPlus className="text-blue-600" />
              Nueva Orden de Servicio
            </h1>

            <p className="text-gray-500 mt-1">
              Registra un nuevo equipo para reparación.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ===================== CLIENTE ===================== */}

        <div className="bg-white rounded-3xl border shadow-sm">
          <div className="border-b p-6 flex items-center gap-3">
            <User className="text-blue-600" />
            <h2 className="font-semibold text-xl">Información del Cliente</h2>
          </div>

          <div className="p-6 grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Cliente <span className="text-red-500">*</span>
              </label>

              <select
                name="customerId"
                value={form.customerId}
                onChange={handleChange}
                className="w-full rounded-xl border p-3"
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
              <label className="block text-sm font-medium mb-2">
                Técnico asignado
              </label>

              <select
                name="technicianId"
                value={form.technicianId}
                onChange={handleChange}
                className="w-full rounded-xl border p-3"
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

        {/* ===================== EQUIPO ===================== */}

        <div className="bg-white rounded-3xl border shadow-sm">
          <div className="border-b p-6 flex items-center gap-3">
            <Smartphone className="text-green-600" />

            <h2 className="font-semibold text-xl">Información del Equipo</h2>
          </div>

          <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Tipo de dispositivo
              </label>

              <select
                name="deviceType"
                value={form.deviceType}
                onChange={handleChange}
                className="w-full rounded-xl border p-3"
              >
                {DEVICE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Marca <span className="text-red-500">*</span>
              </label>

              <input
                required
                name="deviceBrand"
                value={form.deviceBrand}
                onChange={handleChange}
                className="w-full rounded-xl border p-3"
                placeholder="Samsung"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Modelo <span className="text-red-500">*</span>
              </label>

              <input
                required
                name="deviceModel"
                value={form.deviceModel}
                onChange={handleChange}
                className="w-full rounded-xl border p-3"
                placeholder="Galaxy S24 Ultra"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                IMEI / Serial
              </label>

              <input
                name="serialOrImei"
                value={form.serialOrImei}
                onChange={handleChange}
                className="w-full rounded-xl border p-3"
                placeholder="3568XXXXXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Color</label>

              <input
                name="color"
                value={form.color}
                onChange={handleChange}
                className="w-full rounded-xl border p-3"
                placeholder="Negro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Contraseña
              </label>

              <input
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Nivel batería %
              </label>

              <input
                type="number"
                min={0}
                max={100}
                name="batteryLevel"
                value={form.batteryLevel}
                onChange={handleChange}
                className="w-full rounded-xl border p-3"
              />
            </div>
          </div>
        </div>

        {/* ===================== CHECKLIST ===================== */}

        <div className="bg-white rounded-3xl border shadow-sm">
          <div className="border-b p-6 flex items-center gap-3">
            <Wrench className="text-orange-600" />

            <h2 className="font-semibold text-xl">Estado de Recepción</h2>
          </div>

          <div className="p-6 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="hasSim"
                checked={form.hasSim}
                onChange={handleChange}
              />
              Tiene SIM
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="hasMemoryCard"
                checked={form.hasMemoryCard}
                onChange={handleChange}
              />
              Tiene memoria SD
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="deviceTurnsOn"
                checked={form.deviceTurnsOn}
                onChange={handleChange}
              />
              Enciende
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="hasWaterDamage"
                checked={form.hasWaterDamage}
                onChange={handleChange}
              />
              Daño por humedad
            </label>
          </div>
        </div>

        {/* ===================== ACCESORIOS ===================== */}

        <div className="bg-white rounded-3xl border shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-xl font-semibold">Accesorios Recibidos</h2>

            <p className="text-sm text-gray-500 mt-1">
              Selecciona todo lo que el cliente entrega junto al equipo.
            </p>
          </div>

          <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {ACCESSORIES.map((item) => (
              <label
                key={item}
                className={`cursor-pointer rounded-xl border p-4 transition text-center font-medium

              ${
                form.accessories.includes(item)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "hover:bg-gray-100"
              }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={form.accessories.includes(item)}
                  onChange={() => toggleAccessory(item)}
                />

                {item}
              </label>
            ))}
          </div>
        </div>

        {/* ===================== ESTADO FÍSICO ===================== */}

        <div className="bg-white rounded-3xl border shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-xl font-semibold">Estado Físico</h2>
          </div>

          <div className="p-6">
            <label className="block text-sm font-medium mb-2">
              Estado cosmético
            </label>

            <textarea
              rows={4}
              name="cosmeticCondition"
              value={form.cosmeticCondition}
              onChange={handleChange}
              placeholder="Rayones, golpes, pantalla rota, carcasa dañada..."
              className="w-full rounded-xl border p-3"
            />
          </div>
        </div>

        {/* ===================== PROBLEMA ===================== */}

        <div className="bg-white rounded-3xl border shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-xl font-semibold">
              Problema Reportado <span className="text-red-500">*</span>
            </h2>
          </div>

          <div className="p-6">
            <textarea
              rows={5}
              required
              name="problem"
              value={form.problem}
              onChange={handleChange}
              placeholder="Describe el problema reportado por el cliente..."
              className="w-full rounded-xl border p-3"
            />
          </div>
        </div>

        {/* ===================== OBSERVACIONES ===================== */}

        <div className="bg-white rounded-3xl border shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-xl font-semibold">Observaciones</h2>
          </div>

          <div className="p-6">
            <textarea
              rows={4}
              name="observations"
              value={form.observations}
              onChange={handleChange}
              placeholder="Información adicional..."
              className="w-full rounded-xl border p-3"
            />
          </div>
        </div>

        {/* ===================== ENTREGA ===================== */}

        <div className="bg-white rounded-3xl border shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-xl font-semibold">Entrega Estimada</h2>
          </div>

          <div className="p-6 md:w-96">
            <input
              type="date"
              name="estimatedDelivery"
              value={form.estimatedDelivery}
              onChange={handleChange}
              className="w-full rounded-xl border p-3"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pb-10">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-8 py-3 rounded-xl border hover:bg-gray-100 transition"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear Orden"}
          </button>
        </div>
      </form>
    </div>
  );
}
