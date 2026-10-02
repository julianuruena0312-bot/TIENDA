import React, { useState } from 'react';
import {
  ReceiptText,
  Search,
  Calendar,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  X,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Ban,
  Printer,
  Trash2,
  Lock,
  ShieldAlert,
  Truck,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { Sale } from '../types';

export const SalesHistory: React.FC = () => {
  const { sales, products, cancelSale, deleteSale, clearSalesHistory, formatCurrency, config } = useBusiness();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completada' | 'anulada'>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Cancellation modal state
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('Error en cobro / Devolución del cliente');
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Security password modal state (MoonStore)
  const REQUIRED_SECURITY_KEY = 'MoonStore';
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [securityKeyInput, setSecurityKeyInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [securityKeyError, setSecurityKeyError] = useState<string | null>(null);
  const [returnStockOnDelete, setReturnStockOnDelete] = useState(true);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  // Filtered sales
  const filteredSales = sales.filter((s) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      s.customerName.toLowerCase().includes(search) ||
      (s.seller && s.seller.toLowerCase().includes(search)) ||
      (s.paidTo && s.paidTo.toLowerCase().includes(search)) ||
      s.invoiceNumber.toLowerCase().includes(search) ||
      (s.customerPhone && s.customerPhone.includes(search)) ||
      s.items.some((it) => it.productName.toLowerCase().includes(search));

    if (!matchesSearch) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    return true;
  });

  // Totals of active sales
  const completedSales = sales.filter((s) => s.status === 'completada');
  const totalSalesNet = completedSales.reduce((acc, s) => acc + (s.total - (s.deliveryFee || 0)), 0);
  const totalDeliveries = completedSales.reduce((acc, s) => acc + (s.deliveryFee || 0), 0);

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToCancel) return;

    const res = cancelSale(saleToCancel.id, cancelReason);
    if (res.success) {
      setSaleToCancel(null);
      if (selectedSale?.id === saleToCancel.id) {
        setSelectedSale(null);
      }
    } else {
      setCancelError(res.error || 'Error al anular la venta.');
    }
  };

  // Open security modal to clear all sales
  const handleOpenClearAll = () => {
    setSaleToDelete(null);
    setSecurityKeyInput('');
    setShowPassword(false);
    setSecurityKeyError(null);
    setReturnStockOnDelete(true);
    setIsClearAllModalOpen(true);
  };

  // Open security modal to delete single sale
  const handleOpenDeleteSingle = (sale: Sale) => {
    setIsClearAllModalOpen(false);
    setSaleToDelete(sale);
    setSecurityKeyInput('');
    setShowPassword(false);
    setSecurityKeyError(null);
    setReturnStockOnDelete(sale.status === 'completada');
  };

  const handleCloseSecurityModal = () => {
    setIsClearAllModalOpen(false);
    setSaleToDelete(null);
    setSecurityKeyInput('');
    setSecurityKeyError(null);
  };

  const handleConfirmSecurityAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (securityKeyInput !== REQUIRED_SECURITY_KEY) {
      setSecurityKeyError('Clave de seguridad incorrecta. Debe ingresar exactamente "MoonStore".');
      return;
    }

    if (saleToDelete) {
      const invoice = saleToDelete.invoiceNumber;
      const res = deleteSale(saleToDelete.id, returnStockOnDelete);
      if (res.success) {
        if (selectedSale?.id === saleToDelete.id) {
          setSelectedSale(null);
        }
        setSaleToDelete(null);
        setSecurityKeyInput('');
        setSecurityKeyError(null);
        setActionSuccessToast(`Venta ${invoice} eliminada del historial con éxito.`);
        setTimeout(() => setActionSuccessToast(null), 4500);
      } else {
        setSecurityKeyError(res.error || 'Error al eliminar la venta.');
      }
    } else if (isClearAllModalOpen) {
      const res = clearSalesHistory(returnStockOnDelete);
      if (res.success) {
        setSelectedSale(null);
        setIsClearAllModalOpen(false);
        setSecurityKeyInput('');
        setSecurityKeyError(null);
        setActionSuccessToast(`Se eliminaron ${res.clearedCount} ventas del historial exitosamente.`);
        setTimeout(() => setActionSuccessToast(null), 4500);
      } else {
        setSecurityKeyError('Error al limpiar el historial.');
      }
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Fecha', 'Vendedor', 'Artículos', 'Cantidad', 'Pago A', 'Medio Pago', 'Total', 'Domi', 'Ganancia', 'Isabella', 'Vivian'];
    const rows = sales.map((s) => {
      const itemsStr = s.items.map((it) => `${it.quantity}x ${it.productName}`).join('; ');
      const totalUnits = s.items.reduce((acc, it) => acc + it.quantity, 0);
      const isSoldByVivi = (s.seller || '').trim().toLowerCase() === 'vivi';
      const totalCost = s.items.reduce((acc, it) => {
        const prod = products.find((p) => p.id === it.productId);
        const unitCost = it.unitCost !== undefined && it.unitCost > 0 ? it.unitCost : (prod?.costPrice ?? 0);
        return acc + (unitCost * it.quantity);
      }, 0);
      const dFee = s.deliveryFee || 0;
      const dPaidTo = s.deliveryPaidTo || s.paidTo || 'Isa';
      const profit = (s.total - dFee) - totalCost;
      const isabellaShare = isSoldByVivi
        ? totalCost + (profit / 2)
        : (s.total - dFee);
      const vivianShare = isSoldByVivi
        ? (profit / 2)
        : 0;

      return [
        `"${new Date(s.date).toLocaleDateString('es-CO')}"`,
        `"${s.seller || 'Isa'}"`,
        `"${itemsStr.replace(/"/g, '""')}"`,
        totalUnits,
        `"${s.paidTo || 'Isa'}"`,
        `"${s.paymentMethod}"`,
        Math.round(s.total),
        dFee > 0 ? `"${formatCurrency(dFee)} (${dPaidTo})"` : '""',
        s.status !== 'anulada' ? Math.round(profit) : '""',
        s.status !== 'anulada' ? Math.round(isabellaShare) : '""',
        s.status !== 'anulada' ? Math.round(vivianShare) : '""',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ventas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {actionSuccessToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessToast}</span>
          </div>
          <button
            onClick={() => setActionSuccessToast(null)}
            className="p-1 text-emerald-700 hover:text-emerald-950 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">Historial de Ventas</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Registro de todas las operaciones realizadas, comprobantes y anulación con devolución a stock.
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          {sales.length > 0 && (
            <button
              onClick={handleOpenClearAll}
              className="flex items-center space-x-1.5 px-3.5 py-2 border border-rose-200 text-rose-700 bg-rose-50/60 hover:bg-rose-100 hover:border-rose-300 rounded-lg text-sm font-semibold transition-colors shadow-2xs"
              title="Limpiar todo el historial de ventas con clave de seguridad MoonStore"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Limpiar Historial</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-lg text-sm font-semibold transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4 text-stone-500" />
            <span className="hidden sm:inline">Exportar Reporte</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Recuadro de VENTAS (sin incluir domicilios) */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">VENTAS</span>
            <span className="text-[11px] font-medium text-stone-400">Sin domicilios</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {formatCurrency(totalSalesNet)}
          </div>
        </div>

        {/* Recuadro de DOMICILIOS */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">DOMICILIOS</span>
            <Truck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-800 mt-1">
            {formatCurrency(totalDeliveries)}
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, folio/factura o producto vendido..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-lg text-xs font-medium self-start md:self-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Todas ({sales.length})
            </button>
            <button
              onClick={() => setStatusFilter('completada')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'completada'
                  ? 'bg-emerald-100 text-emerald-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Completadas ({completedSales.length})
            </button>
            <button
              onClick={() => setStatusFilter('anulada')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'anulada'
                  ? 'bg-rose-100 text-rose-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Anuladas ({sales.filter((s) => s.status === 'anulada').length})
            </button>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Artículo</th>
                <th className="py-3 px-4 text-center">Cantidad</th>
                <th className="py-3 px-4 text-center">Pago a</th>
                <th className="py-2.5 px-3 text-center text-[11px] leading-tight">
                  <div>MEDIO</div>
                  <div>PAGO</div>
                </th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right text-stone-700">Domi</th>
                <th className="py-3 px-4 text-right text-emerald-800">Ganancia</th>
                <th className="py-3 px-4 text-right text-purple-800">Isabella</th>
                <th className="py-3 px-4 text-right text-teal-800">Vivian</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-stone-400">
                    <ReceiptText className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                    <p className="font-medium text-stone-600">No se encontraron ventas</p>
                    <p className="text-xs text-stone-400 mt-1">
                      Las ventas registradas en el Punto de Venta aparecerán aquí.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const totalUnits = sale.items.reduce((acc, it) => acc + it.quantity, 0);
                  const isVoid = sale.status === 'anulada';
                  const isPaidToJuli = (sale.paidTo || '').trim().toLowerCase() === 'juli';

                  // Costo total de compra (precio al cual se compra cada producto)
                  const totalCost = sale.items.reduce((acc, it) => {
                    const prod = products.find((p) => p.id === it.productId);
                    const unitCost = it.unitCost !== undefined && it.unitCost > 0
                      ? it.unitCost
                      : (prod?.costPrice ?? 0);
                    return acc + (unitCost * it.quantity);
                  }, 0);

                  const dFee = sale.deliveryFee || 0;
                  const profit = (sale.total - dFee) - totalCost;

                  const isSoldByVivi = (sale.seller || '').trim().toLowerCase() === 'vivi';
                  const isabellaShare = isSoldByVivi
                    ? totalCost + (profit / 2)
                    : (sale.total - dFee);
                  const vivianShare = isSoldByVivi
                    ? (profit / 2)
                    : 0;

                  return (
                    <tr
                      key={sale.id}
                      className={`transition-colors ${isVoid ? 'bg-stone-50/70 opacity-60' : 'hover:bg-stone-50/60'}`}
                    >
                      {/* Fecha */}
                      <td className="py-3 px-4 text-xs text-stone-600 whitespace-nowrap">
                        {new Date(sale.date).toLocaleDateString('es-CO', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Artículo (Descripción del producto) */}
                      <td className="py-3 px-4 text-xs">
                        {sale.items.length === 0 ? (
                          <span className="text-stone-400 italic">—</span>
                        ) : sale.items.length === 1 ? (
                          <div className="font-semibold text-stone-900 leading-snug">
                            {sale.items[0].productName}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {sale.items.map((it, idx) => (
                              <div key={idx} className="font-semibold text-stone-900 text-xs leading-snug">
                                {it.productName}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Cantidad */}
                      <td className="py-3 px-4 text-center text-xs whitespace-nowrap">
                        {sale.items.length <= 1 ? (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md font-bold text-xs bg-stone-100 text-stone-800">
                            {sale.items[0]?.quantity ?? totalUnits}
                          </span>
                        ) : (
                          <div className="space-y-1 text-center">
                            {sale.items.map((it, idx) => (
                              <div key={idx} className="font-bold text-stone-800 text-xs">
                                {it.quantity}
                              </div>
                            ))}
                            <div className="text-[10px] text-stone-400 font-semibold border-t border-stone-200/60 pt-0.5">
                              Total: {totalUnits}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Pago a */}
                      <td className="py-3 px-4 text-center text-xs whitespace-nowrap">
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

                      {/* Medio Pago */}
                      <td className="py-3 px-3 text-center text-xs whitespace-nowrap">
                        <span className="uppercase font-bold text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                          {sale.paymentMethod}
                        </span>
                      </td>

                      {/* Total */}
                      <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${isVoid ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                        {formatCurrency(sale.total)}
                      </td>

                      {/* Domi */}
                      <td className="py-3 px-4 text-right text-xs whitespace-nowrap">
                        {dFee > 0 ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <span className="font-semibold text-stone-800">
                              {formatCurrency(dFee)}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                (sale.deliveryPaidTo || sale.paidTo || 'Isa').toLowerCase() === 'juli'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-purple-100 text-purple-800 border border-purple-200'
                              }`}
                            >
                              {sale.deliveryPaidTo || sale.paidTo || 'Isa'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-300 font-normal">—</span>
                        )}
                      </td>

                      {/* Ganancia */}
                      <td className="py-3 px-4 text-right text-xs whitespace-nowrap">
                        {!isVoid ? (
                          <span className="font-bold text-emerald-700">
                            {formatCurrency(profit)}
                          </span>
                        ) : (
                          <span className="text-stone-300 font-normal">—</span>
                        )}
                      </td>

                      {/* Isabella */}
                      <td className="py-3 px-4 text-right text-xs whitespace-nowrap">
                        {!isVoid ? (
                          <span className="font-bold text-purple-800">
                            {formatCurrency(isabellaShare)}
                          </span>
                        ) : (
                          <span className="text-stone-300 font-normal">—</span>
                        )}
                      </td>

                      {/* Vivian */}
                      <td className="py-3 px-4 text-right text-xs whitespace-nowrap">
                        {!isVoid ? (
                          isSoldByVivi ? (
                            <span className="font-bold text-teal-800">
                              {formatCurrency(vivianShare)}
                            </span>
                          ) : (
                            <span className="text-stone-400 font-medium">{formatCurrency(0)}</span>
                          )
                        ) : (
                          <span className="text-stone-300 font-normal">—</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setSelectedSale(sale)}
                            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                            title="Ver ticket de venta"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!isVoid && (
                            <button
                              onClick={() => {
                                setSaleToCancel(sale);
                                setCancelError(null);
                              }}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Anular venta y devolver stock"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenDeleteSingle(sale)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar esta venta del historial (requiere clave)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Ver Detalle / Ticket de Venta */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-bold text-stone-900">Comprobante de Venta</h3>
                <p className="text-xs text-stone-500 font-mono">Folio: {selectedSale.invoiceNumber}</p>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedSale.status === 'anulada' && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Esta venta fue <strong>anulada</strong> y sus productos fueron devueltos al inventario.</span>
              </div>
            )}

            <div className="mt-4 space-y-3 text-xs">
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">Vendedor:</span>
                  <span className="font-bold text-stone-900">{selectedSale.seller || 'Isa'}</span>
                </div>
                {selectedSale.customerName && selectedSale.customerName !== 'Consumidor Final' && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Cliente:</span>
                    <span className="font-bold text-stone-900">{selectedSale.customerName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-stone-500">Fecha:</span>
                  <span>{new Date(selectedSale.date).toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Método de pago:</span>
                  <span className="uppercase font-semibold">{selectedSale.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Pago a:</span>
                  <span className="font-bold text-stone-900">{selectedSale.paidTo || 'Isa'}</span>
                </div>
                {selectedSale.notes && (
                  <div className="pt-1 text-stone-500 italic border-t border-stone-200">
                    Notas: {selectedSale.notes}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-stone-100 text-stone-600 text-[11px] font-bold uppercase">
                    <tr>
                      <th className="p-2">Producto</th>
                      <th className="p-2 text-center">Cant.</th>
                      <th className="p-2 text-right">Precio</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {selectedSale.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium text-stone-800">{it.productName}</td>
                        <td className="p-2 text-center font-bold">{it.quantity}</td>
                        <td className="p-2 text-right text-stone-600">{formatCurrency(it.unitPrice)}</td>
                        <td className="p-2 text-right font-bold text-stone-900">{formatCurrency(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Descuento aplicado:</span>
                    <span>-{formatCurrency(selectedSale.discount)}</span>
                  </div>
                )}
                {selectedSale.deliveryFee !== undefined && selectedSale.deliveryFee > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>Domicilio (Pago a {selectedSale.deliveryPaidTo || 'Isa'}):</span>
                    <span className="font-semibold text-stone-800">{formatCurrency(selectedSale.deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2 border-t border-stone-200 text-base font-bold text-stone-900">
                  <span>Total Cobrado:</span>
                  <span className="text-emerald-700 text-lg">{formatCurrency(selectedSale.total)}</span>
                </div>

                {selectedSale.status !== 'anulada' && (
                  (() => {
                    const isSoldByVivi = (selectedSale.seller || '').trim().toLowerCase() === 'vivi';
                    const totalCost = selectedSale.items.reduce((acc, it) => {
                      const prod = products.find((p) => p.id === it.productId);
                      const unitCost = it.unitCost !== undefined && it.unitCost > 0 ? it.unitCost : (prod?.costPrice ?? 0);
                      return acc + (unitCost * it.quantity);
                    }, 0);
                    const dFee = selectedSale.deliveryFee || 0;
                    const profit = (selectedSale.total - dFee) - totalCost;
                    const isabellaShare = isSoldByVivi
                      ? totalCost + (profit / 2)
                      : (selectedSale.total - dFee);
                    const vivianShare = isSoldByVivi
                      ? (profit / 2)
                      : 0;

                    return (
                      <div className="mt-3 p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-1.5">
                        <div className="text-[11px] font-bold text-stone-700 uppercase tracking-wide">
                          Distribución de Venta (Vendedor: {selectedSale.seller || 'Isa'})
                        </div>
                        <div className="flex justify-between text-emerald-800 font-semibold">
                          <span>Ganancia:</span>
                          <span>{formatCurrency(profit)}</span>
                        </div>
                        <div className="flex justify-between text-purple-800 font-semibold">
                          <span>{isSoldByVivi ? 'Isabella (Costo Compra + 50% Ganancia):' : 'Isabella (100% Venta):'}</span>
                          <span>{formatCurrency(isabellaShare)}</span>
                        </div>
                        <div className="flex justify-between text-teal-800 font-semibold">
                          <span>Vivian ({isSoldByVivi ? '50% Ganancia' : '0%'}):</span>
                          <span>{formatCurrency(vivianShare)}</span>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
                <button
                  onClick={() => handleOpenDeleteSingle(selectedSale)}
                  className="px-3 py-1.5 border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                  title="Eliminar este comprobante del historial"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-1.5 bg-stone-900 hover:bg-black text-white text-xs font-semibold rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Anulación de Venta */}
      {saleToCancel && (
        <div className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center space-x-3 pb-3 border-b border-stone-100 text-rose-600">
              <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900">¿Anular Venta {saleToCancel.invoiceNumber}?</h3>
                <p className="text-xs text-stone-500">Monto: {formatCurrency(saleToCancel.total)}</p>
              </div>
            </div>

            {cancelError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleConfirmCancel} className="mt-4 space-y-4">
              <p className="text-xs text-stone-600 leading-relaxed">
                Al anular esta venta, <strong>los productos regresarán automáticamente al inventario</strong> sumando nuevamente sus existencias en almacén.
              </p>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Motivo de la Anulación
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg"
                >
                  <option value="Error en cobro / Devolución del cliente">
                    Error en cobro / Devolución del cliente
                  </option>
                  <option value="Cliente desistió de la compra">Cliente desistió de la compra</option>
                  <option value="Producto defectuoso devuelto">Producto defectuoso devuelto</option>
                  <option value="Duplicidad de orden">Duplicidad de orden</option>
                  <option value="Otro motivo administrativo">Otro motivo administrativo</option>
                </select>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSaleToCancel(null)}
                  className="px-4 py-2 text-sm font-semibold text-stone-600 hover:text-stone-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs"
                >
                  Confirmar Anulación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Verificación de Clave de Seguridad para Eliminar / Limpiar (MoonStore) */}
      {(isClearAllModalOpen || saleToDelete) && (
        <div className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900">
                    {isClearAllModalOpen ? 'Limpiar Historial de Ventas' : 'Eliminar Venta del Historial'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {isClearAllModalOpen
                      ? `Se eliminarán todas las ${sales.length} ventas registradas`
                      : `Folio: ${saleToDelete?.invoiceNumber}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseSecurityModal}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {securityKeyError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{securityKeyError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmSecurityAction} className="mt-4 space-y-4">
              {/* Summary Description */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-1.5">
                {isClearAllModalOpen ? (
                  <>
                    <p className="font-semibold text-stone-900">
                      ¿Estás seguro de que deseas vaciar por completo el historial de ventas?
                    </p>
                    <p className="text-stone-500 leading-relaxed">
                      Esta operación eliminará <strong>{sales.length} ventas</strong> ({completedSales.length} activas y {sales.filter((s) => s.status === 'anulada').length} anuladas). Los contadores de ingresos y órdenes se restablecerán a cero.
                    </p>
                  </>
                ) : (
                  saleToDelete && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Cliente:</span>
                        <strong className="text-stone-900">{saleToDelete.customerName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Estado:</span>
                        <span
                          className={`font-semibold capitalize ${
                            saleToDelete.status === 'anulada' ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {saleToDelete.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Total:</span>
                        <strong className="text-emerald-700 font-bold">{formatCurrency(saleToDelete.total)}</strong>
                      </div>
                    </>
                  )
                )}
              </div>

              {/* Stock Return Option for active sales */}
              {((isClearAllModalOpen && completedSales.length > 0) || (saleToDelete && saleToDelete.status === 'completada')) && (
                <label className="flex items-start space-x-2.5 p-2.5 rounded-lg border border-amber-200 bg-amber-50/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={returnStockOnDelete}
                    onChange={(e) => setReturnStockOnDelete(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-xs text-amber-950">
                    <span className="font-semibold block">Devolver artículos al inventario</span>
                    <span className="text-amber-800 text-[11px]">
                      Sumar nuevamente al stock las existencias de las ventas activas que se eliminarán.
                    </span>
                  </div>
                </label>
              )}

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-stone-700">
                    Clave de Seguridad requerida <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-mono bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200 font-semibold">
                    Clave: MoonStore
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={securityKeyInput}
                    onChange={(e) => {
                      setSecurityKeyInput(e.target.value);
                      if (securityKeyError) setSecurityKeyError(null);
                    }}
                    placeholder="Escribe la clave MoonStore"
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-stone-900 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-stone-400">
                  Por seguridad, solo las operaciones autorizadas con la clave <strong className="text-stone-600 font-mono">MoonStore</strong> pueden eliminar ventas.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCloseSecurityModal}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-stone-600 hover:text-stone-800 rounded-xl hover:bg-stone-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!securityKeyInput.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs flex items-center space-x-1.5 transition-all active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {isClearAllModalOpen ? 'Sí, Limpiar Historial' : 'Sí, Eliminar Venta'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
