import React, { useState, useMemo } from 'react';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  Download,
  Printer,
  Sparkles,
  ShoppingBag,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  Layers,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { Sale } from '../types';

export const SalesSummary: React.FC = () => {
  const { sales, products, formatCurrency } = useBusiness();

  // Helper date generators
  const getTodayStr = () => new Date().toISOString().slice(0, 10);
  const getDaysAgoStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  };
  const getFirstDayOfMonthStr = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  };
  const getFirstDayOfPrevMonthStr = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 10);
  };
  const getLastDayOfPrevMonthStr = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 0).toISOString().slice(0, 10);
  };

  // Filter States
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | '7days' | 'month' | 'prevMonth' | 'all' | 'custom'>('month');
  const [startDate, setStartDate] = useState<string>(getFirstDayOfMonthStr);
  const [endDate, setEndDate] = useState<string>(getTodayStr);
  const [paidToFilter, setPaidToFilter] = useState<'all' | 'Juli' | 'Isa'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');

  // Handle Preset changes
  const applyPreset = (preset: 'today' | 'yesterday' | '7days' | 'month' | 'prevMonth' | 'all') => {
    setDatePreset(preset);
    const today = getTodayStr();

    switch (preset) {
      case 'today':
        setStartDate(today);
        setEndDate(today);
        break;
      case 'yesterday': {
        const yest = getDaysAgoStr(1);
        setStartDate(yest);
        setEndDate(yest);
        break;
      }
      case '7days':
        setStartDate(getDaysAgoStr(7));
        setEndDate(today);
        break;
      case 'month':
        setStartDate(getFirstDayOfMonthStr());
        setEndDate(today);
        break;
      case 'prevMonth':
        setStartDate(getFirstDayOfPrevMonthStr());
        setEndDate(getLastDayOfPrevMonthStr());
        break;
      case 'all':
        setStartDate('');
        setEndDate('');
        break;
    }
  };

  // Filtered sales (exclude voided sales from financial performance)
  const activeSales = useMemo(() => {
    return sales.filter((s) => s.status !== 'anulada');
  }, [sales]);

  const filteredSales = useMemo(() => {
    return activeSales.filter((s) => {
      const saleDateOnly = s.date.slice(0, 10);

      // Date range filter
      if (startDate && saleDateOnly < startDate) return false;
      if (endDate && saleDateOnly > endDate) return false;

      // Paid to filter
      if (paidToFilter !== 'all') {
        const salePaidTo = (s.paidTo || 'Isa').trim().toLowerCase();
        if (salePaidTo !== paidToFilter.toLowerCase()) return false;
      }

      // Payment method filter
      if (paymentMethodFilter !== 'all') {
        if (s.paymentMethod !== paymentMethodFilter) return false;
      }

      return true;
    });
  }, [activeSales, startDate, endDate, paidToFilter, paymentMethodFilter]);

  // Aggregate Calculations
  const summaryMetrics = useMemo(() => {
    let totalSalesRevenue = 0;
    let totalDeliveryRevenue = 0;
    let totalDeliveryIsa = 0;
    let totalDeliveryJuli = 0;
    let totalCostOfSoldItems = 0;
    let totalProfit = 0;
    let isabellaTotal = 0;
    let vivianTotal = 0;
    let itemsCount = 0;

    const methodBreakdown: Record<string, { count: number; total: number }> = {
      nequi: { count: 0, total: 0 },
      daviplata: { count: 0, total: 0 },
      bancolombia: { count: 0, total: 0 },
      llave: { count: 0, total: 0 },
      efectivo: { count: 0, total: 0 },
      tarjeta: { count: 0, total: 0 },
      otro: { count: 0, total: 0 },
    };

    filteredSales.forEach((sale) => {
      const dFee = sale.deliveryFee || 0;
      totalSalesRevenue += (sale.total - dFee);

      // Delivery tracking
      if (dFee > 0) {
        totalDeliveryRevenue += dFee;
        const dPaidTo = (sale.deliveryPaidTo || sale.paidTo || 'Isa').trim().toLowerCase();
        if (dPaidTo === 'juli') {
          totalDeliveryJuli += dFee;
        } else {
          totalDeliveryIsa += dFee;
        }
      }

      // Count items and purchase costs
      let saleCost = 0;
      sale.items.forEach((it) => {
        itemsCount += it.quantity;
        const prod = products.find((p) => p.id === it.productId);
        const cost = it.unitCost !== undefined && it.unitCost > 0
          ? it.unitCost
          : (prod?.costPrice ?? 0);
        saleCost += cost * it.quantity;
      });
      totalCostOfSoldItems += saleCost;

      // Profit calculations based on who sold the product
      const isSoldByVivi = (sale.seller || '').trim().toLowerCase() === 'vivi';
      const saleProductRevenue = sale.total - dFee;
      const profitOnProducts = Math.max(0, saleProductRevenue - saleCost);

      totalProfit += profitOnProducts;

      if (isSoldByVivi) {
        isabellaTotal += saleCost + (profitOnProducts / 2);
        vivianTotal += (profitOnProducts / 2);
      } else {
        isabellaTotal += (sale.total - dFee);
      }

      // Payment method breakdown
      const m = sale.paymentMethod || 'otro';
      if (!methodBreakdown[m]) {
        methodBreakdown[m] = { count: 0, total: 0 };
      }
      methodBreakdown[m].count += 1;
      methodBreakdown[m].total += sale.total;
    });

    return {
      ordersCount: filteredSales.length,
      itemsCount,
      totalSalesRevenue,
      totalDeliveryRevenue,
      totalDeliveryIsa,
      totalDeliveryJuli,
      totalCostOfSoldItems,
      totalProfit,
      isabellaTotal,
      vivianTotal,
      methodBreakdown,
    };
  }, [filteredSales, products]);

  // Export filtered summary to CSV
  const handleExportSummaryCSV = () => {
    const headers = [
      'Folio',
      'Fecha',
      'Artículos',
      'Cantidad',
      'Pago A',
      'Medio Pago',
      'Domicilio ($)',
      'Domicilio Pago A',
      'Total Venta',
      'Ganancia',
      'Isabella',
      'Vivian',
    ];

    const rows = filteredSales.map((s) => {
      const itemsStr = s.items.map((it) => `${it.quantity}x ${it.productName}`).join('; ');
      const totalUnits = s.items.reduce((acc, it) => acc + it.quantity, 0);
      const isPaidToJuli = (s.paidTo || '').trim().toLowerCase() === 'juli';

      const dFee = s.deliveryFee || 0;
      const dPaidTo = s.deliveryPaidTo || s.paidTo || 'Isa';

      const totalCost = s.items.reduce((acc, it) => {
        const prod = products.find((p) => p.id === it.productId);
        const cost = it.unitCost !== undefined && it.unitCost > 0 ? it.unitCost : (prod?.costPrice ?? 0);
        return acc + (cost * it.quantity);
      }, 0);

      const profit = (s.total - dFee) - totalCost;
      const isSoldByVivi = (s.seller || '').trim().toLowerCase() === 'vivi';
      const isa = isSoldByVivi ? totalCost + (profit / 2) : (s.total - dFee);
      const viv = isSoldByVivi ? profit / 2 : 0;

      return [
        `"${s.invoiceNumber}"`,
        `"${new Date(s.date).toLocaleDateString('es-CO')}"`,
        `"${itemsStr.replace(/"/g, '""')}"`,
        totalUnits,
        `"${s.paidTo || 'Isa'}"`,
        `"${s.paymentMethod}"`,
        dFee,
        `"${dPaidTo}"`,
        Math.round(s.total),
        Math.round(profit),
        Math.round(isa),
        Math.round(viv),
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `resumen_ganancias_${startDate || 'inicio'}_al_${endDate || 'hoy'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const resetAllFilters = () => {
    applyPreset('month');
    setPaidToFilter('all');
    setPaymentMethodFilter('all');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FDF2F4] text-[#C86D85] flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Resumen Financiero y Ganancias</h1>
              <p className="text-xs text-stone-500 mt-0.5">
                Control dinámico de ventas, márgenes y distribución para Isabella y Vivian.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 print:hidden">
          <button
            onClick={handleExportSummaryCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
            title="Exportar ventas y distribución a CSV"
          >
            <Download className="w-4 h-4 text-stone-500" />
            <span>Exportar Resumen</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-stone-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Interactive Filters Panel */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5 space-y-4 print:hidden">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center space-x-2 text-stone-800 font-bold text-sm">
            <Filter className="w-4 h-4 text-[#C86D85]" />
            <span>Filtros Interactivos</span>
          </div>
          {(datePreset !== 'month' || paidToFilter !== 'all' || paymentMethodFilter !== 'all') && (
            <button
              onClick={resetAllFilters}
              className="text-xs text-[#C86D85] hover:text-[#9E3E57] font-semibold flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restablecer Filtros</span>
            </button>
          )}
        </div>

        {/* 1. Date Range Quick Selector */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-2">Rango de Fecha</label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'today', label: 'Hoy' },
              { id: 'yesterday', label: 'Ayer' },
              { id: '7days', label: 'Últimos 7 días' },
              { id: 'month', label: 'Este Mes' },
              { id: 'prevMonth', label: 'Mes Anterior' },
              { id: 'all', label: 'Todo el Historial' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  datePreset === p.id
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70 hover:text-stone-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-stone-100">
            <div>
              <span className="block text-[11px] font-medium text-stone-500 mb-1">Fecha Desde:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setStartDate(e.target.value);
                }}
                className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 focus:ring-2 focus:ring-stone-500/20 focus:border-stone-500"
              />
            </div>
            <div>
              <span className="block text-[11px] font-medium text-stone-500 mb-1">Fecha Hasta:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setEndDate(e.target.value);
                }}
                className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 focus:ring-2 focus:ring-stone-500/20 focus:border-stone-500"
              />
            </div>
          </div>
        </div>

        {/* 2. Paid To & Payment Method Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-stone-100">
          {/* A quién se le pagó */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-2">
              A quién se le pagó la venta
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPaidToFilter('all')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                  paidToFilter === 'all'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setPaidToFilter('Juli')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${
                  paidToFilter === 'Juli'
                    ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                    : 'bg-teal-50/70 text-teal-800 border-teal-200 hover:bg-teal-100'
                }`}
                title="Ventas pagadas a Juli (Generan reparto de ganancia)"
              >
                Pago a Juli
              </button>
              <button
                type="button"
                onClick={() => setPaidToFilter('Isa')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${
                  paidToFilter === 'Isa'
                    ? 'bg-purple-800 text-white border-purple-900 shadow-xs'
                    : 'bg-purple-50/70 text-purple-800 border-purple-200 hover:bg-purple-100'
                }`}
                title="Ventas pagadas a Isa (Solo total)"
              >
                Pago a Isa
              </button>
            </div>
          </div>

          {/* Medio de pago */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-2">
              Medio de Pago
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'nequi', label: 'Nequi' },
                { id: 'daviplata', label: 'Daviplata' },
                { id: 'bancolombia', label: 'Bancolombia' },
                { id: 'llave', label: 'Llave' },
                { id: 'efectivo', label: 'Efectivo' },
                { id: 'tarjeta', label: 'Tarjeta' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethodFilter(m.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all uppercase ${
                    paymentMethodFilter === m.id
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main KPI Cards: Isabella & Vivian Highlighted */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ventas */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider">Ventas Totales</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-stone-900">
            {formatCurrency(summaryMetrics.totalSalesRevenue)}
          </div>
          <div className="text-xs text-stone-500 pt-1 flex items-center justify-between">
            <span>{summaryMetrics.ordersCount} ventas</span>
            <span>{summaryMetrics.itemsCount} productos</span>
          </div>
        </div>

        {/* Ganancia Total en Ventas Juli */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider">Ganancia Repartible</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
            {formatCurrency(summaryMetrics.totalProfit)}
          </div>
          <p className="text-[11px] text-stone-500 pt-1">
            Diferencia Venta - Compra en pagos a Juli (50% Isa / 50% Vivian)
          </p>
        </div>

        {/* Dinero para Isabella */}
        <div className="bg-gradient-to-br from-purple-50/90 to-purple-100/50 p-5 rounded-2xl border border-purple-200 shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-purple-900">
            <span className="text-xs font-black uppercase tracking-wider">Dinero para Isabella</span>
            <span className="px-2 py-0.5 bg-purple-200/80 text-purple-900 rounded-md text-[10px] font-bold">
              Sin Domicilio
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-900">
            {formatCurrency(summaryMetrics.isabellaTotal)}
          </div>
          <p className="text-[11px] text-purple-800 pt-1 font-medium">
            100% ventas de Isa | Costo + mitad ganancia en ventas de Vivi
          </p>
        </div>

        {/* Dinero para Vivian */}
        <div className="bg-gradient-to-br from-teal-50/90 to-teal-100/50 p-5 rounded-2xl border border-teal-200 shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-teal-900">
            <span className="text-xs font-black uppercase tracking-wider">Ganancia para Vivian</span>
            <span className="px-2 py-0.5 bg-teal-200/80 text-teal-900 rounded-md text-[10px] font-bold">
              Sin Domicilio
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-teal-900">
            {formatCurrency(summaryMetrics.vivianTotal)}
          </div>
          <p className="text-[11px] text-teal-800 pt-1 font-medium">
            La mitad de la ganancia generada en ventas de Vivi
          </p>
        </div>
      </div>

      {/* Domicilios & Medios de Pago Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Domicilios Resumen */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-stone-800 font-bold text-sm">
              <Truck className="w-4 h-4 text-[#C86D85]" />
              <span>Resumen de Domicilios</span>
            </div>
            <span className="text-xs font-extrabold text-stone-900">
              Total: {formatCurrency(summaryMetrics.totalDeliveryRevenue)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-3">
              <span className="text-[11px] font-bold text-purple-900 block">Pagados a Isa</span>
              <span className="text-lg font-bold text-purple-900">
                {formatCurrency(summaryMetrics.totalDeliveryIsa)}
              </span>
            </div>
            <div className="bg-teal-50/60 border border-teal-100 rounded-xl p-3">
              <span className="text-[11px] font-bold text-teal-900 block">Pagados a Juli</span>
              <span className="text-lg font-bold text-teal-900">
                {formatCurrency(summaryMetrics.totalDeliveryJuli)}
              </span>
            </div>
          </div>
        </div>

        {/* Medios de Pago Resumen */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-stone-800 font-bold text-sm">
              <CreditCard className="w-4 h-4 text-[#C86D85]" />
              <span>Desglose por Medio de Pago</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
            {['nequi', 'daviplata', 'bancolombia', 'llave', 'efectivo', 'tarjeta'].map((method) => {
              const data = summaryMetrics.methodBreakdown[method] || { count: 0, total: 0 };
              return (
                <div key={method} className="bg-stone-50 border border-stone-200/80 rounded-xl p-2.5">
                  <div className="flex items-center justify-between text-stone-500 uppercase text-[10px] font-bold">
                    <span>{method}</span>
                    <span className="text-stone-400">({data.count})</span>
                  </div>
                  <div className="font-bold text-stone-900 text-sm mt-0.5">
                    {formatCurrency(data.total)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filtered Sales List Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden space-y-0">
        <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-stone-50/50">
          <div>
            <h3 className="font-bold text-stone-900 text-sm">Ventas del Período Seleccionado</h3>
            <p className="text-xs text-stone-500">
              Mostrando {filteredSales.length} órdenes que cumplen con los filtros.
            </p>
          </div>
          <div className="text-xs text-stone-600 font-medium">
            Rango: <span className="font-bold text-stone-900">{startDate || 'Inicio'}</span> a <span className="font-bold text-stone-900">{endDate || 'Hoy'}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Folio</th>
                <th className="py-3 px-4">Artículo</th>
                <th className="py-3 px-3 text-center">Cant.</th>
                <th className="py-3 px-3 text-center">Pago a</th>
                <th className="py-3 px-3 text-center">Domicilio</th>
                <th className="py-3 px-3 text-center leading-tight">
                  <div>MEDIO</div>
                  <div>PAGO</div>
                </th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right text-emerald-800">Ganancia</th>
                <th className="py-3 px-4 text-right text-purple-800">Isabella</th>
                <th className="py-3 px-4 text-right text-teal-800">Vivian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-stone-400">
                    <p className="font-medium text-stone-600">No se encontraron ventas para este rango o filtros</p>
                    <p className="text-xs text-stone-400 mt-1">
                      Intenta seleccionar otro rango de fecha o restablecer los filtros.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const totalUnits = sale.items.reduce((acc, it) => acc + it.quantity, 0);
                  const isPaidToJuli = (sale.paidTo || '').trim().toLowerCase() === 'juli';

                  const dFee = sale.deliveryFee || 0;
                  const dPaidTo = sale.deliveryPaidTo || sale.paidTo || 'Isa';

                  const totalCost = sale.items.reduce((acc, it) => {
                    const prod = products.find((p) => p.id === it.productId);
                    const unitCost = it.unitCost !== undefined && it.unitCost > 0
                      ? it.unitCost
                      : (prod?.costPrice ?? 0);
                    return acc + (unitCost * it.quantity);
                  }, 0);

                  const profit = (sale.total - dFee) - totalCost;

                  const isSoldByVivi = (sale.seller || '').trim().toLowerCase() === 'vivi';
                  const isabellaShare = isSoldByVivi
                    ? totalCost + (profit / 2)
                    : (sale.total - dFee);
                  const vivianShare = isSoldByVivi
                    ? (profit / 2)
                    : 0;

                  return (
                    <tr key={sale.id} className="hover:bg-stone-50/60 transition-colors">
                      {/* Fecha */}
                      <td className="py-3 px-4 text-xs text-stone-600 whitespace-nowrap">
                        {new Date(sale.date).toLocaleDateString('es-CO', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {/* Folio */}
                      <td className="py-3 px-4 text-xs font-mono text-stone-500 whitespace-nowrap">
                        {sale.invoiceNumber}
                      </td>

                      {/* Artículos */}
                      <td className="py-3 px-4 text-xs">
                        {sale.items.length === 1 ? (
                          <span className="font-semibold text-stone-900">{sale.items[0].productName}</span>
                        ) : (
                          <div className="space-y-0.5">
                            {sale.items.map((it, idx) => (
                              <div key={idx} className="font-semibold text-stone-900 text-xs">
                                {it.productName}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Cantidad */}
                      <td className="py-3 px-3 text-center text-xs whitespace-nowrap">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md font-bold text-xs bg-stone-100 text-stone-800">
                          {totalUnits}
                        </span>
                      </td>

                      {/* Pago a */}
                      <td className="py-3 px-3 text-center text-xs whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            (sale.paidTo || 'Isa') === 'Isa'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-teal-100 text-teal-800 border border-teal-200'
                          }`}
                        >
                          {sale.paidTo || 'Isa'}
                        </span>
                      </td>

                      {/* Domicilio */}
                      <td className="py-3 px-3 text-center text-xs whitespace-nowrap">
                        {dFee > 0 ? (
                          <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-stone-100 text-stone-800 font-semibold text-[11px]">
                            <span>{formatCurrency(dFee)}</span>
                            <span className="text-[10px] text-stone-500">({dPaidTo})</span>
                          </div>
                        ) : (
                          <span className="text-stone-300 font-normal">—</span>
                        )}
                      </td>

                      {/* Medio Pago */}
                      <td className="py-3 px-3 text-center text-xs whitespace-nowrap">
                        <span className="uppercase font-bold text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                          {sale.paymentMethod}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 text-right font-bold text-stone-900 whitespace-nowrap">
                        {formatCurrency(sale.total)}
                      </td>

                      {/* Ganancia */}
                      <td className="py-3 px-4 text-right text-xs whitespace-nowrap">
                        <span className="font-bold text-emerald-700">
                          {formatCurrency(profit)}
                        </span>
                      </td>

                      {/* Isabella */}
                      <td className="py-3 px-4 text-right text-xs whitespace-nowrap">
                        <span className="font-bold text-purple-800">
                          {formatCurrency(isabellaShare)}
                        </span>
                      </td>

                      {/* Vivian */}
                      <td className="py-3 px-4 text-right text-xs whitespace-nowrap">
                        {isSoldByVivi ? (
                          <span className="font-bold text-teal-800">
                            {formatCurrency(vivianShare)}
                          </span>
                        ) : (
                          <span className="text-stone-400 font-medium">{formatCurrency(0)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer with TOTALS */}
            {filteredSales.length > 0 && (
              <tfoot className="bg-stone-100/90 font-bold border-t-2 border-stone-300 text-xs">
                <tr>
                  <td colSpan={7} className="py-3 px-4 text-stone-800 uppercase tracking-wide">
                    TOTALES DEL PERÍODO ({filteredSales.length} ventas)
                  </td>
                  <td className="py-3 px-4 text-right text-stone-900 font-extrabold text-sm whitespace-nowrap">
                    {formatCurrency(summaryMetrics.totalSalesRevenue)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-800 font-extrabold whitespace-nowrap">
                    {formatCurrency(summaryMetrics.totalProfit)}
                  </td>
                  <td className="py-3 px-4 text-right text-purple-900 font-extrabold whitespace-nowrap">
                    {formatCurrency(summaryMetrics.isabellaTotal)}
                  </td>
                  <td className="py-3 px-4 text-right text-teal-900 font-extrabold whitespace-nowrap">
                    {formatCurrency(summaryMetrics.vivianTotal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
