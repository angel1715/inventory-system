"use client";

import { useEffect, useState, use } from "react";
import {
  getServiceOrder,
  addServiceItem,
  getProducts,
  updateServiceStatus,
  updateLaborCost,
  completeServiceOrder,
  updateServiceOrder,
} from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ServiceOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({
    deviceBrand: "",
    deviceModel: "",
    serialOrImei: "",
    problem: "",
  });

  useEffect(() => {
    loadOrder();
  }, [id]);

  async function loadOrder() {
    setLoading(true);
    try {
      const data = await getServiceOrder(id);
      setOrder(data);
      setNewStatus(data.status);
    } catch (err) {
      toast.error("Error al cargar detalles");
    } finally {
      setLoading(false);
    }
  }

  const handleComplete = async () => {
    if (
      !confirm(
        "¿Finalizar reparación y emitir factura? Esta acción descontará el inventario.",
      )
    )
      return;

    try {
      setLoading(true);
      await completeServiceOrder(order.id);
      toast.success("Orden entregada y factura generada");
      window.location.reload();
    } catch (err: any) {
      console.error("Error completo:", err);
      const serverMessage =
        err.response?.data?.message || err.message || "Error desconocido";
      toast.error(`Error: ${serverMessage}`);
    } finally {
      setLoading(false);
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
      await addServiceItem(id, { productId: selectedProduct, quantity });
      toast.success("Repuesto agregado");
      setIsItemModalOpen(false);
      loadOrder();
    } catch {
      toast.error("Error al agregar repuesto");
    }
  };

  const handleUpdateInfo = async () => {
    if (!infoForm.deviceBrand || !infoForm.deviceModel) {
      toast.error("Marca y modelo son obligatorios");
      return;
    }
    try {
      await updateServiceOrder(id, infoForm);
      toast.success("Información actualizada");
      setIsEditingInfo(false);
      loadOrder();
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const handleUpdateStatus = async () => {
    if (!changeNote.trim()) return toast.error("La nota es obligatoria");
    // BLINDAJE: Impedimos poner el estado en DELIVERED desde aquí
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
      <div className="p-8 text-gray-500 text-center">Cargando detalles...</div>
    );
  if (!order)
    return (
      <div className="p-8 text-gray-500 text-center">Orden no encontrada.</div>
    );

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen bg-gray-50">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Ticket {order.ticketNumber}
            </h2>
            <p className="text-sm text-gray-500">Gestión de reparación</p>
          </div>
          {order.status !== "DELIVERED" && (
            <button
              onClick={() => {
                if (!isEditingInfo) {
                  setInfoForm({
                    deviceBrand: order.deviceBrand,
                    deviceModel: order.deviceModel,
                    serialOrImei: order.serialOrImei,
                    problem: order.problem,
                  });
                }
                setIsEditingInfo(!isEditingInfo);
              }}
              className="text-sm font-bold text-blue-600 hover:underline"
            >
              {isEditingInfo ? "Cancelar" : "Editar Información"}
            </button>
          )}
        </div>

        {isEditingInfo ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
            <input
              className="text-gray-700 p-2 border rounded-lg"
              value={infoForm.deviceBrand}
              onChange={(e) =>
                setInfoForm({ ...infoForm, deviceBrand: e.target.value })
              }
              placeholder="Marca"
            />
            <input
              className="text-gray-700 p-2 border rounded-lg"
              value={infoForm.deviceModel}
              onChange={(e) =>
                setInfoForm({ ...infoForm, deviceModel: e.target.value })
              }
              placeholder="Modelo"
            />
            <input
              className="text-gray-700 p-2 border rounded-lg col-span-2"
              value={infoForm.serialOrImei}
              onChange={(e) =>
                setInfoForm({ ...infoForm, serialOrImei: e.target.value })
              }
              placeholder="Serial o IMEI"
            />
            <textarea
              className="text-gray-700 p-2 border rounded-lg col-span-2"
              value={infoForm.problem}
              onChange={(e) =>
                setInfoForm({ ...infoForm, problem: e.target.value })
              }
              placeholder="Problema"
            />
            <button
              onClick={handleUpdateInfo}
              className="bg-black text-white py-2 rounded-lg font-bold"
            >
              Guardar Cambios
            </button>
          </div>
        ) : (
          <div className="text-gray-700">
            <p className="font-semibold">
              {order.deviceBrand} {order.deviceModel}
            </p>
            <p className="text-sm text-gray-500">
              IMEI/Serial: {order.serialOrImei}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Problema Reportado</h3>
            <p className="text-gray-700 bg-gray-50 p-4 rounded-2xl">
              {order.problem}
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">
              Repuestos Utilizados
            </h3>
            {order.items?.length > 0 ? (
              <ul className="space-y-2">
                {order.items.map((item: any) => (
                  <li
                    key={item.id}
                    className="flex justify-between p-3 border-b border-gray-100"
                  >
                    <span className="text-gray-700">
                      {item.product?.name} x{item.quantity}
                    </span>
                    <span className="font-semibold text-gray-700">
                      RD$ {item.priceUnit * item.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">No hay repuestos agregados.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-fit space-y-6">
          <div>
            <span className="text-sm font-bold text-gray-500 uppercase">
              Total a pagar
            </span>
            <div className="text-4xl font-extrabold text-gray-900 mt-1">
              RD$ {Number(order.totalAmount).toLocaleString()}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold text-gray-900">
                Mano de Obra
              </label>
              <button
                onClick={() => {
                  setNewLaborCost(Number(order.laborCost));
                  setIsEditingLabor(!isEditingLabor);
                }}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                {isEditingLabor ? "Cancelar" : "Editar"}
              </button>
            </div>
            {isEditingLabor ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newLaborCost}
                  onChange={(e) => setNewLaborCost(Number(e.target.value))}
                  className="text-gray-700 w-full p-2 border rounded-lg text-sm"
                />
                <button
                  onClick={handleUpdateLabor}
                  className="bg-black text-white px-3 py-1 rounded-lg text-sm font-bold"
                >
                  OK
                </button>
              </div>
            ) : (
              <div className="text-lg font-semibold text-gray-700">
                RD$ {Number(order.laborCost).toLocaleString()}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-gray-100 space-y-3">
            <button
              onClick={() => setIsStatusModalOpen(true)}
              className="bg-gray-100 w-full py-3 rounded-xl font-bold text-gray-800 hover:bg-gray-200 transition"
            >
              Cambiar Estatus
            </button>

            {order.status !== "DELIVERED" && (
              <button
                onClick={handleComplete}
                className="bg-green-600 w-full py-3 rounded-xl font-bold text-white hover:bg-green-500 transition shadow-lg shadow-green-100"
              >
                Entregar Reparación
              </button>
            )}
          </div>

          <button
            onClick={handleOpenItemModal}
            className="w-full bg-blue-600 text-white py-4 px-4 rounded-2xl font-bold hover:bg-blue-500 transition"
          >
            Agregar Repuesto
          </button>
        </div>
      </div>

      {/* --- MODALES --- */}

      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-xl">
            <h3 className="text-gray-800 text-xl font-bold mb-6">
              Seleccionar Repuesto
            </h3>
            <select
              className="w-full p-3 border rounded-xl mb-4 text-gray-700"
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <option value="">Producto...</option>
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
              className="w-full p-3 border rounded-xl mb-6 text-gray-700"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="flex-1 py-3 rounded-xl border font-bold bg-red-600 text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddItem}
                className="flex-1 py-3 rounded-xl bg-black text-white font-bold"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {isStatusModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-xl">
            <h3 className="text-gray-800 text-xl font-bold mb-6">
              Cambiar Estatus
            </h3>
            <select
              className="text-gray-700 w-full p-3 border rounded-xl mb-4"
              onChange={(e) => setNewStatus(e.target.value)}
              value={newStatus}
            >
              <option value="RECEIVED">Recibido</option>
              <option value="DIAGNOSING">Diagnosticando</option>
              <option value="REPAIRED">Reparado</option>
              <option value="DELIVERED">Entregado</option>
            </select>
            <textarea
              placeholder="Nota del cambio (obligatoria)"
              className="text-gray-700 w-full p-3 border rounded-xl mb-6"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateStatus}
                className="flex-1 py-3 rounded-xl bg-black text-white font-bold"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
