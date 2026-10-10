"use client";

import { useEffect, useState } from "react";
import InvoiceServiceModal from "@/components/services/InvoiceServiceModal";
import {
  getServiceOrder,
  addServiceItem,
  getProducts,
  updateServiceStatus,
  updateLaborCost,
  updateServiceOrder,
  invoiceServiceOrder,
  deliverServiceOrder,
  removeServiceItem,
  getUsers,
    assignServiceTechnician,
  getTrackingLink,
  resendReadyNotification,
} from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, ArrowLeft, Trash2, Copy, MessageCircle, Mail } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import ReceiptModal from "@/components/receipt/ReceiptModal";
import ServicePhotos from "@/components/services/ServicePhotos";

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Recibido",
  DIAGNOSING: "Diagnosticando",
  REPAIRED: "Reparado",
  READY_FOR_PICKUP: "Listo para retirar",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  NOT_REPAIRABLE: "Sin reparación posible",
};

// Debe mantenerse alineado con allowedTransitions del backend
const NEXT_STATUSES: Record<string, string[]> = {
  RECEIVED: ["DIAGNOSING", "CANCELLED"],
  DIAGNOSING: ["REPAIRED", "NOT_REPAIRABLE", "CANCELLED"],
  REPAIRED: ["READY_FOR_PICKUP"],
  READY_FOR_PICKUP: [],
  DELIVERED: [],
  CANCELLED: [],
  NOT_REPAIRABLE: [],
};

