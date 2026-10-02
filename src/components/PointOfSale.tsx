import React, { useState, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  DollarSign,
  CreditCard,
  Printer,
  X,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Barcode,
  CheckCircle2,
  Package,
  Calendar,
  Smartphone,
  Wallet,
  Landmark,
  Key,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { Product, Sale } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { QuickProductModal } from './QuickProductModal';
import { formatUnit } from '../utils/unitFormatter';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

const PAYMENT_OPTIONS: { id: Sale['paymentMethod']; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'efectivo', label: 'Efectivo', icon: DollarSign },
  { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { id: 'nequi', label: 'Nequi', icon: Smartphone },
  { id: 'daviplata', label: 'Daviplata', icon: Wallet },
  { id: 'bancolombia', label: 'Bancolombia', icon: Landmark },
  { id: 'llave', label: 'Llave', icon: Key },
];

export const PointOfSale: React.FC = () => {
  const { products, recordSale, formatCurrency, config } = useBusiness();

  const getTodayString = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Search & Categories
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  // Scanner & Quick Registration state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [unregisteredBarcode, setUnregisteredBarcode] = useState<string | null>(null);
  const [scanNotification, setScanNotification] = useState<{
    message: string;
    isError?: boolean;
  } | null>(null);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [seller, setSeller] = useState<'Isa' | 'Vivi'>('Isa');
  const [paidTo, setPaidTo] = useState<'Isa' | 'Juli'>('Isa');
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [deliveryPaidTo, setDeliveryPaidTo] = useState<'Isa' | 'Juli'>('Isa');
  const [paymentMethod, setPaymentMethod] = useState<Sale['paymentMethod']>('efectivo');
  const [saleDate, setSaleDate] = useState<string>(getTodayString);
  const [notes, setNotes] = useState('');

  // Cash change calculation
  const [cashReceived, setCashReceived] = useState<string>('');

  // Sale result & Receipt Modal
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [saleError, setSaleError] = useState<string | null>(null);

  // Available categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
      if (selectedCategory !== 'todos' && p.category !== selectedCategory) return false;
      return true;
    });
  }, [products, searchTerm, selectedCategory]);

  // Cart operations
  const addToCart = (product: Product) => {
    setSaleError(null);
    if (product.stock <= 0) {
      setSaleError(`El producto "${product.name}" está agotado.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          setSaleError(`No puedes agregar más de ${product.stock} unidades disponibles.`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prev, { product, quantity: 1, unitPrice: product.salePrice }];
      }
    });
  };

  const updateQuantity = (productId: string, newQty: number) => {
    setSaleError(null);
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > prod.stock) {
      setSaleError(`Existencias máximas disponibles: ${prod.stock} ${formatUnit(prod.unit, prod.stock)}.`);
      newQty = prod.stock;
    }

    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity: newQty } : item))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSeller('Isa');
    setPaidTo('Isa');
    setCashReceived('');
    setDeliveryFee(0);
    setDeliveryPaidTo('Isa');
    setSaleError(null);
  };

  // Barcode Scanning Handler
  const handleBarcodeScanned = (scannedCode: string) => {
    const clean = scannedCode.trim().toLowerCase();
    const product = products.find(
      (p) =>
        p.code.toLowerCase() === clean ||
        (clean.length >= 8 && p.code.toLowerCase().includes(clean))
    );

    if (product) {
      if (product.stock <= 0) {
        setSaleError(`El producto "${product.name}" está agotado.`);
        setScanNotification({
          message: `"${product.name}" está agotado (Stock: 0)`,
          isError: true,
        });
      } else {
        addToCart(product);
        setScanNotification({
          message: `✓ +1 "${product.name}" (${formatCurrency(product.salePrice)}) agregado al carrito`,
        });
        setTimeout(() => setScanNotification(null), 3000);
      }
    } else {
      setScanNotification({
        message: `Código "${scannedCode}" no registrado en inventario.`,
        isError: true,
      });
      setUnregisteredBarcode(scannedCode);
    }
  };

  // Handle Enter key in search box (useful for hardware USB barcode scanners)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      e.preventDefault();
      handleBarcodeScanned(searchTerm.trim());
      setSearchTerm('');
    }
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const total = subtotal + (deliveryFee || 0);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const cashAmount = parseFloat(cashReceived) || 0;
  const changeDue = Math.max(0, cashAmount - total);

  const getSaleDateISO = (dateStr: string) => {
    if (!dateStr) return new Date().toISOString();
    const [y, m, d] = dateStr.split('-').map(Number);
    const now = new Date();
    const isToday =
      y === now.getFullYear() &&
      m === now.getMonth() + 1 &&
      d === now.getDate();
    if (isToday) {
      return now.toISOString();
    }
    const customDate = new Date(y, m - 1, d, 12, 0, 0);
    return customDate.toISOString();
  };

  // Submit Sale
  const handleProcessSale = () => {
    if (cart.length === 0) {
      setSaleError('El carrito de compras está vacío.');
      return;
    }

    if (paymentMethod === 'efectivo' && cashReceived !== '' && cashAmount < total) {
      setSaleError(`El monto recibido (${formatCurrency(cashAmount)}) es menor que el total (${formatCurrency(total)}).`);
      return;
    }

    const salePayload = {
      customerName: 'Consumidor Final',
      seller,
      paidTo,
      deliveryFee,
      deliveryPaidTo,
      paymentMethod,
      date: getSaleDateISO(saleDate),
      notes: notes.trim() || undefined,
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    };

    const result = recordSale(salePayload);
    if (result.success && result.sale) {
      setCompletedSale(result.sale);
      clearCart();
    } else {
      setSaleError(result.error || 'Error al procesar la venta.');
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT COLUMN: Product Catalog (7 cols) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Search & Categories */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar por nombre o escanear código de barras..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
          </div>

          {/* Scan Toast notification */}
          {scanNotification && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center justify-between transition-all ${
                scanNotification.isError
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-[#FDF2F4] text-[#A7455F] border border-[#F2BDCB]'
              }`}
            >
              <div className="flex items-center space-x-2">
                {scanNotification.isError ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#C86D85] shrink-0" />
                )}
                <span className="font-semibold">{scanNotification.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setScanNotification(null)}
                className="text-stone-400 hover:text-stone-600 ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Category Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 text-xs scrollbar-none">
            <button
              onClick={() => setSelectedCategory('todos')}
              className={`px-3 py-1.5 rounded-lg border font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'todos'
                  ? 'bg-[#C86D85] text-white border-[#C86D85]'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-[#EAA6B8] hover:text-[#9E3E57]'
              }`}
            >
              Todos ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg border font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#C86D85] text-white border-[#C86D85]'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-[#EAA6B8] hover:text-[#9E3E57]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.stock <= 0;
            const inCart = cart.find((item) => item.product.id === product.id);

            return (
              <div
                key={product.id}
                onClick={() => !isOutOfStock && addToCart(product)}
                className={`bg-white rounded-xl border overflow-hidden flex flex-col justify-between text-left transition-all relative select-none ${
                  isOutOfStock
                    ? 'opacity-60 border-stone-200 cursor-not-allowed bg-stone-50'
                    : 'border-stone-200 hover:border-emerald-500 hover:shadow-xs cursor-pointer active:scale-[0.98]'
                }`}
              >
                {/* Quantity in cart badge */}
                {inCart && (
                  <span className="absolute top-2 right-2 z-10 bg-emerald-600 text-white font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                    {inCart.quantity}
                  </span>
                )}

                {/* Banner de Foto del Producto */}
                <div className="w-full h-28 sm:h-32 bg-stone-100 overflow-hidden relative flex items-center justify-center border-b border-stone-100">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-stone-300">
                      <Package className="w-8 h-8 text-stone-400" />
                    </div>
                  )}

                  {/* Stock tag on top of photo */}
                  <span
                    className={`absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs backdrop-blur-xs ${
                      isOutOfStock
                        ? 'bg-rose-600/90 text-white'
                        : product.stock <= product.minStock
                        ? 'bg-amber-600/90 text-white'
                        : 'bg-stone-900/80 text-white'
                    }`}
                  >
                    {isOutOfStock ? 'Agotado' : `${product.stock} ${formatUnit(product.unit, product.stock)}`}
                  </span>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-stone-400 font-mono block truncate">
                      {product.code}
                    </span>
                    <h4 className="font-semibold text-stone-900 text-xs sm:text-sm line-clamp-2 leading-tight mt-0.5">
                      {product.name}
                    </h4>
                    <span className="text-[11px] text-stone-400 block mt-0.5 truncate">{product.category}</span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-base font-bold text-emerald-700">
                      {formatCurrency(product.salePrice)}
                    </span>
                    <button
                      disabled={isOutOfStock}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                        isOutOfStock
                          ? 'bg-stone-200 text-stone-400'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-stone-400 text-sm">
            No se encontraron productos que coincidan con los filtros.
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Ticket / Active Cart (5 cols) */}
      <div className="lg:col-span-5 bg-white rounded-xl border border-stone-200 shadow-sm p-4 sm:p-5 sticky top-24 space-y-4">
        {/* Ticket Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm sm:text-base">Orden de Venta</h3>
              <p className="text-xs text-stone-500">
                {totalItemsCount} {totalItemsCount === 1 ? 'artículo' : 'artículos'}
              </p>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Vaciar</span>
            </button>
          )}
        </div>

        {saleError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saleError}</span>
          </div>
        )}

        {/* Configuración de la Orden: VENDEDOR, PAGO A, DOMICILIO, FECHA DE VENTA */}
        <div className="space-y-3 text-xs">
          {/* 1. VENDEDOR: Isa (Morado) o Vivi (Verde) */}
          <div>
            <label className="block text-stone-700 font-bold mb-1 text-xs uppercase tracking-wide">
              VENDEDOR
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-stone-100 p-0.5 rounded-lg border border-stone-200 h-[36px] items-center">
              <button
                type="button"
                onClick={() => setSeller('Isa')}
                className={`h-full rounded-md text-xs font-bold transition-all ${
                  seller === 'Isa'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Isa
              </button>
              <button
                type="button"
                onClick={() => setSeller('Vivi')}
                className={`h-full rounded-md text-xs font-bold transition-all ${
                  seller === 'Vivi'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Vivi
              </button>
            </div>
          </div>

          {/* 2. PAGO A: Isa (Morado) o Juli (Verde) */}
          <div>
            <label className="block text-stone-700 font-bold mb-1 text-xs uppercase tracking-wide">
              PAGO A
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-stone-100 p-0.5 rounded-lg border border-stone-200 h-[36px] items-center">
              <button
                type="button"
                onClick={() => setPaidTo('Isa')}
                className={`h-full rounded-md text-xs font-bold transition-all ${
                  paidTo === 'Isa'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Isa
              </button>
              <button
                type="button"
                onClick={() => setPaidTo('Juli')}
                className={`h-full rounded-md text-xs font-bold transition-all ${
                  paidTo === 'Juli'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Juli
              </button>
            </div>
          </div>

          {/* 3. DOMICILIO (debajo de PAGO A) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-stone-700 font-bold mb-1 text-xs uppercase tracking-wide flex items-center justify-between">
                <span>VALOR DOMICILIO</span>
                <span className="text-[10px] text-stone-400 font-normal">COP ($)</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-semibold">$</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={deliveryFee === 0 ? '' : deliveryFee}
                  onChange={(e) => setDeliveryFee(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full pl-6 pr-2.5 h-[36px] bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-stone-700 font-bold mb-1 text-xs uppercase tracking-wide">
                DOMICILIO PAGO A
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-stone-100 p-0.5 rounded-lg border border-stone-200 h-[36px] items-center">
                <button
                  type="button"
                  onClick={() => setDeliveryPaidTo('Isa')}
                  className={`h-full rounded-md text-xs font-bold transition-all ${
                    deliveryPaidTo === 'Isa'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Isa
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryPaidTo('Juli')}
                  className={`h-full rounded-md text-xs font-bold transition-all ${
                    deliveryPaidTo === 'Juli'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Juli
                </button>
              </div>
            </div>
          </div>

          {/* 4. FECHA DE VENTA (debajo de DOMICILIO) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-stone-700 font-bold text-xs uppercase tracking-wide flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-[#C86D85]" />
                <span>FECHA DE VENTA</span>
              </label>
              {saleDate !== getTodayString() ? (
                <button
                  type="button"
                  onClick={() => setSaleDate(getTodayString())}
                  className="text-[11px] text-[#C86D85] font-semibold hover:underline"
                >
                  Restablecer a Hoy
                </button>
              ) : (
                <span className="text-[11px] text-stone-400">Fecha Actual</span>
              )}
            </div>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-full px-2.5 h-[36px] bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-800 focus:ring-2 focus:ring-[#C86D85]/20 focus:border-[#C86D85]"
            />
          </div>
        </div>

        {/* Cart Item List */}
        <div className="max-h-64 overflow-y-auto space-y-2 divide-y divide-stone-100 pr-1">
          {cart.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-xs">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-stone-300" />
              Haz clic en los productos del catálogo para agregarlos a la venta.
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="pt-2 flex items-center justify-between text-xs gap-2">
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-lg bg-stone-100 border border-stone-200 shrink-0 overflow-hidden flex items-center justify-center">
                    {item.product.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Package className="w-4 h-4 text-stone-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-stone-900 truncate">{item.product.name}</div>
                    <div className="text-stone-500 text-[11px]">
                      {formatCurrency(item.unitPrice)} x {item.quantity} ={' '}
                      <strong className="text-stone-800">{formatCurrency(item.quantity * item.unitPrice)}</strong>
                    </div>
                  </div>
                </div>

                {/* Counter controls */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 font-bold"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-bold text-stone-900 w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 font-bold"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 text-stone-400 hover:text-rose-600 rounded ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment Method Selector */}
        <div className="pt-2 border-t border-stone-100 space-y-2">
          <label className="block text-xs font-semibold text-stone-700">Forma de Pago</label>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            {PAYMENT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = paymentMethod === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPaymentMethod(opt.id)}
                  className={`py-2 px-2 rounded-lg border font-semibold flex items-center justify-center space-x-1.5 transition-all text-xs ${
                    isSelected
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* If Cash: Calculator for Cash Received and Change */}
          {paymentMethod === 'efectivo' && (
            <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl space-y-2 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-900">Paga con (Efectivo recibido):</span>
                <div className="relative w-28">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0.00"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="w-full text-right py-1 px-2 text-sm bg-white border border-emerald-300 rounded-md font-bold text-stone-900"
                  />
                </div>
              </div>
              {cashAmount > 0 && (
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-emerald-200/60">
                  <span className="font-semibold text-emerald-900">Cambio a Devolver:</span>
                  <span className="text-base font-extrabold text-emerald-800">
                    {formatCurrency(changeDue)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Totals Breakdown */}
        <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-1.5 text-xs">
          {deliveryFee > 0 && (
            <>
              <div className="flex justify-between text-stone-600">
                <span>Subtotal productos:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>Domicilio (Pago a {deliveryPaidTo}):</span>
                <span className="font-bold text-stone-900">{formatCurrency(deliveryFee)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-baseline pt-1 border-t border-stone-200/60">
            <span className="font-bold text-stone-900 text-sm">Total a Cobrar:</span>
            <span className="font-extrabold text-[#9E3E57] text-2xl">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Checkout Button */}
        <button
          id="btn-process-sale"
          disabled={cart.length === 0}
          onClick={handleProcessSale}
          className={`w-full py-3 px-4 rounded-xl font-bold text-sm shadow-xs flex items-center justify-center space-x-2 transition-all ${
            cart.length === 0
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
              : 'bg-[#C86D85] hover:bg-[#B3556E] text-white active:scale-[0.99]'
          }`}
        >
          <CheckCircle className="w-5 h-5" />
          <span>Registrar Venta ({formatCurrency(total)})</span>
        </button>
      </div>

      {/* Sale Success & Printable Receipt Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="text-center pb-4 border-b border-stone-200">
              <div className="w-12 h-12 bg-[#FDF2F4] text-[#C86D85] rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-stone-900">¡Venta Registrada Exitosamente!</h3>
              <p className="text-xs text-stone-500">Comprobante de compra generado en sistema</p>
            </div>

            {/* Receipt Preview */}
            <div id="print-receipt" className="my-4 p-4 bg-stone-50 border border-dashed border-stone-300 rounded-xl text-xs space-y-3 font-mono">
              <div className="text-center space-y-0.5">
                <h4 className="font-bold text-stone-900 text-sm uppercase">{config.businessName}</h4>
                <p className="text-[#C86D85] text-[10px] font-sans font-semibold tracking-wider uppercase">Tienda para Mujeres</p>
                <p className="text-stone-500 text-[11px]">{config.address}</p>
                <p className="text-stone-500 text-[11px]">Tel: {config.phone}</p>
              </div>

              <div className="pt-2 border-t border-stone-200 flex justify-between text-[11px] text-stone-600">
                <span>N° Factura: {completedSale.invoiceNumber}</span>
                <span>{new Date(completedSale.date).toLocaleDateString('es-CO')}</span>
              </div>
              <div className="text-[11px] text-stone-600 flex justify-between">
                <span>Vendedor: <strong>{completedSale.seller || 'Isa'}</strong></span>
                <span>Pago a: <strong>{completedSale.paidTo || 'Isa'}</strong></span>
              </div>

              {/* Items */}
              <div className="pt-2 border-t border-stone-200 space-y-1 text-[11px]">
                {completedSale.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="truncate pr-2">
                      {it.quantity}x {it.productName}
                    </span>
                    <span className="font-semibold shrink-0">{formatCurrency(it.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-stone-200 space-y-1">
                {completedSale.discount > 0 && (
                  <div className="flex justify-between text-stone-500">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(completedSale.discount)}</span>
                  </div>
                )}
                {completedSale.deliveryFee !== undefined && completedSale.deliveryFee > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>Domicilio ({completedSale.deliveryPaidTo || 'Isa'}):</span>
                    <span>{formatCurrency(completedSale.deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-stone-900 text-sm">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(completedSale.total)}</span>
                </div>
                <div className="flex justify-between text-stone-500 text-[11px]">
                  <span>Método de Pago:</span>
                  <span className="uppercase">{completedSale.paymentMethod}</span>
                </div>
              </div>

              <p className="text-center text-[10px] text-stone-400 pt-2 border-t border-stone-200">
                ¡Gracias por su compra! Vuelva pronto.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 py-2 px-3 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket</span>
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                className="flex-1 py-2 px-3 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
              >
                <span>Cerrar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="Escanear Código para Venta"
        subtitle="Apunta la cámara al código de barras del producto o ingrésalo manualmente."
        allowNewRegistration={true}
        onRegisterNew={(code) => {
          setIsScannerOpen(false);
          setUnregisteredBarcode(code);
        }}
      />

      {/* Quick Registration Modal if unknown barcode scanned */}
      <QuickProductModal
        isOpen={!!unregisteredBarcode}
        initialBarcode={unregisteredBarcode || ''}
        onClose={() => setUnregisteredBarcode(null)}
        onProductCreated={(newProd) => {
          addToCart(newProd);
          setScanNotification({
            message: `✓ Producto "${newProd.name}" registrado y agregado al carrito`,
          });
          setTimeout(() => setScanNotification(null), 3500);
        }}
      />
    </div>
  );
};
