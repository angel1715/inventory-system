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
} from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import ReceiptModal from "@/components/receipt/ReceiptModal";

export default function ServiceOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const [order, setOrder] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

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
  });

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const [receiptOpen, setReceiptOpen] = useState(false);

  const [completedSale, setCompletedSale] = useState<any>(null);

  useEffect(() => {
    if (id) loadOrder();
  }, [id]);

  async function loadOrder() {
    if (!id) return;

    setLoading(true);

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

      // Guardamos la venta retornada por el backend.
      setCompletedSale(sale);

      // Cerramos el modal de pago.
      setIsInvoiceModalOpen(false);

      // Abrimos el recibo.
      setReceiptOpen(true);

      // Actualizamos la orden.
      await loadOrder();

      if (sale.ncfType?.startsWith("E") && sale.ecfStatus === "failure") {
        toast.error(
          `La factura se registró, pero la DGII rechazó el comprobante: ${sale.ecfMessage || "Error desconocido"}`,
          { duration: 8000 },
        );
      } else {
        toast.success("Reparación entregada y factura generada correctamente.");
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
      setAddingItem(true); // 👈 Bloqueamos el botón
      await addServiceItem(id, { productId: selectedProduct, quantity });
      toast.success("Repuesto agregado");
      setIsItemModalOpen(false);
      setSelectedProduct(""); // Opcional: limpiar selección
      setQuantity(1); // Opcional: reiniciar cantidad
      loadOrder();
    } catch {
      toast.error("Error al agregar repuesto");
    } finally {
      setAddingItem(false); // 👈 Liberamos el botón pase lo que pase
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

      // Esperamos a que el backend nos devuelva la información actualizada.
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
        "Para entregar la orden, usa el botón verde 'Entregar Reparación'.",
      );
    }
    try {
      await updateServiceStatus(id, { status: newStatus, note: changeNote });
      toast.success("Estatus actualizado");
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
              <span className="px-5 py-2.5 rounded-2xl font-semibold text-sm bg-white/20 backdrop-blur-sm">
                {order.status}
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
                <button
                  onClick={() => setIsEditingInfo(!isEditingInfo)}
                  className="text-blue-600 text-sm font-medium hover:underline"
                >
                  {isEditingInfo ? "Cancelar" : "Editar Diagnóstico"}
                </button>
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
                    <p className="text-zinc-700 whitespace-pre-wrap">
                      {order.repairSolution || "Sin solución registrada."}
                    </p>
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
              {order.items?.length > 0 ? (
                <div className="space-y-3">
                  {order.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center py-3 border-b border-zinc-100 last:border-0"
                    >
                      <span className="text-zinc-700">
                        {item.product?.name} ×{item.quantity}
                      </span>
                      <span className="font-semibold text-zinc-900">
                        RD$ {(item.priceUnit * item.quantity).toLocaleString()}
                      </span>
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

            {/* Acciones */}
            <div className="pt-6 border-t border-zinc-100 space-y-4">
              <button
                onClick={() => setIsStatusModalOpen(true)}
                className="text-gray-700 w-full py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-2xl font-semibold transition"
              >
                Cambiar Estatus
              </button>

              {order.status !== "DELIVERED" && (
                <button
                  onClick={handleComplete}
                  className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-semibold transition shadow-lg shadow-green-100"
                >
                  Facturar y Entregar
                </button>
              )}

              <button
                onClick={handleOpenItemModal}
                className="w-full py-4 bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 hover:brightness-105 transition"
              >
                <Plus size={20} />
                Agregar Repuesto
              </button>
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
              <option value="RECEIVED">Recibido</option>
              <option value="DIAGNOSING">Diagnosticando</option>
              <option value="REPAIRED">Reparado</option>
              <option value="READY_FOR_PICKUP">Listo para retirar</option>
            </select>
            <textarea
              placeholder="Nota del cambio (obligatoria)"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              className="text-gray-700 w-full border border-zinc-200 rounded-2xl px-4 py-4 min-h-[120px] mb-8"
            />
            <div className="flex gap-4">
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="flex-1 py-4 bg-red-500 rounded-2xl border border-zinc-200 font-medium"
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
