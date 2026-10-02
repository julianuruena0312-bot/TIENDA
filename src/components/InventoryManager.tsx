import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Filter,
  Download,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Sliders,
  X,
  Package,
  ArrowUpDown,
  TrendingUp,
  Barcode,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { Product, UnitType } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ImageUploader } from './ImageUploader';
import { formatUnit } from '../utils/unitFormatter';

const formatStockUnit = (unit?: string, count: number = 1): string => {
  const u = (unit || 'unidad').trim().toLowerCase();
  if (u === 'unidad' || u === 'unidades') {
    return 'UND';
  }
  if (u === 'caja' || u === 'cajas') {
    return count === 1 ? 'CJA' : 'CJAS';
  }
  if (u === 'paquete' || u === 'paquetes') {
    return count === 1 ? 'PQT' : 'PQTS';
  }
  if (u === 'pieza' || u === 'piezas') {
    return count === 1 ? 'PZA' : 'PZAS';
  }
  return u.toUpperCase();
};

const renderCategoryBadge = (category: string) => {
  const trimmed = (category || 'General').trim();
  const words = trimmed.split(/\s+/).filter(Boolean);

  if (words.length <= 1) {
    return (
      <span className="inline-block bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md text-xs font-medium">
        {trimmed}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-center justify-center text-center leading-tight bg-stone-100 text-stone-700 px-2 py-1 rounded-md text-xs font-medium">
      {words.map((w, idx) => (
        <span key={idx} className="block leading-tight">
          {w}
        </span>
      ))}
    </span>
  );
};

interface InventoryManagerProps {
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  isCreateModalOpen,
  setIsCreateModalOpen,
}) => {
  const { products, sales, addProduct, updateProduct, deleteProduct, adjustStock, formatCurrency } =
    useBusiness();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');

  // Barcode Scanner Modals
  const [isSearchScannerOpen, setIsSearchScannerOpen] = useState(false);
  const [isFormScannerOpen, setIsFormScannerOpen] = useState(false);

  // Modal states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteToast, setDeleteToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [newStockValue, setNewStockValue] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Form State for Product Add / Edit
  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    category: string;
    costPrice: number;
    salePrice: number;
    stock: number;
    minStock: number;
    unit: UnitType;
    description: string;
    imageUrl?: string;
  }>({
    code: '',
    name: '',
    category: 'General',
    costPrice: 0,
    salePrice: 0,
    stock: 0,
    minStock: 5,
    unit: 'unidad' as UnitType,
    description: '',
    imageUrl: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered & sorted products (always ordered alphabetically A-Z by code)
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          p.name.toLowerCase().includes(search) ||
          p.code.toLowerCase().includes(search) ||
          p.category.toLowerCase().includes(search) ||
          (p.description && p.description.toLowerCase().includes(search));

        if (!matchesSearch) return false;

        // Category
        if (selectedCategory !== 'todos' && p.category !== selectedCategory) {
          return false;
        }

        // Stock status filter
        if (stockStatusFilter === 'low' && p.stock > p.minStock) return false;
        if (stockStatusFilter === 'out' && p.stock > 0) return false;

        return true;
      })
      .sort((a, b) => {
        const codeA = (a.code || '').trim().toLowerCase();
        const codeB = (b.code || '').trim().toLowerCase();
        return codeA.localeCompare(codeB, 'es', { numeric: true, sensitivity: 'base' });
      });
  }, [products, searchTerm, selectedCategory, stockStatusFilter]);

  // Pagination State (10 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, stockStatusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedProducts = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, safeCurrentPage, itemsPerPage]);

  // Open modal to add product
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      code: `PRD-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      category: categories[0] || 'General',
      costPrice: 0,
      salePrice: 0,
      stock: 10,
      minStock: 5,
      unit: 'unidad',
      description: '',
      imageUrl: '',
    });
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  // Open modal to edit product
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      code: product.code,
      name: product.name,
      category: product.category,
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      stock: product.stock,
      minStock: product.minStock,
      unit: product.unit,
      description: product.description || '',
      imageUrl: product.imageUrl || '',
    });
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  // Open modal to adjust stock
  const handleOpenAdjustStock = (product: Product) => {
    setStockAdjustProduct(product);
    setNewStockValue(product.stock);
    setAdjustReason('Conteo físico de inventario');
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('El nombre del producto es obligatorio.');
      return;
    }
    if (!formData.code.trim()) {
      setFormError('El código o SKU es obligatorio.');
      return;
    }
    if (formData.costPrice < 0 || formData.salePrice < 0) {
      setFormError('Los precios no pueden ser negativos.');
      return;
    }

    const trimmedDescription = formData.description?.trim() || '';
    const trimmedImageUrl = formData.imageUrl?.trim() || '';

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        code: formData.code.trim(),
        name: formData.name.trim(),
        category: formData.category.trim() || 'General',
        costPrice: Number(formData.costPrice),
        salePrice: Number(formData.salePrice),
        minStock: Number(formData.minStock),
        unit: formData.unit,
        description: trimmedDescription,
        imageUrl: trimmedImageUrl,
      });
    } else {
      addProduct({
        code: formData.code.trim(),
        name: formData.name.trim(),
        category: formData.category.trim() || 'General',
        costPrice: Number(formData.costPrice),
        salePrice: Number(formData.salePrice),
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
        unit: formData.unit,
        description: trimmedDescription,
        imageUrl: trimmedImageUrl,
      });
    }

    setIsCreateModalOpen(false);
  };

  const handleSaveStockAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockAdjustProduct) return;
    adjustStock(stockAdjustProduct.id, Math.max(0, Number(newStockValue)), adjustReason);
    setStockAdjustProduct(null);
  };

  const handleInitiateDelete = (product: Product) => {
    setProductToDelete(product);
  };

  const handleConfirmDelete = () => {
    if (!productToDelete) return;
    const prodName = productToDelete.name;
    const result = deleteProduct(productToDelete.id, true);
    if (result.success) {
      setDeleteToast({
        message: `✓ El producto "${prodName}" fue eliminado correctamente del inventario.`,
      });
      setTimeout(() => setDeleteToast(null), 4000);
      setProductToDelete(null);
    } else {
      setDeleteToast({
        message: result.message || 'No se pudo eliminar el producto.',
        isError: true,
      });
    }
  };

  // Export inventory to CSV
  const handleExportCSV = () => {
    const headers = ['Codigo', 'Producto', 'Categoria', 'Unidad', 'Costo', 'PrecioVenta', 'StockActual', 'StockMinimo', 'ValorTotalCosto'];
    const rows = products.map((p) => [
      `"${p.code}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.unit}"`,
      p.costPrice % 1 === 0 ? p.costPrice.toFixed(0) : p.costPrice.toFixed(2),
      p.salePrice % 1 === 0 ? p.salePrice.toFixed(0) : p.salePrice.toFixed(2),
      p.stock,
      p.minStock,
      (p.stock * p.costPrice) % 1 === 0 ? (p.stock * p.costPrice).toFixed(0) : (p.stock * p.costPrice).toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventario_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Margin preview calculation
  const calculatedMargin =
    formData.salePrice > 0
      ? (((formData.salePrice - formData.costPrice) / formData.salePrice) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">Catálogo e Inventario</h2>
        </div>
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-lg text-sm font-semibold transition-colors shadow-2xs"
            title="Descargar tabla en formato Excel CSV"
          >
            <Download className="w-4 h-4 text-stone-500" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
          <button
            id="btn-new-product"
            onClick={handleOpenAddModal}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#C86D85] hover:bg-[#B3556E] text-white rounded-lg text-sm font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Delete / Action Feedback Toast */}
      {deleteToast && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs sm:text-sm font-medium transition-all shadow-xs ${
            deleteToast.isError
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-[#FDF2F4] border-[#F2BDCB] text-[#8C344D]'
          }`}
        >
          <div className="flex items-center space-x-2">
            {deleteToast.isError ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#C86D85] shrink-0" />
            )}
            <span>{deleteToast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteToast(null)}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, código de barras o descripción..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-500/20 focus:border-stone-500 transition-all"
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

          {/* Stock status filter pills */}
          <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-lg text-xs font-medium self-start md:self-auto">
            <button
              onClick={() => setStockStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                stockStatusFilter === 'all'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => setStockStatusFilter('low')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1 ${
                stockStatusFilter === 'low'
                  ? 'bg-amber-100 text-amber-900 shadow-xs font-semibold'
                  : 'text-amber-800 hover:text-amber-900'
              }`}
            >
              <span>Stock Bajo</span>
              <span className="bg-amber-200/80 px-1 rounded text-[10px]">
                {products.filter((p) => p.stock <= p.minStock).length}
              </span>
            </button>
            <button
              onClick={() => setStockStatusFilter('out')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1 ${
                stockStatusFilter === 'out'
                  ? 'bg-rose-100 text-rose-900 shadow-xs font-semibold'
                  : 'text-rose-800 hover:text-rose-900'
              }`}
            >
              <span>Agotados</span>
              <span className="bg-rose-200/80 px-1 rounded text-[10px]">
                {products.filter((p) => p.stock === 0).length}
              </span>
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-1 pb-0.5 text-xs scrollbar-none">
          <span className="text-stone-400 font-semibold uppercase text-[11px] pr-1">Categoría:</span>
          <button
            onClick={() => setSelectedCategory('todos')}
            className={`px-2.5 py-1 rounded-lg border whitespace-nowrap transition-colors ${
              selectedCategory === 'todos'
                ? 'bg-stone-900 text-white border-stone-900 font-semibold'
                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
            }`}
          >
            Todas
          </button>
          {categories.map((cat, idx) => (
            <button
              key={`cat-filter-${cat}-${idx}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg border whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-stone-900 text-white border-stone-900 font-semibold'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-2.5 text-left whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    <span>Código</span>
                    <span className="text-[9px] font-bold tracking-normal uppercase px-1 py-0.5 rounded bg-stone-200/70 text-stone-700">
                      A-Z
                    </span>
                  </div>
                </th>
                <th className="py-2.5 px-2.5 text-left">Producto</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Categoría</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">Compra</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">Venta</th>
                <th className="py-2.5 px-1.5 text-center whitespace-nowrap">Margen</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Stock</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Estado</th>
                <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                    <p className="font-medium text-stone-600">No se encontraron productos</p>
                    <p className="text-xs text-stone-400 mt-1">
                      {searchTerm ? 'Intenta modificar el término de búsqueda.' : 'Crea tu primer producto para comenzar.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product, idx) => {
                  const isLow = product.stock <= product.minStock;
                  const isOut = product.stock === 0;
                  const marginPercent =
                    product.salePrice > 0
                      ? (((product.salePrice - product.costPrice) / product.salePrice) * 100).toFixed(0)
                      : '0';

                  const rowKey = product.id ? `product-${product.id}-${idx}` : `product-idx-${idx}`;

                  return (
                    <tr key={rowKey} className="hover:bg-stone-50/60 transition-colors">
                      {/* Código */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5 font-mono text-xs font-semibold text-stone-700">
                          <Barcode className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{product.code}</span>
                        </div>
                      </td>

                      {/* Producto */}
                      <td className="py-2.5 px-2.5">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          {/* Miniatura de la foto */}
                          <div
                            onClick={(e) => {
                              if (product.imageUrl) {
                                e.stopPropagation();
                                setPreviewImage({ url: product.imageUrl, title: product.name });
                              }
                            }}
                            className={`w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-stone-200 bg-stone-100 flex items-center justify-center ${
                              product.imageUrl
                                ? 'cursor-pointer hover:opacity-85 hover:border-emerald-500 transition-all ring-1 ring-black/5 shadow-2xs'
                                : ''
                            }`}
                            title={product.imageUrl ? 'Clic para ampliar foto' : 'Sin foto adjunta'}
                          >
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-stone-400" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="font-semibold text-stone-900 truncate max-w-[160px] sm:max-w-[200px] xl:max-w-xs text-xs sm:text-sm">
                              {product.name}
                            </div>
                            {product.description && (
                              <div className="text-[11px] text-stone-500 truncate max-w-[160px] sm:max-w-[200px] xl:max-w-xs">
                                {product.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="py-2 px-2 text-center">
                        {renderCategoryBadge(product.category)}
                      </td>

                      {/* Compra */}
                      <td className="py-2.5 px-2 text-right whitespace-nowrap font-medium text-stone-600 text-xs">
                        {formatCurrency(product.costPrice)}
                      </td>

                      {/* Precio de Venta */}
                      <td className="py-2.5 px-2 text-right whitespace-nowrap font-bold text-stone-900 text-xs sm:text-sm">
                        {formatCurrency(product.salePrice)}
                      </td>

                      {/* Margen */}
                      <td className="py-2.5 px-1.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block text-xs font-semibold px-1.5 py-0.5 rounded ${
                            Number(marginPercent) >= 30
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {marginPercent}%
                        </span>
                      </td>

                      {/* Stock */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap text-stone-900">
                        <span className="font-bold text-xs sm:text-sm">{product.stock}</span>{' '}
                        <span className="text-[11px] font-semibold text-stone-500">
                          {formatStockUnit(product.unit, product.stock)}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        {isOut ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                            Agotado
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                            Stock Bajo (≤ {product.minStock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            Óptimo
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenAdjustStock(product)}
                            className="p-1 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors"
                            title="Ajuste rápido de inventario físico"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(product)}
                            className="p-1 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors"
                            title="Editar detalles del producto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            id={`btn-delete-prod-${product.id}`}
                            onClick={() => handleInitiateDelete(product)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title={`Eliminar producto ${product.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* Footer info & Pagination (10 productos por página) */}
        <div className="px-5 py-3.5 border-t border-stone-200 bg-stone-50/70 flex flex-col md:flex-row items-center justify-between text-xs text-stone-600 gap-3">
          <div className="flex items-center space-x-2">
            <span>
              Mostrando{' '}
              <strong className="text-stone-900 font-semibold">
                {filteredProducts.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1}
              </strong>{' '}
              a{' '}
              <strong className="text-stone-900 font-semibold">
                {Math.min(safeCurrentPage * itemsPerPage, filteredProducts.length)}
              </strong>{' '}
              de <strong className="text-stone-900 font-semibold">{filteredProducts.length}</strong> productos
              {filteredProducts.length !== products.length && ` (filtrados de ${products.length})`}
            </span>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Primera página"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors font-medium text-xs"
                title="Página anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <div className="flex items-center space-x-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - safeCurrentPage) <= 1) return true;
                    return false;
                  })
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && p - prev > 1;
                    return (
                      <React.Fragment key={`page-item-${p}-${idx}`}>
                        {showEllipsis && <span className="px-1 text-stone-400 font-bold">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold transition-all ${
                            safeCurrentPage === p
                              ? 'bg-stone-900 text-white shadow-xs'
                              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors font-medium text-xs"
                title="Página siguiente"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Última página"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="hidden sm:flex items-center space-x-4">
            <span>
              Existencias totales:{' '}
              <strong className="text-stone-800">
                {products.reduce((acc, p) => acc + p.stock, 0)} unidades
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Modal: Crear / Editar Producto */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-lg text-stone-900">
                {editingProduct ? 'Editar Producto' : 'Registrar Nuevo Producto'}
              </h3>
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

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4">
              {/* Selector y Cargador de Imagen / Foto del Producto */}
              <ImageUploader
                value={formData.imageUrl}
                onChange={(val) => setFormData((prev) => ({ ...prev, imageUrl: val }))}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Código */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-700">
                      Código / Código de Barras <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsFormScannerOpen(true)}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center space-x-1"
                    >
                      <Barcode className="w-3.5 h-3.5" />
                      <span>Escanear</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full pl-3 pr-9 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="7501031311018"
                    />
                    <button
                      type="button"
                      onClick={() => setIsFormScannerOpen(true)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-emerald-600"
                      title="Escanear código de barras con cámara"
                    >
                      <Barcode className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Categoría</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="Alimentos, Limpieza, etc."
                    list="category-options"
                  />
                  <datalist id="category-options">
                    {categories.map((c, idx) => (
                      <option key={`datalist-cat-${c}-${idx}`} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nombre del Producto <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Ej. Detergente Biodegradable 1L"
                />
              </div>

              {/* Unidad de medida */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Unidad de Medida</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value as UnitType })}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg"
                >
                  <option value="unidad">Unidad (pz)</option>
                  <option value="paquete">Paquete (pkt)</option>
                  <option value="caja">Caja</option>
                  <option value="kg">Kilogramo (kg)</option>
                  <option value="litro">Litro (L)</option>
                  <option value="metro">Metro (m)</option>
                </select>
              </div>

              {/* Precios & Margen */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Costo de Compra ($ COP)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Precio de Venta ($ COP)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={formData.salePrice}
                      onChange={(e) => setFormData({ ...formData, salePrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg font-bold text-[#8C344D]"
                    />
                  </div>
                </div>

                {/* Margen Calculado */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-200">
                  <span className="text-stone-500">Margen estimado de ganancia:</span>
                  <span className="font-bold text-stone-800">
                    {calculatedMargin}% ({formatCurrency(Math.max(0, formData.salePrice - formData.costPrice))} por {formData.unit})
                  </span>
                </div>
              </div>

              {/* Stock inicial y Alerta de stock mínimo */}
              <div className="grid grid-cols-2 gap-3">
                {!editingProduct && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Stock Inicial
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg"
                    />
                  </div>
                )}
                <div className={editingProduct ? 'col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Alerta de Stock Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg"
                  />
                  <span className="text-[11px] text-stone-400">Avisar cuando haya menos de esta cantidad</span>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Descripción o Notas (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg"
                  placeholder="Detalles, marca o especificaciones..."
                />
              </div>

              {/* Botones */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-stone-600 hover:text-stone-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-[#C86D85] hover:bg-[#B3556E] text-white rounded-lg shadow-xs"
                >
                  {editingProduct ? 'Actualizar Producto' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ajuste de Stock */}
      {stockAdjustProduct && (
        <div className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-bold text-stone-900">Ajuste Físico de Existencias</h3>
                <p className="text-xs text-stone-500 mt-0.5">{stockAdjustProduct.name}</p>
              </div>
              <button
                onClick={() => setStockAdjustProduct(null)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjust} className="mt-4 space-y-4">
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 flex justify-between text-xs">
                <span className="text-stone-500">Stock actual en sistema:</span>
                <span className="font-bold text-stone-900">
                  {stockAdjustProduct.stock} {formatUnit(stockAdjustProduct.unit, stockAdjustProduct.stock)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nueva Cantidad Real Contada
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newStockValue}
                  onChange={(e) => setNewStockValue(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-lg font-bold bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <div className="text-[11px] text-stone-500 mt-1">
                  Diferencia:{' '}
                  <strong
                    className={
                      newStockValue - stockAdjustProduct.stock >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }
                  >
                    {newStockValue - stockAdjustProduct.stock > 0 ? '+' : ''}
                    {newStockValue - stockAdjustProduct.stock}{' '}
                    {formatUnit(stockAdjustProduct.unit, Math.abs(newStockValue - stockAdjustProduct.stock))}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Motivo del Ajuste</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg"
                >
                  <option value="Conteo físico de inventario">Conteo físico de inventario</option>
                  <option value="Mercancía dañada o rota">Mercancía dañada o rota</option>
                  <option value="Pérdida o merma">Pérdida o merma</option>
                  <option value="Devolución de cliente">Devolución de cliente</option>
                  <option value="Corrección de ingreso previo">Corrección de ingreso previo</option>
                </select>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setStockAdjustProduct(null)}
                  className="px-4 py-2 text-sm font-semibold text-stone-600 hover:text-stone-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-stone-900 hover:bg-black text-white rounded-lg shadow-xs"
                >
                  Guardar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal for Inventory Search */}
      <BarcodeScannerModal
        isOpen={isSearchScannerOpen}
        onClose={() => setIsSearchScannerOpen(false)}
        onScan={(code) => {
          setSearchTerm(code);
        }}
        title="Buscar Producto por Código de Barras"
        subtitle="Escanea el código para localizar el artículo inmediatamente en la tabla de inventario."
        allowNewRegistration={true}
        onRegisterNew={(code) => {
          setIsSearchScannerOpen(false);
          setFormData({
            code,
            name: '',
            category: categories[0] || 'General',
            costPrice: 0,
            salePrice: 0,
            stock: 10,
            minStock: 5,
            unit: 'unidad',
            description: '',
            imageUrl: undefined,
          });
          setEditingProduct(null);
          setIsCreateModalOpen(true);
        }}
      />

      {/* Barcode Scanner Modal for Form code input */}
      <BarcodeScannerModal
        isOpen={isFormScannerOpen}
        onClose={() => setIsFormScannerOpen(false)}
        onScan={(code) => {
          setFormData((prev) => ({ ...prev, code }));
          setIsFormScannerOpen(false);
        }}
        title="Escanear Código para este Producto"
        subtitle="Escanea la etiqueta del empaque para asignar el código automáticamente."
        allowNewRegistration={false}
      />

      {/* Modal: Confirmación para Eliminar Producto */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900">¿Eliminar Producto?</h3>
                  <p className="text-xs text-stone-500">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-stone-600">
                ¿Estás seguro de que deseas eliminar permanentemente este producto del inventario?
              </p>

              {/* Product summary card */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-2">
                <div className="flex items-center space-x-3 pb-2 border-b border-stone-200">
                  {productToDelete.imageUrl ? (
                    <img
                      src={productToDelete.imageUrl}
                      alt={productToDelete.name}
                      className="w-12 h-12 object-cover rounded-lg border border-stone-200 bg-white"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-stone-200 text-stone-400 flex items-center justify-center">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-stone-900 text-sm">{productToDelete.name}</div>
                    <div className="text-stone-500 font-mono text-[11px]">{productToDelete.code}</div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-stone-500">Existencias actuales:</span>
                  <span className="font-semibold text-stone-800">
                    {productToDelete.stock} {formatUnit(productToDelete.unit, productToDelete.stock)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">Precio de venta:</span>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(productToDelete.salePrice)}
                  </span>
                </div>
              </div>

              {/* Historical notice if product has recorded sales */}
              {sales.some((s) => s.items.some((i) => i.productId === productToDelete.id)) && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Historial registrado:</span> Este producto tiene ventas asociadas. Sus datos históricos permanecerán intactos en los reportes de ventas, pero el producto ya no figurará en el catálogo para nuevas ventas.
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-stone-600 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirm-delete"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs flex items-center space-x-1.5 transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal: Visualizar Foto en Tamaño Completo */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-800"
          >
            <div className="p-3.5 bg-stone-900 text-white flex items-center justify-between">
              <span className="font-semibold text-sm truncate">{previewImage.title}</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-stone-950 flex items-center justify-center max-h-[70vh] p-2">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[65vh] max-w-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-3 bg-stone-50 border-t border-stone-200 text-right">
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-4 py-1.5 bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
