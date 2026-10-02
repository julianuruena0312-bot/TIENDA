import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Calendar,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  Lock,
  X,
  Trash2,
  AlertCircle,
  FileText,
  Barcode,
  CheckCircle2,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { Purchase, PurchaseItem, Product } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { QuickProductModal } from './QuickProductModal';

interface PurchaseManagerProps {
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
}

interface NewPurchaseItemRow {
  productId: string;
  quantity: number;
  unitCost: number;
}

export const PurchaseManager: React.FC<PurchaseManagerProps> = ({
  isCreateModalOpen,
  setIsCreateModalOpen,
}) => {
  const { purchases, products, recordPurchase, deletePurchase, formatCurrency } = useBusiness();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // Security password state to delete purchase
  const REQUIRED_DELETE_PASSWORD = 'Moon';
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
  const [deletePasswordInput, setDeletePasswordInput] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deletePasswordError, setDeletePasswordError] = useState<string | null>(null);
  const [revertStockOnDelete, setRevertStockOnDelete] = useState(true);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);

  // Barcode Scanners State
  const [isSearchScannerOpen, setIsSearchScannerOpen] = useState(false);
  const [isItemScannerOpen, setIsItemScannerOpen] = useState(false);
  const [unregisteredBarcode, setUnregisteredBarcode] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  // Form State for New Purchase
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Purchase['paymentMethod']>('transferencia');
  const [notes, setNotes] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<NewPurchaseItemRow[]>([
    { productId: products[0]?.id || '', quantity: 10, unitCost: products[0]?.costPrice || 0 },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Filtered purchases
  const filteredPurchases = purchases.filter((p) => {
    const search = searchTerm.toLowerCase();
    return (
      p.supplierName.toLowerCase().includes(search) ||
      p.invoiceNumber.toLowerCase().includes(search) ||
      p.items.some((it) => it.productName.toLowerCase().includes(search))
    );
  });

  // Calculate totals
  const totalPurchasesCost = purchases.reduce((acc, p) => acc + p.total, 0);

  // Open modal
  // Scan barcode inside purchase form
  const handleScanPurchaseItem = (scannedCode: string) => {
    const clean = scannedCode.trim().toLowerCase();
    const product = products.find(
      (p) =>
        p.code.toLowerCase() === clean ||
        (clean.length >= 8 && p.code.toLowerCase().includes(clean))
    );

    if (product) {
      setPurchaseItems((prev) => {
        const existingIdx = prev.findIndex((item) => item.productId === product.id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + 1,
          };
          return updated;
        } else {
          // If first item was just a blank placeholder
          if (prev.length === 1 && (!prev[0].productId || prev[0].quantity === 0)) {
            return [{ productId: product.id, quantity: 1, unitCost: product.costPrice }];
          }
          return [...prev, { productId: product.id, quantity: 1, unitCost: product.costPrice }];
        }
      });
      setScanFeedback(`✓ "${product.name}" agregado a la compra (+1)`);
      setTimeout(() => setScanFeedback(null), 3000);
    } else {
      setUnregisteredBarcode(scannedCode);
    }
  };

  const handleOpenNewModal = () => {
    setSupplierName('');
    setInvoiceNumber(`FAC-PROV-${Math.floor(1000 + Math.random() * 9000)}`);
    setPaymentMethod('transferencia');
    setNotes('');
    setPurchaseItems([
      { productId: products[0]?.id || '', quantity: 10, unitCost: products[0]?.costPrice || 0 },
    ]);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const addItemRow = () => {
    const availableProd = products.find(
      (p) => !purchaseItems.some((item) => item.productId === p.id)
    ) || products[0];

    if (!availableProd) return;

    setPurchaseItems((prev) => [
      ...prev,
      { productId: availableProd.id, quantity: 5, unitCost: availableProd.costPrice },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (purchaseItems.length === 1) return;
    setPurchaseItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItemRow = (index: number, field: keyof NewPurchaseItemRow, value: any) => {
    setPurchaseItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        // If product changed, update unit cost to product's current cost
        if (field === 'productId') {
          const prod = products.find((p) => p.id === value);
          if (prod) {
            updated.unitCost = prod.costPrice;
          }
        }
        return updated;
      })
    );
  };

  // Grand total of current purchase being drafted
  const currentDraftTotal = purchaseItems.reduce(
    (acc, item) => acc + item.quantity * item.unitCost,
    0
  );

  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      setFormError('El nombre del proveedor es requerido.');
      return;
    }
    if (!invoiceNumber.trim()) {
      setFormError('El número de factura o comprobante es requerido.');
      return;
    }
    if (purchaseItems.length === 0) {
      setFormError('Debes agregar al menos un producto a la compra.');
      return;
    }

    for (const item of purchaseItems) {
      if (!item.productId) {
        setFormError('Selecciona un producto válido.');
        return;
      }
      if (item.quantity <= 0) {
        setFormError('La cantidad a comprar debe ser mayor a 0.');
        return;
      }
      if (item.unitCost < 0) {
        setFormError('El costo unitario no puede ser negativo.');
        return;
      }
    }

    recordPurchase({
      supplierName: supplierName.trim(),
      invoiceNumber: invoiceNumber.trim(),
      paymentMethod,
      notes: notes.trim() || undefined,
      items: purchaseItems.map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity),
        unitCost: Number(it.unitCost),
      })),
    });

    setIsCreateModalOpen(false);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Fecha', 'Factura', 'Proveedor', 'MetodoPago', 'TotalArticulos', 'TotalCompra'];
    const rows = purchases.map((p) => [
      `"${new Date(p.date).toLocaleDateString('es-CO')}"`,
      `"${p.invoiceNumber}"`,
      `"${p.supplierName.replace(/"/g, '""')}"`,
      `"${p.paymentMethod}"`,
      p.items.reduce((acc, it) => acc + it.quantity, 0),
      Math.round(p.total),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `compras_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenDeleteModal = (purchase: Purchase) => {
    setPurchaseToDelete(purchase);
    setDeletePasswordInput('');
    setShowDeletePassword(false);
    setDeletePasswordError(null);
    setRevertStockOnDelete(true);
  };

  const handleCloseDeleteModal = () => {
    setPurchaseToDelete(null);
    setDeletePasswordInput('');
    setShowDeletePassword(false);
    setDeletePasswordError(null);
  };

  const handleConfirmDeletePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (deletePasswordInput.trim() !== REQUIRED_DELETE_PASSWORD) {
      setDeletePasswordError('Contraseña incorrecta. Debe ingresar exactamente "Moon" para autorizar.');
      return;
    }

    if (!purchaseToDelete) return;

    const invoice = purchaseToDelete.invoiceNumber;
    const res = deletePurchase(purchaseToDelete.id, revertStockOnDelete);
    if (res.success) {
      if (selectedPurchase?.id === purchaseToDelete.id) {
        setSelectedPurchase(null);
      }
      setPurchaseToDelete(null);
      setDeletePasswordInput('');
      setDeletePasswordError(null);
      setDeleteToast(`Registro de compra ${invoice} eliminado exitosamente.`);
      setTimeout(() => setDeleteToast(null), 4500);
    } else {
      setDeletePasswordError(res.error || 'Error al eliminar la compra.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {deleteToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{deleteToast}</span>
          </div>
          <button
            onClick={() => setDeleteToast(null)}
            className="p-1 text-emerald-700 hover:text-emerald-950 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">Compras y Proveedores</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Registra abastecimientos de mercancía. El inventario se actualiza automáticamente.
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-lg text-sm font-semibold transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4 text-stone-500" />
            <span className="hidden sm:inline">Exportar Compras</span>
          </button>
          <button
            id="btn-register-purchase"
            onClick={handleOpenNewModal}
            className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Compra</span>
          </button>
        </div>
      </div>

      {/* Quick stats banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase">Total Invertido en Compras</span>
          <div className="text-2xl font-bold text-stone-900 mt-1">
            {formatCurrency(totalPurchasesCost)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase">Órdenes de Compra</span>
          <div className="text-2xl font-bold text-sky-700 mt-1">{purchases.length} registros</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase">Productos Disponibles para Reorden</span>
          <div className="text-2xl font-bold text-stone-900 mt-1">{products.length} catálogo</div>
        </div>
      </div>

      {/* Search Input & Scanner */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por proveedor, N° de factura o código de producto..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            id="btn-purchase-search-scanner"
            onClick={() => setIsSearchScannerOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0 active:scale-95"
            title="Buscar órdenes que contengan este producto escaneado"
          >
            <Barcode className="w-4 h-4" />
            <span className="hidden sm:inline">Escanear Código</span>
          </button>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">N° Factura</th>
                <th className="py-3 px-4">Proveedor</th>
                <th className="py-3 px-4 text-center">Artículos</th>
                <th className="py-3 px-4 text-center">Pago</th>
                <th className="py-3 px-4 text-right">Total Compra</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    <Truck className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                    <p className="font-medium text-stone-600">No hay compras registradas</p>
                    <p className="text-xs text-stone-400 mt-1">
                      Usa el botón "Registrar Compra" para agregar entradas de stock.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => {
                  const totalUnits = purchase.items.reduce((acc, it) => acc + it.quantity, 0);

                  return (
                    <tr key={purchase.id} className="hover:bg-stone-50/60 transition-colors">
                      {/* Fecha */}
                      <td className="py-3 px-4 text-xs text-stone-600">
                        {new Date(purchase.date).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {/* Factura */}
                      <td className="py-3 px-4 font-mono font-semibold text-stone-900 text-xs">
                        {purchase.invoiceNumber}
                      </td>

                      {/* Proveedor */}
                      <td className="py-3 px-4 font-medium text-stone-800">
                        {purchase.supplierName}
                      </td>

                      {/* Artículos */}
                      <td className="py-3 px-4 text-center text-xs text-stone-600">
                        <span className="bg-stone-100 px-2 py-0.5 rounded font-semibold">
                          {purchase.items.length} productos ({totalUnits} u.)
                        </span>
                      </td>

                      {/* Pago */}
                      <td className="py-3 px-4 text-center text-xs">
                        <span className="uppercase font-bold text-[10px] px-2 py-0.5 rounded bg-sky-50 text-sky-800">
                          {purchase.paymentMethod}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 text-right font-bold text-stone-900">
                        {formatCurrency(purchase.total)}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setSelectedPurchase(purchase)}
                            className="p-1.5 text-stone-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                            title="Ver detalle de productos ingresados"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(purchase)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar registro de compra (requiere contraseña Moon)"
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

      {/* Modal: Registrar Compra */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-lg text-stone-900">Registrar Compra a Proveedor</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPurchase} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nombre del Proveedor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    placeholder="Ej. Distribuidora Central S.A."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    N° Factura / Folio <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg font-mono focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    placeholder="FAC-00123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg"
                  >
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta de Débito / Crédito</option>
                    <option value="credito">Crédito del Proveedor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Notas u Observaciones
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg"
                    placeholder="Recepción en almacén, lote, etc."
                  />
                </div>
              </div>

              {/* Items to Purchase Table */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Productos a Ingresar al Stock
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      id="btn-purchase-item-scanner"
                      onClick={() => setIsItemScannerOpen(true)}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1.5 rounded-lg border border-emerald-200 shadow-2xs transition-colors"
                      title="Escanear producto con cámara o pistola para agregarlo a la compra"
                    >
                      <Barcode className="w-3.5 h-3.5" />
                      <span>Escanear Producto</span>
                    </button>
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="text-xs font-semibold text-sky-700 hover:text-sky-800 flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100/80 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar fila</span>
                    </button>
                  </div>
                </div>

                {scanFeedback && (
                  <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-medium flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{scanFeedback}</span>
                  </div>
                )}

                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2.5 max-h-56 overflow-y-auto">
                  {purchaseItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-stone-200 text-xs">
                      {/* Product select */}
                      <div className="flex-1">
                        <label className="block text-[10px] text-stone-400 font-semibold mb-0.5">Producto</label>
                        <select
                          value={item.productId}
                          onChange={(e) => updateItemRow(idx, 'productId', e.target.value)}
                          className="w-full px-2 py-1.5 bg-stone-50 border border-stone-200 rounded text-xs font-medium"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Stock act: {p.stock})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="w-20">
                        <label className="block text-[10px] text-stone-400 font-semibold mb-0.5">Cant.</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => updateItemRow(idx, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-stone-50 border border-stone-200 rounded text-xs font-bold text-center"
                        />
                      </div>

                      {/* Unit Cost */}
                      <div className="w-24">
                        <label className="block text-[10px] text-stone-400 font-semibold mb-0.5">Costo Unit.</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={item.unitCost}
                          onChange={(e) => updateItemRow(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-stone-50 border border-stone-200 rounded text-xs font-semibold text-right"
                        />
                      </div>

                      {/* Subtotal */}
                      <div className="w-24 text-right">
                        <label className="block text-[10px] text-stone-400 font-semibold mb-0.5">Subtotal</label>
                        <div className="font-bold text-stone-900 py-1">
                          {formatCurrency(item.quantity * item.unitCost)}
                        </div>
                      </div>

                      {/* Delete */}
                      <div className="pt-3">
                        <button
                          type="button"
                          disabled={purchaseItems.length === 1}
                          onClick={() => removeItemRow(idx)}
                          className={`p-1.5 rounded transition-colors ${
                            purchaseItems.length === 1
                              ? 'text-stone-300 cursor-not-allowed'
                              : 'text-stone-400 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="bg-sky-50/70 p-3.5 rounded-xl border border-sky-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-sky-800 font-semibold block">Total a Pagar / Invertir:</span>
                  <span className="text-[11px] text-sky-600">
                    Las unidades se sumarán de inmediato al stock actual.
                  </span>
                </div>
                <div className="text-2xl font-bold text-sky-900">
                  {formatCurrency(currentDraftTotal)}
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-stone-600 hover:text-stone-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-xs"
                >
                  Confirmar e Ingresar a Inventario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ver Detalle de Compra */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-bold text-stone-900">Detalles de Compra</h3>
                <p className="text-xs text-stone-500 font-mono">Factura: {selectedPurchase.invoiceNumber}</p>
              </div>
              <button
                onClick={() => setSelectedPurchase(null)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-lg border border-stone-200">
                <div>
                  <span className="text-stone-500 block">Proveedor:</span>
                  <span className="font-bold text-stone-900">{selectedPurchase.supplierName}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Fecha:</span>
                  <span className="font-semibold text-stone-800">
                    {new Date(selectedPurchase.date).toLocaleString('es-CO')}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block">Método de Pago:</span>
                  <span className="font-semibold text-stone-800 uppercase">
                    {selectedPurchase.paymentMethod}
                  </span>
                </div>
                {selectedPurchase.notes && (
                  <div>
                    <span className="text-stone-500 block">Notas:</span>
                    <span className="text-stone-800">{selectedPurchase.notes}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-stone-100 text-stone-600 text-[11px] font-bold uppercase">
                    <tr>
                      <th className="p-2">Producto</th>
                      <th className="p-2 text-center">Cant.</th>
                      <th className="p-2 text-right">Costo Unit.</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {selectedPurchase.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium text-stone-800">{it.productName}</td>
                        <td className="p-2 text-center font-bold text-stone-900">{it.quantity}</td>
                        <td className="p-2 text-right text-stone-600">{formatCurrency(it.unitCost)}</td>
                        <td className="p-2 text-right font-bold text-stone-900">{formatCurrency(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-baseline pt-2 text-sm font-bold text-stone-900">
                <span>Total de la Compra:</span>
                <span className="text-lg text-sky-800">{formatCurrency(selectedPurchase.total)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const p = selectedPurchase;
                  setSelectedPurchase(null);
                  handleOpenDeleteModal(p);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                title="Eliminar este registro de compra"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Compra</span>
              </button>
              <button
                onClick={() => setSelectedPurchase(null)}
                className="px-4 py-2 bg-stone-900 hover:bg-black text-white text-xs font-semibold rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación con Contraseña "Moon" */}
      {purchaseToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-2 text-rose-600">
                <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                </div>
                <h3 className="font-bold text-base text-stone-900">Eliminar Registro de Compra</h3>
              </div>
              <button
                onClick={handleCloseDeleteModal}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDeletePurchase} className="mt-4 space-y-4">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-xs space-y-1.5">
                <div className="flex justify-between text-stone-600">
                  <span>Factura:</span>
                  <span className="font-mono font-bold text-stone-900">{purchaseToDelete.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Proveedor:</span>
                  <span className="font-medium text-stone-900">{purchaseToDelete.supplierName}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Artículos ingresados:</span>
                  <span className="font-semibold text-stone-900">{purchaseToDelete.items.length} productos</span>
                </div>
                <div className="flex justify-between text-stone-600 border-t border-stone-200/60 pt-1.5">
                  <span className="font-bold text-stone-800">Total Compra:</span>
                  <span className="font-bold text-stone-900">{formatCurrency(purchaseToDelete.total)}</span>
                </div>
              </div>

              {/* Revert stock checkbox */}
              <label className="flex items-start space-x-2.5 cursor-pointer text-xs p-2 rounded-lg hover:bg-stone-50">
                <input
                  type="checkbox"
                  checked={revertStockOnDelete}
                  onChange={(e) => setRevertStockOnDelete(e.target.checked)}
                  className="mt-0.5 rounded border-stone-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-stone-700">
                  <strong className="block text-stone-900 font-semibold">Revertir stock de productos</strong>
                  Descontar del inventario las unidades ingresadas con esta factura para mantener las existencias exactas.
                </span>
              </label>

              {/* Security Password input */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Contraseña de Autorización
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showDeletePassword ? 'text' : 'password'}
                    value={deletePasswordInput}
                    onChange={(e) => {
                      setDeletePasswordInput(e.target.value);
                      setDeletePasswordError(null);
                    }}
                    placeholder="Ingresa la contraseña requerida"
                    autoFocus
                    className="w-full pl-9 pr-10 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
                  >
                    {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Ingresa la contraseña para autorizar la eliminación permanente del registro.
                </p>
              </div>

              {deletePasswordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deletePasswordError}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-xs"
                >
                  Confirmar Eliminación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal for Purchase Search */}
      <BarcodeScannerModal
        isOpen={isSearchScannerOpen}
        onClose={() => setIsSearchScannerOpen(false)}
        onScan={(code) => {
          setSearchTerm(code);
        }}
        title="Buscar Compra por Código de Producto"
        subtitle="Escanea el código de barras para filtrar órdenes que contengan este artículo."
        allowNewRegistration={false}
      />

      {/* Barcode Scanner Modal for Adding Items to Purchase */}
      <BarcodeScannerModal
        isOpen={isItemScannerOpen}
        onClose={() => setIsItemScannerOpen(false)}
        onScan={handleScanPurchaseItem}
        title="Escanear Producto para Compra"
        subtitle="Apunta la cámara al código de barras para agregarlo o incrementar su cantidad en la orden."
        allowNewRegistration={true}
        onRegisterNew={(code) => {
          setIsItemScannerOpen(false);
          setUnregisteredBarcode(code);
        }}
      />

      {/* Quick Registration Modal when scanning an unregistered item during purchase */}
      <QuickProductModal
        isOpen={!!unregisteredBarcode}
        initialBarcode={unregisteredBarcode || ''}
        onClose={() => setUnregisteredBarcode(null)}
        onProductCreated={(newProd) => {
          setPurchaseItems((prev) => [
            ...prev,
            { productId: newProd.id, quantity: 10, unitCost: newProd.costPrice },
          ]);
          setScanFeedback(`✓ Producto "${newProd.name}" registrado e incluido en la compra.`);
          setTimeout(() => setScanFeedback(null), 3500);
        }}
      />
    </div>
  );
};
