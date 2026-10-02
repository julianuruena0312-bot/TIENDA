import React from 'react';
import {
  DollarSign,
  Package,
  ShoppingBag,
  AlertTriangle,
  ChevronRight,
  PlusCircle,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { ActiveTab } from './Navbar';
import { formatUnit } from '../utils/unitFormatter';

interface DashboardProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenProductModal: () => void;
  onOpenPurchaseModal: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  setActiveTab,
  onOpenProductModal,
  onOpenPurchaseModal,
}) => {
  const { products, sales, formatCurrency } = useBusiness();

  // 1. Calculations
  const activeSales = sales.filter((s) => s.status === 'completada');

  const totalSalesRevenue = activeSales.reduce((acc, sale) => acc + sale.total, 0);

  // Inventory valuation
  const inventoryCostValue = products.reduce((acc, p) => acc + p.costPrice * p.stock, 0);
  const inventorySaleValue = products.reduce((acc, p) => acc + p.salePrice * p.stock, 0);

  // Stock alerts
  const lowStockProducts = products.filter((p) => p.stock <= p.minStock);

  // Best selling products (sum of quantities from active sales)
  const productSalesCount: { [id: string]: { name: string; quantity: number; revenue: number } } = {};
  activeSales.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!productSalesCount[item.productId]) {
        productSalesCount[item.productId] = {
          name: item.productName,
          quantity: 0,
          revenue: 0,
        };
      }
      productSalesCount[item.productId].quantity += item.quantity;
      productSalesCount[item.productId].revenue += item.subtotal;
    });
  });

  const topProducts = Object.values(productSalesCount)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Recent sales transactions (last 6 completed sales sorted by date)
  const recentSales = activeSales.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header: Title and Action Buttons */}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Panel de Control</h1>
        <div className="flex flex-wrap items-center gap-3">
          <button
            id="dash-btn-pos"
            onClick={() => setActiveTab('pos')}
            className="flex items-center space-x-2.5 px-5 py-2.5 bg-[#C86D85] hover:bg-[#B3556E] text-white rounded-xl text-base font-semibold shadow-xs transition-all active:scale-[0.99]"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Registrar Venta</span>
          </button>
          <button
            id="dash-btn-product"
            onClick={onOpenProductModal}
            className="flex items-center space-x-2.5 px-5 py-2.5 bg-[#FFF5F7] hover:bg-[#FCE7EC] text-[#9E3E57] border border-[#F2BDCB] rounded-xl text-base font-semibold transition-all shadow-xs active:scale-[0.99]"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* KPI 1: Ventas Totales */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Ventas Totales</span>
            <div className="w-8 h-8 rounded-lg bg-[#FDF2F4] text-[#C86D85] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-stone-900 tracking-tight">
              {formatCurrency(totalSalesRevenue)}
            </div>
            <div className="flex items-center mt-1 text-xs text-stone-500">
              <span className="font-semibold text-[#A7455F] bg-[#FDF2F4] px-1.5 py-0.5 rounded mr-1.5">
                {activeSales.length} transacciones
              </span>
              <span>acumuladas</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Valor de Inventario Actual */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Valor Inventario (Costo)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-stone-900 tracking-tight">
              {formatCurrency(inventoryCostValue)}
            </div>
            <div className="flex items-center mt-1 text-xs text-stone-500">
              <span className="font-semibold text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded mr-1.5">
                {formatCurrency(inventorySaleValue)}
              </span>
              <span>valor en venta</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Alerts Banner if any low stock exists */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  {lowStockProducts.length} {lowStockProducts.length === 1 ? 'producto requiere' : 'productos requieren'} reabastecimiento urgente
                </h3>
                <p className="text-xs text-amber-700 mt-0.5">
                  Las existencias están por debajo del mínimo configurado. Evita perder ventas reabasteciendo a tiempo.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={onOpenPurchaseModal}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                Comprar Stock
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/50 rounded-lg text-xs font-semibold transition-colors"
              >
                Ver en Inventario
              </button>
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {lowStockProducts.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-amber-200 text-xs"
              >
                <div className="truncate pr-2">
                  <span className="font-semibold text-stone-800 block truncate">{item.name}</span>
                  <span className="text-[11px] text-stone-500">Mínimo: {item.minStock} {formatUnit(item.unit, item.minStock)}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[11px] shrink-0 ${
                    item.stock === 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {item.stock === 0 ? 'Agotado' : `${item.stock} ${formatUnit(item.unit, item.stock)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Top Selling Products & Quick Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Recent Sales & Purchases */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Sales */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:px-5 sm:py-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900 text-sm sm:text-base">Últimas Ventas Registradas</h3>
                <p className="text-xs text-stone-500">Transacciones completadas recientemente en mostrador</p>
              </div>
              <button
                onClick={() => setActiveTab('sales')}
                className="text-xs font-semibold text-[#C86D85] hover:text-[#B3556E] flex items-center space-x-1"
              >
                <span>Ver todas</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentSales.length === 0 ? (
              <div className="p-8 text-center text-stone-400 text-xs">No hay ventas registradas aún.</div>
            ) : (
              <div className="divide-y divide-stone-100">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-stone-50/80 transition-colors">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#FDF2F4] text-[#C86D85] flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-stone-900 text-xs sm:text-sm">{sale.invoiceNumber}</span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-600">
                            {sale.paymentMethod}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 truncate">
                          {sale.customerName} • {sale.items.length} {sale.items.length === 1 ? 'artículo' : 'artículos'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-[#A7455F] text-sm sm:text-base block">
                        +{formatCurrency(sale.total)}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {new Date(sale.date).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Top Selling Products & Inventory Valuation Health */}
        <div className="space-y-6">
          {/* Top Selling Products */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
            <h3 className="font-bold text-stone-900 text-sm sm:text-base">Productos Más Vendidos</h3>
            <p className="text-xs text-stone-500 mb-4">Mayor rotación y volumen de salida</p>

            {topProducts.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">Sin datos de ventas suficientes</p>
            ) : (
              <div className="space-y-3.5">
                {topProducts.map((p, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-stone-800 truncate pr-2">{p.name}</span>
                      <span className="text-stone-900 shrink-0">{p.quantity} vendidos</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#C86D85] h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (p.quantity / (topProducts[0]?.quantity || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-[11px] text-stone-400 text-right">
                      Ingresos: {formatCurrency(p.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
