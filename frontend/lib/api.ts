import Cookies from "js-cookie";

const API = process.env.NEXT_PUBLIC_API_URL;
export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING' | 'INCOMPLETE';
// =========================
// TOKEN (Sincronizado con Cookies)
// =========================
export function getToken() {
  return Cookies.get("token") || null;
}

// =========================
// CORE REQUEST
// =========================
async function request(endpoint: string, options: RequestInit = {}) {

  console.log(endpoint);

  console.log(options.body);
  const isAuthEndpoint =
    endpoint.includes("/auth/login") ||
    endpoint.includes("/auth/register") ||
    endpoint.includes("/auth/forgot-password") ||
    endpoint.includes("/auth/reset-password");

  const token = getToken();

  // DETECCIÓN: Es FormData si el body es instancia de FormData
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    // ⚠️ IMPORTANTE: Solo ponemos JSON si NO es FormData.
    // Si es FormData, dejamos que el navegador ponga el Content-Type (y el boundary)
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as any),
  };

  // Solo inyectamos el token si no es un endpoint público
  if (!isAuthEndpoint && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  // ... (resto de tu lógica de respuesta sigue igual)
  let data: any = null;
  const contentType = res.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Request failed");
  }

  return data;
}
// =========================
// AUTH
// =========================
export async function login(data: any) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function register(data: any) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export const me = () => request("/auth/me");

// =========================
// SETTINGS
// =========================
export const getSettings = () => request("/settings");

export const updateSettings = (data: any) =>
  request("/settings", {
    method: "PATCH",
    body: JSON.stringify(data),
  });

// =========================
// DASHBOARD
// =========================
export const getDashboard = (range: string) =>
  request(`/sales/dashboard?range=${range}`);

// =========================
// CASH
// =========================
// 🔥 CORREGIDO: Ahora apunta a /cash/summary para heredar expectedCash y totalCreditPayments en el Dashboard
export const getCashSession = () =>
  request("/cash/summary");

export const getCashSummary = () =>
  request("/cash/summary");

// 🔥 NUEVO: Endpoint útil por si quieres mapear el historial de cajas en el futuro
export const getCashHistory = () =>
  request("/cash/history");

export const openCash = (openingAmount: number) =>
  request("/cash/open", {
    method: "POST",
    body: JSON.stringify({ openingAmount }),
  });

export const closeCash = (actualCash: number, note?: string) =>
  request("/cash/close", {
    method: "POST",
    body: JSON.stringify({ actualCash, note }), // Ahora enviamos el objeto completo
  });



// =========================
// SALES (extra útil)
// =========================
export const getSales = (
  page = 1,
  limit = 10,
  search = "",
  paymentMethod = "ALL",
  dateRange = "ALL"
) => {
  // Construimos los queries de forma dinámica
  const query = `?page=${page}&limit=${limit}&search=${search}&paymentMethod=${paymentMethod}&dateRange=${dateRange}`;
  return request(`/sales${query}`);
};



// =========================
// PRODUCTS
// =========================
export const getProducts = () => request("/products");

