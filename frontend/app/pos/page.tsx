"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

import ProtectedRoute from "@/components/ProtectedRoute";
import PaymentModal from "@/components/pos/PaymentModal";
import ReceiptModal from "@/components/receipt/ReceiptModal";
import CameraScanner from "@/components/pos/CameraScanner";
import SerialSelectionModal from "@/components/pos/SerialSelectionModal";

import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { playBeep } from "@/lib/sounds";

import {
  searchProducts,
  findByBarcode,
  createSale,
  getCashSession,
  getAvailableSerials,
} from "@/lib/api";

import toast from "react-hot-toast";
import Link from "next/link";
import { useSettings } from "@/hooks/useSettings";

type Product = {
  id: string;
  name: string;
  stock: number;
  salePrice: number;
  imageUrl?: string;
  isSerialized?: boolean;
  hasImei?: boolean;
};

export default function POSPage() {
  const [cart, setCart] = useState<any[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("pos-cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cashSession, setCashSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [completedSale, setCompletedSale] = useState<any>(null);

  const [serialModalOpen, setSerialModalOpen] = useState(false);
  const [pendingSerialProduct, setPendingSerialProduct] =
    useState<Product | null>(null);

  const isProcessingRef = useRef(false);
  const idempotencyRef = useRef<string | null>(null);
  const lastScanRef = useRef<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { settings, loading: settingsLoading } = useSettings();

  useEffect(() => {
    localStorage.setItem("pos-cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    async function loadSession() {
      try {
        setLoadingSession(true);
        const session = await getCashSession();
        setCashSession(session);
      } catch (err) {
        setCashSession(null);
      } finally {
        setLoadingSession(false);
      }
    }
    loadSession();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault();
        if (cart.length > 0 && !loading) setPaymentOpen(true);
      }
      if (e.key === "Escape") {
        setPaymentOpen(false);
        setReceiptOpen(false);
        setSerialModalOpen(false);
      }
      if (e.ctrlKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart.length, loading]);

  function generateIdempotencyKey() {
    return crypto.randomUUID();
  }

  const addToCart = useCallback(
    (product: Product, selectedSerials: string[] = []) => {
      if (!product) return;
      if (product.stock <= 0) {
        toast.error("Producto agotado");
        return;
      }

      const isProductSerialized = product.isSerialized || product.hasImei;

      if (isProductSerialized && selectedSerials.length === 0) {
        setPendingSerialProduct(product);
        setSerialModalOpen(true);
        return;
      }

      setCart((prev) => {
        const exists = prev.find((p) => p.id === product.id);

        if (exists) {
          if (exists.quantity >= product.stock) {
            toast.error("No hay suficiente stock en almacén");
            return prev;
          }

          if (isProductSerialized) {
            const combinedSerials = Array.from(
              new Set([...(exists.selectedSerials || []), ...selectedSerials]),
            );
            return prev.map((p) =>
              p.id === product.id
                ? {
                    ...p,
                    quantity: combinedSerials.length,
                    selectedSerials: combinedSerials,
                  }
                : p,
            );
          }

          return prev.map((p) =>
            p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p,
          );
        }

        return [
          ...prev,
          {
            ...product,
            quantity: isProductSerialized ? selectedSerials.length : 1,
            selectedSerials: isProductSerialized ? selectedSerials : [],
          },
        ];
      });
    },
    [],
  );

  const handleProductScan = useCallback(
    async (code: string) => {
      try {
        const now = Date.now();
        if (now - lastScanRef.current < 1200) return;
        lastScanRef.current = now;

        const product = await findByBarcode(code);
        addToCart(product);
        playBeep();
        toast.success(`Agregado: ${product.name}`);
      } catch {
        try {
          const serialData = await getAvailableSerials(code);
          if (serialData && serialData.product) {
            addToCart(serialData.product, [code]);
            playBeep();
            toast.success(`IMEI Detectado: ${code}`);
            return;
          }
        } catch {
          toast.error("Código o IMEI no reconocido");
        }
      }
    },
    [cart, addToCart],
  );

  useBarcodeScanner(handleProductScan);

  const handleSearch = useCallback(async (value: string) => {
    setSearch(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    try {
      const data = await searchProducts(value);
      setResults(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Error en la búsqueda");
    }
  }, []);

  const increaseQty = useCallback((item: any) => {
    if (item.isSerialized || item.hasImei) {
      setPendingSerialProduct(item);
      setSerialModalOpen(true);
      return;
    }

    setCart((prev) =>
      prev.map((i) => {
        if (i.id !== item.id) return i;
        if (i.quantity >= i.stock) {
          toast.error("No hay más stock");
          return i;
        }
        return { ...i, quantity: i.quantity + 1 };
      }),
    );
  }, []);

  const decreaseQty = useCallback((id: string) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          if (item.isSerialized || item.hasImei) {
            const updatedSerials = [...(item.selectedSerials || [])];
            updatedSerials.pop();
            return {
              ...item,
              quantity: updatedSerials.length,
              selectedSerials: updatedSerials,
            };
          }
          return { ...item, quantity: item.quantity - 1 };
        })
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const price = Number(item.salePrice || 0);
      return acc + item.quantity * price;
    }, 0);
  }, [cart]);

  const taxRate = settings?.taxRate ?? 0; // Si no hay settings o es null, usamos 0
  const tax = useMemo(() => subtotal * (taxRate / 100), [subtotal, taxRate]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);
  async function handlePayment(data: any) {
    if (isProcessingRef.current) return;
    try {
      if (cart.length === 0) {
        toast.error("El carrito está vacío");
        return;
      }

      isProcessingRef.current = true;
      setLoading(true);

      const idempotencyKey = idempotencyRef.current ?? generateIdempotencyKey();
      idempotencyRef.current = idempotencyKey;

      const payload = {
        idempotencyKey,
        paymentMethod: data.paymentMethod,
        received: data.received,
        change: data.change,
        customTotal: data.customTotal,
        customerId: data.customerId,
        initialPayment: data.initialPayment,
        // 🔥 LÓGICA DE FLATMAP PARA PROCESAR SERIALES INDIVIDUALMENTE
        items: cart.flatMap((item) => {
          if (item.selectedSerials && item.selectedSerials.length > 0) {
            return item.selectedSerials.map((serial: string) => ({
              productId: item.id,
              quantity: 1,
              salePrice: item.salePrice,
              serialNumber: serial,
            }));
          }
          return [
            {
              productId: item.id,
              quantity: item.quantity,
              salePrice: item.salePrice,
              serialNumber: null,
            },
          ];
        }),
      };

      const sale = await createSale(payload);
      setCompletedSale(sale);
      sessionStorage.setItem("lastSaleId", sale.id);
      setCart([]);
      localStorage.removeItem("pos-cart");
      setSearch("");
      setResults([]);
      setPaymentOpen(false);
      setReceiptOpen(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Error al procesar el pago");
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
      idempotencyRef.current = null;
    }
  }

  if (loadingSession)
    return <div className="p-10">Cargando Caja Registradora...</div>;
  if (!cashSession) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-2xl font-bold text-gray-800">Caja Cerrada</h1>
        <p className="text-gray-500 mt-2">
          Debes abrir una sesión de caja antes de vender.
        </p>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 flex flex-col xl:flex-row overflow-hidden">
        {/* LEFT COMPONENT */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-white border-b px-6 py-4 flex justify-between">
            <div>
              <h1 className="text-gray-700 text-2xl font-bold">
                Punto de Venta
              </h1>
              <p className="text-sm text-gray-500">
                Escanea códigos de barras o selecciona productos
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="bg-gray-700 text-white px-5 py-3 rounded-2xl hover:opacity-90 transition"
              >
                Dashboard
              </Link>
              <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl">
                <ShoppingCart className="text-gray-700 w-4 h-4" />
                <span className="text-gray-700 text-sm font-semibold">
                  {cart.length} Artículos
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 flex-1 overflow-y-auto overscroll-contain">
            <CameraScanner onScanSuccess={handleProductScan} />

            <div className="relative mb-6">
              <Search className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                disabled={loading}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results.length > 0) {
                    addToCart(results[0]);
                    setSearch("");
                    setResults([]);
                  }
                }}
                placeholder="Buscar artículo o escanear..."
                className="text-gray-700 w-full bg-white border rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* GRID PRODUCTOS */}
            <div className="text-gray-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((product) => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white border rounded-2xl p-3 cursor-pointer hover:shadow transition relative overflow-hidden"
                >
                  {(product.isSerialized || product.hasImei) && (
                    <span className="absolute top-2 right-2 bg-blue-100 text-blue-700 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck size={10} /> IMEI
                    </span>
                  )}
                  <img
                    src={product.imageUrl || "/placeholder.png"}
                    className="text-gray-850 w-full aspect-square object-cover rounded-xl mb-2"
                  />
                  <div className="text-xs text-gray-500 mb-1">
                    Stock: {product.stock}
                  </div>
                  <h2 className="font-semibold text-sm truncate">
                    {product.name}
                  </h2>
                  <div className="flex justify-between mt-2 items-center">
                    <span className="font-bold text-gray-900">
                      RD${Number(product.salePrice).toFixed(2)}
                    </span>
                    <button className="text-xs bg-black text-white px-3 py-1.5 rounded-xl font-medium">
                      Agregar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR (CARRITO) */}
        <div className="w-full xl:w-[430px] bg-white border-l flex flex-col">
          <div className="p-6 border-b">
            <h2 className="text-gray-700 text-xl font-bold">Venta Actual</h2>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
            {cart.length === 0 && (
              <p className="text-center text-gray-400 mt-10">Carrito vacío</p>
            )}

            {cart.map((item) => (
              <div
                key={item.id}
                className="border rounded-2xl p-3 bg-white space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-gray-800 font-semibold text-sm">
                      {item.name}
                    </h3>
                    {item.selectedSerials?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {item.selectedSerials.map((serial: string) => (
                          <span
                            key={serial}
                            className="inline-flex items-center gap-1 font-mono text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-lg"
                          >
                            {serial}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => removeItem(item.id)}>
                    <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700 transition" />
                  </button>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <div className="text-gray-700 flex items-center gap-2">
                    <button
                      className="bg-gray-100 hover:bg-gray-200 text-black w-7 h-7 rounded-lg flex items-center justify-center font-bold"
                      onClick={() => decreaseQty(item.id)}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-mono font-bold text-sm w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      className="bg-gray-100 hover:bg-gray-200 text-black w-7 h-7 rounded-lg flex items-center justify-center font-bold"
                      onClick={() => increaseQty(item)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="text-gray-900 font-bold">
                    RD${(item.quantity * Number(item.salePrice)).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t p-6 space-y-3 bg-gray-50/50">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>RD${subtotal.toFixed(2)}</span>
            </div>

            {/* Condición: Solo mostrar si el taxRate es mayor a 0 */}
            {taxRate > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>ITBIS ({taxRate}%)</span>
                <span>RD${tax.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-xl font-bold border-t pt-2 text-gray-900">
              <span>Total</span>
              <span>RD${total.toFixed(2)}</span>
            </div>

            <button
              disabled={cart.length === 0 || loading}
              onClick={() => setPaymentOpen(true)}
              className="w-full bg-black hover:opacity-90 text-white py-4 rounded-2xl disabled:opacity-50 transition font-bold shadow-md"
            >
              <CreditCard className="inline w-5 h-5 mr-2" />
              {loading ? "Procesando cobro..." : "Proceder al Pago (F2)"}
            </button>
          </div>
        </div>

        {/* MODALS RENDER */}
        <PaymentModal
          open={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          total={total}
          onConfirm={handlePayment}
          loading={loading}
        />
        <ReceiptModal
          open={receiptOpen}
          sale={completedSale}
          onClose={() => setReceiptOpen(false)}
        />

        {serialModalOpen && pendingSerialProduct && (
          <SerialSelectionModal
            open={serialModalOpen}
            product={pendingSerialProduct}
            onClose={() => {
              setSerialModalOpen(false);
              setPendingSerialProduct(null);
            }}
            onConfirm={(selectedSerials) => {
              addToCart(pendingSerialProduct, selectedSerials);
              setSerialModalOpen(false);
              setPendingSerialProduct(null);
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
