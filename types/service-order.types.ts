export interface ServiceOrder {
    id: string;
    ticketNumber: string;
    businessId: string;
    customerId: string;
    technicianId?: string;
    deviceBrand: string;
    deviceModel: string;
    serialOrImei?: string;
    problem: string;
    diagnostic?: string;
    laborCost: number;
    totalAmount: number;
    status: 'RECEIVED' | 'DIAGNOSING' | 'WAITING_PARTS' | 'REPAIRED' | 'DELIVERED' | 'CANCELLED';
    createdAt: string;
    updatedAt: string;
    items?: ServiceItem[];
}

export interface ServiceItem {
    id: string;
    productId: string;
    product?: { name: string; salePrice: number };
    quantity: number;
    priceUnit: number;
}