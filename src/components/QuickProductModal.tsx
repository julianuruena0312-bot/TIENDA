import React, { useState, useEffect } from 'react';
import { X, Plus, Package, CheckCircle2, Barcode } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { Product, UnitType } from '../types';
import { ImageUploader } from './ImageUploader';

interface QuickProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBarcode?: string;
  onProductCreated?: (product: Product) => void;
}

export const QuickProductModal: React.FC<QuickProductModalProps> = ({
  isOpen,
  onClose,
  initialBarcode = '',
  onProductCreated,
}) => {
  const { addProduct, products } = useBusiness();

  const [code, setCode] = useState(initialBarcode);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Abarrotes');
  const [costPrice, setCostPrice] = useState<string>('0');
  const [salePrice, setSalePrice] = useState<string>('0');
  const [stock, setStock] = useState<string>('10');
  const [minStock, setMinStock] = useState<string>('5');
  const [unit, setUnit] = useState<UnitType>('unidad');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Existing categories
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  useEffect(() => {
    if (isOpen) {
      setCode(initialBarcode);
      setName('');
      setCategory(categories[0] || 'General');
      setCostPrice('0');
      setSalePrice('0');
      setStock('10');
      setMinStock('5');
      setUnit('unidad');
      setImageUrl(undefined);
      setError(null);
    }
  }, [isOpen, initialBarcode, categories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre del producto es obligatorio.');
      return;
    }
    if (!code.trim()) {
      setError('El código de barras es obligatorio.');
      return;
    }

    // Check duplicate code
    const existing = products.find(
      (p) => p.code.toLowerCase() === code.trim().toLowerCase()
    );
    if (existing) {
      setError(`Ya existe un producto con este código: "${existing.name}".`);
      return;
    }

    const numCost = parseFloat(costPrice) || 0;
    const numSale = parseFloat(salePrice) || 0;
    const numStock = parseInt(stock) || 0;
    const numMinStock = parseInt(minStock) || 0;

    if (numCost < 0 || numSale < 0) {
      setError('Los precios no pueden ser negativos.');
      return;
    }

    const newProd = addProduct({
      code: code.trim(),
      name: name.trim(),
      category: category.trim() || 'General',
      costPrice: numCost,
      salePrice: numSale,
      stock: numStock,
      minStock: numMinStock,
      unit,
      description: `Registrado rápidamente por escaneo de código (${code.trim()})`,
      imageUrl,
    });

    if (onProductCreated) {
      onProductCreated(newProd);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900">Registrar Producto Nuevo</h3>
              <p className="text-xs text-stone-500">Alta rápida por código de barras</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {/* Foto del Producto */}
          <ImageUploader value={imageUrl} onChange={setImageUrl} />

          {/* Barcode code */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Código de Barras escaneado
            </label>
            <div className="relative">
              <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg font-mono font-semibold text-stone-900"
              />
            </div>
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nombre del Producto <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Galletas de Chocolate 120g"
              className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Categoría</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="quick-category-options"
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg"
              />
              <datalist id="quick-category-options">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Unidad</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as UnitType)}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg"
              >
                <option value="unidad">Unidad (pz)</option>
                <option value="paquete">Paquete</option>
                <option value="caja">Caja</option>
                <option value="kg">Kg</option>
                <option value="litro">Litro</option>
              </select>
            </div>
          </div>

          {/* Cost Price & Sale Price */}
          <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Costo Compra ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-white border border-stone-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Precio Venta ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-white border border-stone-200 rounded-lg font-bold text-emerald-700"
              />
            </div>
          </div>

          {/* Initial Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Stock Inicial
              </label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-stone-50 border border-stone-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Alerta Stock Mínimo
              </label>
              <input
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-stone-50 border border-stone-200 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar y Utilizar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
