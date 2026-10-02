import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Undo2,
  Trash2,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { StockMovement } from '../types';

const REQUIRED_DELETE_PASSWORD = 'Moon';

export const StockMovements: React.FC = () => {
  const { movements, products, deleteMovement, clearExampleMovements } = useBusiness();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | StockMovement['type']>('all');

  // Deletion state
  const [movementToDelete, setMovementToDelete] = useState<StockMovement | null>(null);
  const [deletePasswordInput, setDeletePasswordInput] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deletePasswordError, setDeletePasswordError] = useState<string | null>(null);
  const [revertStockOnDelete, setRevertStockOnDelete] = useState(true);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);

  // Proactive cleanup of example movements on component load
  useEffect(() => {
    clearExampleMovements().then((clearedCount) => {
      if (clearedCount > 0) {
        setDeleteToast(`Se purgaron ${clearedCount} movimientos de ejemplo del historial.`);
        setTimeout(() => setDeleteToast(null), 4000);
      }
    });
  }, []);

  const filteredMovements = movements.filter((m) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      m.productName.toLowerCase().includes(search) ||
      (m.referenceId && m.referenceId.toLowerCase().includes(search)) ||
      (m.notes && m.notes.toLowerCase().includes(search));

    if (!matchesSearch) return false;
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    return true;
  });

  const getTypeBadge = (type: StockMovement['type']) => {
    switch (type) {
      case 'compra':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
            <ArrowUp className="w-3 h-3 text-sky-600" />
            <span>Compra / Entrada</span>
          </span>
        );
      case 'venta':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <ArrowDown className="w-3 h-3 text-emerald-600" />
            <span>Venta / Salida</span>
          </span>
        );
      case 'anulacion_venta':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Undo2 className="w-3 h-3 text-amber-600" />
            <span>Devolución Venta</span>
          </span>
        );
      case 'ajuste_manual':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-800">
            <RefreshCw className="w-3 h-3 text-stone-600" />
            <span>Ajuste Manual</span>
          </span>
        );
      default:
        return null;
    }
  };

  const handleOpenDeleteModal = (movement: StockMovement) => {
    setMovementToDelete(movement);
    setDeletePasswordInput('');
    setShowDeletePassword(false);
    setDeletePasswordError(null);
    setRevertStockOnDelete(true);
  };

  const handleCloseDeleteModal = () => {
    setMovementToDelete(null);
    setDeletePasswordInput('');
    setShowDeletePassword(false);
    setDeletePasswordError(null);
  };

  const handleConfirmDeleteMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (deletePasswordInput.trim() !== REQUIRED_DELETE_PASSWORD) {
      setDeletePasswordError('Contraseña incorrecta. Debe ingresar exactamente "Moon" para autorizar.');
      return;
    }

    if (!movementToDelete) return;

    const prodName = movementToDelete.productName;
    const res = deleteMovement(movementToDelete.id, revertStockOnDelete);
    if (res.success) {
      setMovementToDelete(null);
      setDeletePasswordInput('');
      setDeletePasswordError(null);
      setDeleteToast(`Movimiento de "${prodName}" eliminado exitosamente.`);
      setTimeout(() => setDeleteToast(null), 4500);
    } else {
      setDeletePasswordError(res.error || 'Error al eliminar el movimiento.');
    }
  };

  const handlePurgeExamples = async () => {
    const count = await clearExampleMovements();
    if (count > 0) {
      setDeleteToast(`Se purgaron ${count} movimientos de ejemplo correctamente.`);
    } else {
      setDeleteToast('No se encontraron movimientos de ejemplo pendientes por eliminar.');
    }
    setTimeout(() => setDeleteToast(null), 4000);
  };

  // Find linked product for detailed stock context
  const linkedProduct = movementToDelete
    ? products.find((p) => p.id === movementToDelete.productId)
    : null;

  return (
    <div className="space-y-6">
      {/* Toast Feedback Notification */}
      {deleteToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{deleteToast}</span>
          </div>
          <button
            onClick={() => setDeleteToast(null)}
            className="text-emerald-500 hover:text-emerald-700 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <History className="w-6 h-6 text-stone-700" />
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">Kardex de Movimientos de Stock</h2>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Auditoría y trazabilidad cronológica de cada entrada, salida o ajuste en el inventario.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePurgeExamples}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            title="Limpiar cualquier registro de ejemplo remanente"
          >
            <Sparkles className="w-3.5 h-3.5 text-stone-500" />
            <span>Limpiar Ejemplo</span>
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por producto, folio o motivo..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-500/20 focus:border-stone-500"
            />
          </div>

          <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-lg text-xs font-medium self-start md:self-auto overflow-x-auto">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                typeFilter === 'all'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Todos ({movements.length})
            </button>
            <button
              onClick={() => setTypeFilter('compra')}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                typeFilter === 'compra'
                  ? 'bg-sky-100 text-sky-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Compras
            </button>
            <button
              onClick={() => setTypeFilter('venta')}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                typeFilter === 'venta'
                  ? 'bg-emerald-100 text-emerald-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Ventas
            </button>
            <button
              onClick={() => setTypeFilter('ajuste_manual')}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                typeFilter === 'ajuste_manual'
                  ? 'bg-stone-200 text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Ajustes Físicos
            </button>
            <button
              onClick={() => setTypeFilter('anulacion_venta')}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                typeFilter === 'anulacion_venta'
                  ? 'bg-amber-100 text-amber-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Devoluciones
            </button>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4 text-center">Variación</th>
                <th className="py-3 px-4 text-center">Stock (Previo → Final)</th>
                <th className="py-3 px-4">Referencia</th>
                <th className="py-3 px-4">Notas</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    <History className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                    <p className="font-medium text-stone-600">No hay movimientos registrados</p>
                    <p className="text-xs text-stone-400 mt-1">
                      Las entradas por compra, salidas por venta o ajustes de stock aparecerán aquí automáticamente.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-stone-50/60 transition-colors group">
                    {/* Fecha */}
                    <td className="py-3 px-4 text-xs text-stone-600 whitespace-nowrap">
                      {new Date(mov.date).toLocaleDateString('es-CO', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Tipo */}
                    <td className="py-3 px-4 whitespace-nowrap">{getTypeBadge(mov.type)}</td>

                    {/* Producto */}
                    <td className="py-3 px-4 font-semibold text-stone-900">{mov.productName}</td>

                    {/* Variación */}
                    <td className="py-3 px-4 text-center whitespace-nowrap font-bold">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          mov.quantityChange > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : mov.quantityChange < 0
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {mov.quantityChange > 0 ? `+${mov.quantityChange}` : mov.quantityChange}
                      </span>
                    </td>

                    {/* Stock Previo -> Final */}
                    <td className="py-3 px-4 text-center text-xs text-stone-600 whitespace-nowrap">
                      <span className="text-stone-400">{mov.previousStock}</span>
                      <span className="mx-1.5 text-stone-400">→</span>
                      <strong className="text-stone-900">{mov.newStock}</strong>
                    </td>

                    {/* Referencia */}
                    <td className="py-3 px-4 font-mono text-xs text-stone-700">
                      {mov.referenceId || '—'}
                    </td>

                    {/* Notas */}
                    <td className="py-3 px-4 text-xs text-stone-500 max-w-xs truncate">
                      {mov.notes || '—'}
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(mov)}
                        title="Eliminar movimiento (requiere contraseña Moon)"
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password-Protected Delete Movement Modal */}
      {movementToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3 text-rose-600 mb-4">
              <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">Eliminar Movimiento de Stock</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Esta acción eliminará permanentemente este registro de auditoría de inventario.
                </p>
              </div>
            </div>

            {/* Movement Summary Details */}
            <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 mb-4 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Producto:</span>
                <span className="font-bold text-stone-900">{movementToDelete.productName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Tipo de Movimiento:</span>
                <div>{getTypeBadge(movementToDelete.type)}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Variación registrada:</span>
                <span className="font-bold">
                  {movementToDelete.quantityChange > 0
                    ? `+${movementToDelete.quantityChange}`
                    : movementToDelete.quantityChange} unidades
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Transición de Stock:</span>
                <span className="font-medium text-stone-700">
                  {movementToDelete.previousStock} → {movementToDelete.newStock}
                </span>
              </div>
              {movementToDelete.referenceId && (
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">Folio / Referencia:</span>
                  <span className="font-mono text-stone-700">{movementToDelete.referenceId}</span>
                </div>
              )}
              {movementToDelete.notes && (
                <div className="pt-1 border-t border-stone-200/60 text-stone-600">
                  <span className="text-stone-500 block mb-0.5">Nota:</span>
                  <span className="italic">{movementToDelete.notes}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmDeleteMovement} className="space-y-4">
              {/* Option to Revert Stock Impact */}
              {movementToDelete.quantityChange !== 0 && (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={revertStockOnDelete}
                      onChange={(e) => setRevertStockOnDelete(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-stone-300"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-stone-800">
                        Revertir impacto en el stock del producto
                      </span>
                      <p className="text-stone-500 mt-0.5 leading-relaxed">
                        {movementToDelete.quantityChange > 0
                          ? `Se restarán ${movementToDelete.quantityChange} unidades del stock actual (quedaría en ${Math.max(0, (linkedProduct?.stock ?? movementToDelete.newStock) - movementToDelete.quantityChange)}).`
                          : `Se repondrán ${Math.abs(movementToDelete.quantityChange)} unidades al stock actual (quedaría en ${(linkedProduct?.stock ?? movementToDelete.newStock) + Math.abs(movementToDelete.quantityChange)}).`}
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Password Input */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Contraseña de Autorización <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type={showDeletePassword ? 'text' : 'password'}
                    value={deletePasswordInput}
                    onChange={(e) => {
                      setDeletePasswordInput(e.target.value);
                      if (deletePasswordError) setDeletePasswordError(null);
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
                  Ingresa la clave <strong>Moon</strong> para autorizar la eliminación de este movimiento.
                </p>
              </div>

              {deletePasswordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deletePasswordError}</span>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  Confirmar Eliminación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