// WhatsApp necesita el número en formato internacional, sin "+".
// En RD los números de 10 dígitos llevan el prefijo 1.
function toWhatsAppPhone(raw?: string | null) {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

export default function ServiceOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const [order, setOrder] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  const [isEditingTech, setIsEditingTech] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [assigningTech, setAssigningTech] = useState(false);

    const [deliverLoading, setDeliverLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);

  const router = useRouter();

  const [isEditingLabor, setIsEditingLabor] = useState(false);
  const [newLaborCost, setNewLaborCost] = useState(0);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [newStatus, setNewStatus] = useState("RECEIVED");
  const [changeNote, setChangeNote] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({
    deviceBrand: "",
    deviceModel: "",
    serialOrImei: "",
    problem: "",
    diagnostic: "",
    repairSolution: "",
    estimatedRepairTime: "",
    customerApproved: false,
    warrantyDays: 0,
  });

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);

  const nextStatuses = NEXT_STATUSES[order?.status ?? ""] ?? [];

  const canEditParts = ["RECEIVED", "DIAGNOSING", "REPAIRED"].includes(
    order?.status ?? "",
  );

  const canAssignTechnician = ["RECEIVED", "DIAGNOSING", "REPAIRED"].includes(
    order?.status ?? "",
  );

    const warrantyExpired =
    !!order?.warrantyUntil && new Date(order.warrantyUntil) < new Date();

  const openStatusModal = () => {
    setNewStatus(nextStatuses[0] ?? "");
    setChangeNote("");
    setIsStatusModalOpen(true);
  };

  useEffect(() => {
    if (id) loadOrder();
  }, [id]);

  async function loadOrder() {
    if (!id) return;

    if (!order) setLoading(true);

    try {
      const data = await getServiceOrder(id);

      setOrder(data);
      setNewStatus(data.status);

      setInfoForm({
        deviceBrand: data.deviceBrand ?? "",
        deviceModel: data.deviceModel ?? "",
        serialOrImei: data.serialOrImei ?? "",
        problem: data.problem ?? "",
        diagnostic: data.diagnostic ?? "",
        repairSolution: data.repairSolution ?? "",
        estimatedRepairTime: data.estimatedRepairTime ?? "",
        customerApproved: data.customerApproved ?? false,
        warrantyDays: data.warrantyDays ?? 0,
      });
    } catch (err) {
      toast.error("Error al cargar detalles");
    } finally {
      setLoading(false);
    }
  }

  const handleComplete = () => {
    if (order.status !== "READY_FOR_PICKUP") {
      toast.error("La reparación aún no está lista.");
      return;
    }

    setIsInvoiceModalOpen(true);
  };

  const handleInvoiceServiceOrder = async (data: {
    paymentMethod: string;
    received: number;
    change: number;
    ncfType?: string;
  }) => {
    try {
      setInvoiceLoading(true);

      const sale = await invoiceServiceOrder(id, {
        paymentMethod: data.paymentMethod,
        received: data.received,
        change: data.change,
        ncfType: data.ncfType,
      });

      setCompletedSale(sale);
      setIsInvoiceModalOpen(false);
      setReceiptOpen(true);
      await loadOrder();

      if (sale.ncfType?.startsWith("E") && sale.ecfStatus === "failure") {
        toast.error(
          `La factura se registró, pero la DGII rechazó el comprobante: ${sale.ecfMessage || "Error desconocido"}`,
          { duration: 8000 },
        );
      } else {
        toast.success("Factura generada. Ya puedes entregar el equipo.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo generar la factura.",
      );
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleDeliver = async () => {
    try {
      setDeliverLoading(true);
      await deliverServiceOrder(id);
      toast.success("Equipo entregado al cliente.");
      await loadOrder();
    } catch (err: any) {
      toast.error(err?.message || "No se pudo registrar la entrega.");
    } finally {
      setDeliverLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm("¿Quitar este repuesto de la orden?")) return;

    try {
      setRemovingItemId(itemId);
      await removeServiceItem(id, itemId);
      toast.success("Repuesto eliminado");
      await loadOrder();
    } catch (err: any) {
      toast.error(err?.message || "Error al eliminar el repuesto");
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleToggleTechEditor = async () => {
    if (isEditingTech) {
      setIsEditingTech(false);
      return;
    }

    try {
      if (technicians.length === 0) {
        const data = await getUsers();
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setTechnicians(list.filter((u: any) => u.active !== false));
      }
      setSelectedTechnician(order.technicianId ?? "");
      setIsEditingTech(true);
    } catch {
      toast.error("No se pudo cargar la lista de técnicos");
    }
  };

  const handleAssignTechnician = async () => {
    if (!selectedTechnician) return toast.error("Selecciona un técnico");

    try {
      setAssigningTech(true);
      await assignServiceTechnician(id, selectedTechnician);
      toast.success("Técnico asignado");
      setIsEditingTech(false);
      await loadOrder();
    } catch (err: any) {
      toast.error(err?.message || "Error al asignar el técnico");
    } finally {
      setAssigningTech(false);
    }
  };

    const getTrackingUrl = async () => {
    const { token } = await getTrackingLink(id);
    return `${window.location.origin}/track/${token}`;
  };

  const handleCopyTrackingLink = async () => {
    try {
      setLinkLoading(true);
      const url = await getTrackingUrl();
      await navigator.clipboard.writeText(url);
      toast.success("Link de seguimiento copiado");
    } catch (err: any) {
      toast.error(err?.message || "No se pudo generar el link");
    } finally {
      setLinkLoading(false);
    }
  };

  const handleWhatsAppTrackingLink = async () => {
    // Se abre la pestaña de inmediato para que el navegador no la bloquee
    const win = window.open("", "_blank");

    try {
      setLinkLoading(true);
      const url = await getTrackingUrl();

      const firstName = order.customer?.name?.trim().split(/\s+/)[0] ?? "";
      const greeting = firstName ? `Hola ${firstName}` : "Hola";
      const text = `${greeting}, puedes ver el estado de tu reparación (${order.deviceBrand} ${order.deviceModel}, orden #${order.ticketNumber}) en este enlace: ${url}`;

      const waUrl = `https://wa.me/${toWhatsAppPhone(order.customer?.phone)}?text=${encodeURIComponent(text)}`;

      if (win) win.location.href = waUrl;
      else window.open(waUrl, "_blank");
    } catch (err: any) {
      win?.close();
      toast.error(err?.message || "No se pudo generar el link");
    } finally {
      setLinkLoading(false);
    }
  };

    const handleResendNotification = async () => {
    try {
      setNotifyLoading(true);
      const result = await resendReadyNotification(id);

      if (result?.sent) {
        toast.success("Se notificó al cliente por email");
        await loadOrder();
      } else if (result?.reason === "NO_EMAIL") {
        toast("El cliente no tiene email registrado.", { icon: "ℹ️" });
      } else {
        toast.error("No se pudo enviar el email al cliente.");
      }
    } catch (err: any) {
      toast.error(err?.message || "No se pudo enviar el email");
    } finally {
      setNotifyLoading(false);
    }
  };

  const handleUpdateLabor = async () => {
    try {
      await updateLaborCost(id, newLaborCost);
      toast.success("Mano de obra actualizada");
      setIsEditingLabor(false);
      loadOrder();
    } catch {
      toast.error("Error al actualizar mano de obra");
    }
  };

  const handleOpenItemModal = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
      setIsItemModalOpen(true);
    } catch {
      toast.error("Error al cargar productos");
    }
  };

  const handleAddItem = async () => {
    if (!selectedProduct) return toast.error("Selecciona un producto");

    try {
      setAddingItem(true);
      await addServiceItem(id, { productId: selectedProduct, quantity });
      toast.success("Repuesto agregado");
      setIsItemModalOpen(false);
      setSelectedProduct("");
      setQuantity(1);
      loadOrder();
    } catch {
      toast.error("Error al agregar repuesto");
    } finally {
      setAddingItem(false);
    }
  };

  const handleUpdateInfo = async () => {
    if (!infoForm.deviceBrand || !infoForm.deviceModel) {
      toast.error("Marca y modelo son obligatorios");
      return;
    }

    try {
      setLoading(true);
      await updateServiceOrder(id, infoForm);
      await loadOrder();
      setIsEditingInfo(false);
      toast.success("Diagnóstico guardado correctamente");
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message ||
        err?.message ||
        "Error al actualizar la orden",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!changeNote.trim()) return toast.error("La nota es obligatoria");
    if (newStatus === "DELIVERED") {
      return toast.error(
                "Para entregar la orden, usa el botón 'Entregar Equipo'.",
      );
    }
    try {
            const result = await updateServiceStatus(id, {
        status: newStatus,
        note: changeNote,
      });
      toast.success("Estatus actualizado");

      if (newStatus === "READY_FOR_PICKUP") {
        if (result?.notification?.sent) {
          toast.success("Se notificó al cliente por email");
        } else if (result?.notification?.reason === "NO_EMAIL") {
          toast("El cliente no tiene email registrado. Avísale por WhatsApp.", {
            icon: "ℹ️",
            duration: 6000,
          });
        } else {
          toast.error("No se pudo enviar el email al cliente.");
        }
      }
      setIsStatusModalOpen(false);
      setChangeNote("");
      loadOrder();
    } catch (err: any) {
      toast.error(err?.message || "Error al actualizar estatus");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        Cargando detalles...
      </div>
    );
  if (!order)
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        Orden no encontrada.
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-slate-100 pb-12">
      <div className="max-w-6xl mx-auto px-4 pt-8">
        {/* ==================== HEADER ==================== */}
        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-violet-600 text-white p-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-blue-100 hover:text-white mb-6 transition"
            >
              <ArrowLeft size={20} />
              Volver
            </button>

            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100 text-sm">Orden de Servicio</p>
                <h1 className="text-4xl font-bold mt-1">
                  #{order.ticketNumber}
                </h1>
                <p className="mt-3 text-blue-100 text-xl">
                  {order.customer?.name}
                </p>
              </div>
              <span className="font-semibold px-4 py-2 bg-white/10 rounded-2xl">
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
            </div>
          </div>

          {/* Resumen rápido */}
          <div className="grid md:grid-cols-4 divide-x border-t border-zinc-100">
            {[
              {
                label: "Equipo",
                value: `${order.deviceBrand} ${order.deviceModel}`,
              },
              { label: "IMEI / Serial", value: order.serialOrImei || "-" },
              {
                label: "Técnico",
                value: order.technician?.name || "Sin asignar",
              },
              {
                label: "Entrega estimada",
                value: order.estimatedDelivery
                  ? new Date(order.estimatedDelivery).toLocaleDateString()
                  : "-",
              },
            ].map((item, i) => (
              <div key={i} className="p-6">
                <p className="text-sm text-zinc-500">{item.label}</p>
                <p className="font-semibold text-zinc-900 mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ==================== CONTENIDO PRINCIPAL ==================== */}
          <div className="lg:col-span-2 space-y-6">
            {/* Problema Reportado */}
            <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-8">
              <h3 className="font-semibold text-xl text-zinc-900 mb-4">
                Problema Reportado
              </h3>
              <p className="text-zinc-700 bg-zinc-50 p-6 rounded-2xl whitespace-pre-wrap">
                {order.problem}
              </p>
            </div>

            {/* Diagnóstico y Solución */}
            <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-xl text-zinc-900">
                  Diagnóstico y Reparación
                </h3>
                                {canEditParts && (
                  <button
                    onClick={() => setIsEditingInfo(!isEditingInfo)}
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >
                    {isEditingInfo ? "Cancelar" : "Editar Diagnóstico"}
                  </button>
                )}
              </div>

              {isEditingInfo ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-zinc-500 block mb-1">
                      Diagnóstico
                    </label>
                    <textarea
                      value={infoForm.diagnostic}
                      onChange={(e) =>
                        setInfoForm({ ...infoForm, diagnostic: e.target.value })
                      }
                      placeholder="Escribe el diagnóstico técnico..."
                      className="text-gray-700 w-full border border-zinc-200 rounded-2xl px-4 py-3 min-h-[100px]"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-500 block mb-1">
                      Solución Aplicada
                    </label>
                    <textarea
                      value={infoForm.repairSolution}
                      onChange={(e) =>
                        setInfoForm({
                          ...infoForm,
                          repairSolution: e.target.value,
                        })
                      }
                      placeholder="Describe la solución..."
                      className="text-gray-700 w-full border border-zinc-200 rounded-2xl px-4 py-3 min-h-[100px]"
                    />
                  </div>

                                    <div>
                    <label className="text-sm text-zinc-500 block mb-1">
                      Garantía de la reparación
                    </label>
                    <select
                      value={infoForm.warrantyDays}
                      onChange={(e) =>
                        setInfoForm({
                          ...infoForm,
                          warrantyDays: Number(e.target.value),
                        })
                      }
                      className="text-gray-700 w-full border border-zinc-200 rounded-2xl px-4 py-3"
                    >
                      <option value={0}>Sin garantía</option>
                      <option value={7}>7 días</option>
                      <option value={15}>15 días</option>
                      <option value={30}>30 días</option>
                      <option value={60}>60 días</option>
                      <option value={90}>90 días</option>
                      <option value={180}>6 meses (180 días)</option>
                      <option value={365}>1 año (365 días)</option>
                    </select>
                    <p className="text-xs text-zinc-400 mt-1">
                      Se cuenta desde el día en que se entrega el equipo.
                    </p>
                  </div>

                  <label className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={infoForm.customerApproved}
                      onChange={(e) =>
                        setInfoForm({
                          ...infoForm,
                          customerApproved: e.target.checked,
                        })
                      }
                      className="w-5 h-5 accent-green-600"
                    />
                    <span className="text-zinc-700 font-medium">
                      El cliente aprobó la cotización
                    </span>
                  </label>

                  <button
                    onClick={handleUpdateInfo}
                    className="w-full py-3 bg-zinc-900 text-white rounded-2xl font-semibold hover:bg-zinc-800 transition"
                  >
                    Guardar Diagnóstico
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-zinc-50 p-6 rounded-2xl">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                      Diagnóstico Registrado
                    </p>
                    <p className="text-zinc-700 whitespace-pre-wrap">
                      {order.diagnostic || "Sin diagnóstico registrado."}
                    </p>
                  </div>
                  <div className="bg-zinc-50 p-6 rounded-2xl">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                      Solución Registrada
                    </p>
                    <p className="text-zinc-700 whitespace-pre-wrap mb-4">
                      {order.repairSolution || "Sin solución registrada."}
                    </p>

                                        <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-block px-4 py-2 rounded-2xl text-sm font-medium ${
                          order.customerApproved
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {order.customerApproved
                          ? "Cotización aprobada por el cliente"
                          : "Pendiente de aprobación del cliente"}
                      </span>

                      {(order.warrantyDays ?? 0) > 0 && (
                        <span
                          className={`inline-block px-4 py-2 rounded-2xl text-sm font-medium ${
                            warrantyExpired
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {order.warrantyUntil
                            ? `${warrantyExpired ? "Garantía vencida el" : "Garantía hasta el"} ${new Date(order.warrantyUntil).toLocaleDateString()}`
                            : `Garantía: ${order.warrantyDays} días tras la entrega`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Información del Equipo */}
            <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm">
              <div className="border-b border-zinc-100 p-6">
                <h2 className="text-xl font-semibold text-zinc-900">
                  Información del Equipo
                </h2>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-zinc-500">Tipo</p>
                  <p className="font-medium text-zinc-900">
                    {order.deviceType || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Color</p>
                  <p className="font-medium text-zinc-900">
                    {order.color || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Contraseña</p>
                  <p className="font-medium text-zinc-900">
                    {order.password || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Nivel de batería</p>
                  <p className="font-medium text-zinc-900">
                    {order.batteryLevel ?? "-"}%
                  </p>
                </div>
              </div>
            </div>

            {/* Fotos del Equipo */}
            <ServicePhotos
              orderId={id}
              photos={order.photos || []}
              onChange={loadOrder}
              disabled={order.status === "DELIVERED"}
            />

            {/* Accesorios */}
            <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm">
              <div className="border-b border-zinc-100 p-6">
                <h2 className="text-xl font-semibold text-zinc-900">
                  Accesorios Recibidos
                </h2>
              </div>
              <div className="p-6">
                {order.accessories?.length ? (
                  <div className="flex flex-wrap gap-3">
                    {order.accessories.map((item: string) => (
                      <span
                        key={item}
                        className="px-4 py-2 rounded-2xl bg-blue-100 text-blue-700 font-medium"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-400">No se registraron accesorios.</p>
                )}
              </div>
            </div>

            {/* Estado Físico */}
            <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-8">
              <h3 className="font-semibold text-xl text-zinc-900 mb-4">
                Estado Físico
              </h3>
              <p className="text-zinc-700 whitespace-pre-wrap">
                {order.cosmeticCondition || "Sin observaciones"}
              </p>
            </div>

            {/* Repuestos Utilizados */}
            <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-8">
              <h3 className="font-semibold text-xl text-zinc-900 mb-6">
                Repuestos Utilizados
              </h3>
              {order.items?.length ? (
                <div className="space-y-3">
                  {order.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center gap-3 py-3 border-b border-zinc-100 last:border-0"
                    >
                      <span className="text-zinc-700 flex-1">
                        {item.product?.name} ×{item.quantity}
                      </span>
                      <span className="font-semibold text-zinc-900">
                        RD${" "}
                        {(
                          Number(item.priceUnit) * item.quantity
                        ).toLocaleString()}
                      </span>
                      {canEditParts && (
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={removingItemId === item.id}
                          title="Quitar repuesto"
                          className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400">No hay repuestos agregados.</p>
              )}
            </div>
          </div>

          {/* ==================== SIDEBAR ==================== */}
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-8 h-fit space-y-8">
            <div>
              <p className="text-sm font-medium text-zinc-500">TOTAL A PAGAR</p>
              <p className="text-5xl font-bold text-zinc-900 mt-2">
                RD$ {Number(order.totalAmount).toLocaleString()}
              </p>
            </div>

            {/* Técnico */}
            <div className="pt-6 border-t border-zinc-100">
              <div className="flex justify-between items-center mb-3">
                <p className="font-medium text-zinc-900">Técnico</p>
                {canAssignTechnician && (
                  <button
                    onClick={handleToggleTechEditor}
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >
                    {isEditingTech
                      ? "Cancelar"
                      : order.technician
                        ? "Cambiar"
                        : "Asignar"}
                  </button>
                )}
              </div>

              {isEditingTech ? (
                <div className="flex gap-3">
                  <select
                    value={selectedTechnician}
                    onChange={(e) => setSelectedTechnician(e.target.value)}
                    className="text-gray-700 flex-1 border border-zinc-200 rounded-2xl px-4 py-3"
                  >
                    <option value="">Seleccionar técnico...</option>
                    {technicians.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignTechnician}
                    disabled={assigningTech}
                    className="px-6 bg-zinc-900 text-white rounded-2xl font-medium disabled:opacity-50"
                  >
                    {assigningTech ? "..." : "OK"}
                  </button>
                </div>
              ) : (
                <>
                  <p
                    className={`text-lg font-semibold ${order.technician ? "text-zinc-900" : "text-amber-600"
                      }`}
                  >
                    {order.technician?.name || "Sin asignar"}
                  </p>
                  {!order.technician && canAssignTechnician && (
                    <p className="text-xs text-zinc-400 mt-1">
                      Requerido para marcar la orden como Reparada.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Mano de Obra */}
            <div className="pt-6 border-t border-zinc-100">
              <div className="flex justify-between items-center mb-3">
                <p className="font-medium text-zinc-900">Mano de Obra</p>
                <button
                  onClick={() => {
                    setNewLaborCost(Number(order.laborCost));
                    setIsEditingLabor(!isEditingLabor);
                  }}
                  className="text-blue-600 text-sm font-medium hover:underline"
                >
                  {isEditingLabor ? "Cancelar" : "Editar"}
                </button>
              </div>
              {isEditingLabor ? (
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={newLaborCost}
                    onChange={(e) => setNewLaborCost(Number(e.target.value))}
                    className="text-gray-700 flex-1 border border-zinc-200 rounded-2xl px-4 py-3"
                  />
                  <button
                    onClick={handleUpdateLabor}
                    className="px-6 bg-zinc-900 text-white rounded-2xl font-medium"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <p className="text-2xl font-semibold text-zinc-900">
                  RD$ {Number(order.laborCost).toLocaleString()}
                </p>
              )}
            </div>

                        {/* Seguimiento para el cliente */}
            <div className="pt-6 border-t border-zinc-100">
              <p className="font-medium text-zinc-900 mb-1">
                Seguimiento del cliente
              </p>
              <p className="text-xs text-zinc-400 mb-4">
                Enlace privado para que el cliente vea el estado sin iniciar
                sesión.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCopyTrackingLink}
                  disabled={linkLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-2xl font-medium transition disabled:opacity-50"
                >
                  <Copy size={18} />
                  Copiar link
                </button>
                <button
                  onClick={handleWhatsAppTrackingLink}
                  disabled={linkLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-medium transition disabled:opacity-50"
                >
                                   <MessageCircle size={18} />
                  WhatsApp
                </button>
              </div>

              {order.status === "READY_FOR_PICKUP" && (
                <button
                  onClick={handleResendNotification}
                  disabled={notifyLoading}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-3 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-2xl font-medium transition disabled:opacity-50"
                >
                  <Mail size={18} />
                  {notifyLoading ? "Enviando..." : "Reenviar aviso por email"}
                </button>
              )}
            </div>

            {/* Acciones */}
            <div className="pt-6 border-t border-zinc-100 space-y-4">
              {nextStatuses.length > 0 && (
                <button
                  onClick={openStatusModal}
                  className="text-gray-700 w-full py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-2xl font-semibold transition"
                >
                  Cambiar Estatus
                </button>
              )}

              {order.status === "READY_FOR_PICKUP" && !order.sale && (
                <button
                  onClick={handleComplete}
                  className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-semibold transition shadow-lg shadow-green-100"
                >
                  Facturar
                </button>
              )}

              {order.status === "READY_FOR_PICKUP" && order.sale && (
                <button
                  onClick={handleDeliver}
                  disabled={deliverLoading}
                  className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-semibold transition disabled:opacity-50"
                >
                  {deliverLoading ? "Registrando..." : "Entregar Equipo"}
                </button>
              )}

              {canEditParts && (
                <button
                  onClick={handleOpenItemModal}
                  className="w-full py-4 bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 hover:brightness-105 transition"
                >
                  <Plus size={20} />
                  Agregar Repuesto
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== MODALES ==================== */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl">
            <h3 className="text-2xl font-semibold text-zinc-900 mb-6">
              Agregar Repuesto
            </h3>
            <select
              value={selectedProduct}
              className="text-gray-700 w-full border border-zinc-200 rounded-2xl px-4 py-4 mb-4"
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <option value="">Seleccionar producto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - RD${p.salePrice}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="text-gray-700 w-full border border-zinc-200 rounded-2xl px-4 py-4 mb-8"
              placeholder="Cantidad"
            />
            <div className="flex gap-4">
              <button
                type="button"
                disabled={addingItem}
                onClick={() => setIsItemModalOpen(false)}
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl border border-zinc-200 font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={addingItem}
                onClick={handleAddItem}
                className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl font-semibold disabled:opacity-50 flex items-center justify-center"
              >
                {addingItem ? "Agregando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isStatusModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl">
            <h3 className="text-gray-700 text-2xl font-semibold text-zinc-900 mb-6">
              Cambiar Estatus
            </h3>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="text-gray-700 w-full border border-zinc-200 rounded-2xl px-4 py-4 mb-4"
            >
              {nextStatuses.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
                        {newStatus === "READY_FOR_PICKUP" && (
              <p className="text-sm text-zinc-500 mb-4">
                {order.customer?.email
                  ? `Se enviará un email a ${order.customer.email} con el link de seguimiento.`
                  : "El cliente no tiene email registrado: no se enviará ninguna notificación."}
              </p>
            )}
            <textarea
              placeholder="Nota del cambio (obligatoria)"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              className="text-gray-700 w-full border border-zinc-200 rounded-2xl px-4 py-4 min-h-[120px] mb-8"
            />
            <div className="flex gap-4">
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl border border-zinc-200 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateStatus}
                className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl font-semibold"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <InvoiceServiceModal
        open={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        total={Number(order.totalAmount)}
        loading={invoiceLoading}
        onConfirm={handleInvoiceServiceOrder}
      />

      <ReceiptModal
        open={receiptOpen}
        sale={completedSale}
        onClose={() => setReceiptOpen(false)}
      />
    </div>
  );
}