export type UnitType = 'unidad' | 'paquete' | 'caja' | 'kg' | 'litro' | 'metro' | 'par';

export interface Product {
  id: string;
  code: string; // SKU or Barcode
  name: string;
  category: string;
  costPrice: number; // Costo de compra
  salePrice: number; // Precio de venta al público
  stock: number; // Existencias actuales
  minStock: number; // Alerta de stock mínimo
  unit: UnitType;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  code: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  date: string;
  supplierName: string;
  items: PurchaseItem[];
  total: number;
  paymentMethod: 'efectivo' | 'transferencia' | 'tarjeta' | 'credito';
  notes?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  code: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  seller?: 'Isa' | 'Vivi' | string;
  paidTo?: 'Isa' | 'Juli' | string;
  deliveryFee?: number;
  deliveryPaidTo?: 'Isa' | 'Juli' | string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'efectivo' | 'tarjeta' | 'nequi' | 'daviplata' | 'bancolombia' | 'llave' | 'transferencia' | 'otro';
  notes?: string;
  status: 'completada' | 'anulada';
}

export interface StockMovement {
  id: string;
  date: string;
  type: 'compra' | 'venta' | 'ajuste_manual' | 'anulacion_venta';
  productId: string;
  productName: string;
  quantityChange: number; // positive or negative
  previousStock: number;
  newStock: number;
  referenceId?: string; // invoice or sale ID
  notes?: string;
}

export interface BusinessConfig {
  businessName: string;
  ownerName: string;
  phone: string;
  address: string;
  currency: string;
  taxRate: number; // e.g. 0 or 16% (optional)
}