export const createProduct = (data: any) =>
  request("/products", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateProduct = (id: string, data: any) =>
  request(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const getProduct = (id: string) =>
  request(`/products/${id}`);



// =========================
// STOCK (UPDATE STOCK)
// =========================
export const updateProductStock = (
  id: string,
  quantity: number
) =>
  request(`/products/${id}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });

export async function getLowStockProducts() {
  return request("/products/low-stock");
}

// =========================
// TOGGLE ACTIVE (DISABLE / ENABLE)
// =========================
export const toggleProduct = (id: string) =>
  request(`/products/${id}/toggle`, {
    method: "PATCH",
  });

// =========================
// INVENTORY ACTIONS (Restock & Write-off)
// =========================

// Usamos el endpoint del controlador /inventory que creamos
export const restockProduct = (
  productId: string,
  quantity: number,
  note?: string
) =>
  request(`/inventory/restock/${productId}`, {
    method: "POST",
    body: JSON.stringify({ quantity, note }),
  });

export const writeOffProduct = (
  productId: string,
  quantity: number,
  reason: string
) =>
  request(`/inventory/write-off/${productId}`, {
    method: "POST",
    body: JSON.stringify({ quantity, reason }),
  });

export async function getPurchaseRecommendations() {
  return request("/products/purchase-recommendations");
}

export async function generateAutoPurchases() {
  return request("/products/auto-purchases");
}

export async function generateAutoPurchaseDrafts() {
  return request("/purchases/auto-generate");
}
// =========================
// EXPENSES
// =========================
export const getExpenses = () => request("/expenses");

export const createExpense = (data: any) =>
  request("/expenses", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const deleteExpense = (id: string) =>
  request(`/expenses/${id}`, {
    method: "DELETE",
  });


// =========================
// SEARCH PRODUCTS
// =========================
export const searchProducts = (query: string) =>
  request(`/products/search?q=${encodeURIComponent(query)}`);


export const createSale = (data: any) =>
  request("/sales", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getSalesExport = (paymentMethod = "ALL", dateRange = "ALL") => {
  return request(`/sales/export?paymentMethod=${paymentMethod}&dateRange=${dateRange}`);
};

// =========================
// SUPPLIERS
// =========================
export const getSuppliers = () => request("/suppliers");

export const getSupplier = (id: string) =>
  request(`/suppliers/${id}`);

export const createSupplier = (data: any) =>
  request("/suppliers", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateSupplier = (id: string, data: any) =>
  request(`/suppliers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteSupplier = (id: string) =>
  request(`/suppliers/${id}`, {
    method: "DELETE",
  });

// =========================
// PURCHASES
// =========================
export const getPurchases = () => request("/purchases");

export const getPurchase = (id: string) =>
  request(`/purchases/${id}`);

export const createPurchase = (data: any) =>
  request("/purchases", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updatePurchase = (id: string, data: any) =>
  request(`/purchases/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deletePurchase = (id: string) =>
  request(`/purchases/${id}`, {
    method: "DELETE",
  });

export const findByBarcode = (code: string) =>
  request(`/products/barcode/${code}`);

// =========================
// SEARCH PRODUCTS
// =========================




// Reemplaza tu función actual por esta versión simplificada y segura
export async function getInventoryMovements(page = 1, limit = 20, search = "") {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    search,
  });
  return request(`/inventory/movements?${query.toString()}`);
}


// =========================
// USERS
// =========================

export async function getUsers() {
  return request("/users");
}

export async function getUser(id: string) {
  return request(`/users/${id}`);
}

export async function createUser(data: any) {
  return request("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateUser(id: string, data: any) {
  return request(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function toggleUser(id: string) {
  return request(`/users/${id}/toggle-active`, {
    method: "PATCH",
  });
}

export async function getOverviewReport() {
  return request("/reports/overview");
}

// =========================
// CUSTOMERS
// =========================
export const getCustomers = () => request("/customers");

export const createCustomer = (data: any) =>
  request("/customers", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateCustomer = (id: string, data: any) => request(`/customers/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const toggleCustomer = (id: string) => request(`/customers/${id}/toggle`, { method: "PATCH" });

export const recordPayment = (customerId: string, data: { amount: number; note?: string }) =>
  request(`/customers/${customerId}/payment`, { method: "POST", body: JSON.stringify(data) });

export const trackImei = (serialNumber: string) =>
  request(`/imei-tracker/${serialNumber}`);

export const getPurchaseById = (id: string) => request(`/purchases/${id}`);


// ==========================================
// SERVICE ORDERS (MÓDULO DE TALLER)
// ==========================================
export const getServiceOrders = () => request("/service-orders");

export const getServiceOrder = (id: string) => request(`/service-orders/${id}`);

export const createServiceOrder = (data: any) =>
  request("/service-orders", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const addServiceItem = (orderId: string, data: { productId: string; quantity: number }) =>
  request(`/service-orders/${orderId}/items`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const removeServiceItem = (orderId: string, itemId: string) =>
  request(`/service-orders/${orderId}/items/${itemId}`, {
    method: "DELETE",
  });

export const updateLaborCost = (orderId: string, laborCost: number) =>
  request(`/service-orders/${orderId}/labor-cost`, {
    method: "PATCH",
    body: JSON.stringify({ laborCost }),
  });

export const updateServiceStatus = (orderId: string, data: { status: string; note: string }) =>
  request(`/service-orders/${orderId}/status`, {
    method: "PATCH", // Asegúrate de que coincida con el @Patch del controlador
    body: JSON.stringify(data),
  });

export const updateServiceOrder = (orderId: string, data: {
  deviceBrand?: string;
  deviceModel?: string;
  serialOrImei?: string;
  problem?: string;
  diagnostic?: string;
  repairSolution?: string;
  estimatedRepairTime?: string;
  customerApproved?: boolean;
}) =>
  request(`/service-orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });


// ==========================================
// ENDPOINTS PARA CONTROL DE SERIALES / IMEIS
// ==========================================

/**
 * Busca un serial/IMEI específico en el inventario general que esté disponible (isSold: false).
 * Se dispara cuando el cajero escanea un IMEI directo en la barra de búsqueda del POS.
 * @param serial string del IMEI o serial escaneado
 * @returns Retorna un objeto con el { product, serialString }
 */
export const getAvailableSerials = (serial: string): Promise<{ product: any; serialString: string }> =>
  request(`/products/serials/${serial}/available`);

/**
 * Trae la lista completa de seriales/IMEIs en inventario disponibles para un producto específico.
 * Se dispara al abrir el modal de selección de seriales dentro del POS.
 * @param productId ID del producto a consultar
 * @returns Array de strings con los seriales disponibles (ej: ["990012...", "990013..."])
 */
export const getAvailableSerialsByProductId = (productId: string): Promise<string[]> =>
  request(`/products/${productId}/serials`); // 👈 Alineado a la ruta REST estándar de NestJS

// =========================
// SEQUENCES (NCF)
// =========================
export const getSequences = () =>
  request("/settings/sequences");

export const activateSequence = (id: string) =>
  request(`/settings/sequences/${id}/activate`, {
    method: "PATCH",
  });

// =========================
// SUBSCRIPTION
// =========================

export const createCheckoutSession = (priceId: string) =>
  request("/subscription/create-checkout-session", {
    method: "POST",
    body: JSON.stringify({ priceId }), // Serializamos el objeto
  });

export const completeServiceOrder = (orderId: string) =>
  request(`/service-orders/${orderId}/complete`, {
    method: "PATCH",
  });

// =========================
// AUTH (Recuperación de contraseña)
// =========================

export async function forgotPassword(email: string) {
  return request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string) {
  return request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

// =========================
// INVITATIONS (Sincronizadas con prefijo /auth)
// =========================

/**
 * Genera un nuevo token de invitación.
 * Requiere permisos de administrador.
 */
export const generateInvitation = () =>
  request("/auth/generate-invitation", {
    method: "POST",
  });

/**
 * Obtiene el listado de todas las invitaciones generadas.
 * Requiere permisos de administrador.
 */
export const getInvitations = () =>
  request("/auth/invitations");

/**
 * Valida un token de invitación antes del registro.
 */
export const validateInvitationToken = (token: string) =>
  request(`/auth/validate-invitation/${token}`);

// =========================
// SUBSCRIPTION: PAGOS MANUALES
// =========================

/**
 * Sube un comprobante de pago manual (transferencia).
 * El parámetro 'data' debe ser un objeto FormData con los campos:
 * 'amount', 'referenceNumber' y 'file'.
 */
// lib/api.ts
export const uploadReceipt = (data: any) =>
  request("/subscription/upload-receipt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json", // El servidor DEBE recibir esto
    },
    body: JSON.stringify(data),
  });

// En lib/api.ts
export const getPendingPayments = () => request("/subscription/pending-payments");

/**
 * Aprueba un pago manual y actualiza la cookie a ACTIVE
 */
export const approveManualPayment = async (
  businessId: string,
  paymentLogId: string,
  planType: 'SUBSCRIPTION' | 'LIFETIME' = 'SUBSCRIPTION'
) => {
  const result = await request(`/subscription/approve/${businessId}/${paymentLogId}`, {
    method: "POST",
    body: JSON.stringify({ planType })
  });

  // Cuando aprobamos un pago, el estatus resultante SIEMPRE es ACTIVE
  Cookies.set("subStatus", "ACTIVE", { expires: 7, path: '/' });

  return result;
};

/**
 * Toggle (Cambio de switch)
 * Actualiza la base de datos y la cookie al mismo tiempo
 */
export const toggleSubscriptionStatus = async (businessId: string, status: SubscriptionStatus) => {
  const result = await request(`/subscription/toggle-status/${businessId}`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });

  // Sincronizamos la cookie con el nuevo estado del switch
  Cookies.set("subStatus", status, { expires: 7, path: '/' });

  return result;
};

/**
* Obtiene el listado de todas las suscripciones con la información del negocio relacionado.
*/
export const getAllSubscriptions = () => request("/subscription/all-subscriptions");

/**
 * Actualización de plan completa
 */
export const updateSubscriptionPlan = async (
  businessId: string,
  data: {
    accessType: 'SUBSCRIPTION' | 'LIFETIME',
    subscriptionStatus: 'ACTIVE' | 'CANCELED'
  }
) => {
  const result = await request(`/subscription/update-plan/${businessId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

  // Sincronizamos la cookie
  Cookies.set("subStatus", data.subscriptionStatus, { expires: 7, path: '/' });

  return result;
};