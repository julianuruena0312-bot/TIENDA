import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, googleProvider, signInWithPopup, signOut, handleFirestoreError, OperationType } from '../firebase';
import {
  Product,
  Purchase,
  PurchaseItem,
  Sale,
  SaleItem,
  StockMovement,
  BusinessConfig,
} from '../types';
import {
  INITIAL_BUSINESS_CONFIG,
  INITIAL_PRODUCTS,
  INITIAL_PURCHASES,
  INITIAL_SALES,
  INITIAL_MOVEMENTS,
} from '../data/initialData';

interface BusinessContextType {
  products: Product[];
  purchases: Purchase[];
  sales: Sale[];
  movements: StockMovement[];
  config: BusinessConfig;
  cloudConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  currentUser: User | null;
  signInGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  syncAllToCloud: () => Promise<void>;
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product;
  updateProduct: (id: string, productData: Partial<Product>) => void;
  deleteProduct: (id: string, force?: boolean) => { success: boolean; message?: string };
  adjustStock: (productId: string, newStock: number, reason: string) => void;
  deleteMovement: (movementId: string, revertStock?: boolean) => { success: boolean; error?: string };
  clearExampleMovements: () => Promise<number>;
  recordPurchase: (purchaseData: {
    supplierName: string;
    invoiceNumber: string;
    paymentMethod: Purchase['paymentMethod'];
    notes?: string;
    items: { productId: string; quantity: number; unitCost: number }[];
  }) => Purchase;
  deletePurchase: (purchaseId: string, revertStock?: boolean) => { success: boolean; error?: string };
  recordSale: (saleData: {
    customerName?: string;
    customerPhone?: string;
    seller?: 'Isa' | 'Vivi' | string;
    paidTo?: 'Isa' | 'Juli' | string;
    deliveryFee?: number;
    deliveryPaidTo?: 'Isa' | 'Juli' | string;
    paymentMethod: Sale['paymentMethod'];
    discount?: number;
    notes?: string;
    date?: string;
    items: { productId: string; quantity: number; unitPrice?: number }[];
  }) => { success: boolean; sale?: Sale; error?: string };
  cancelSale: (saleId: string, reason?: string) => { success: boolean; error?: string };
  deleteSale: (saleId: string, returnStockIfActive?: boolean) => { success: boolean; error?: string };
  clearSalesHistory: (returnStockForActive?: boolean) => { success: boolean; clearedCount: number };
  updateConfig: (newConfig: Partial<BusinessConfig>) => void;
  resetData: () => void;
  exportJSON: () => string;
  importJSON: (dataString: string) => { success: boolean; message: string };
  formatCurrency: (amount: number) => string;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

const STORAGE_KEY = 'gestor_negocio_data_v1';

const EXAMPLE_PURCHASE_IDS = ['pur-1', 'pur-2'];
const EXAMPLE_SALE_IDS = ['sale-1', 'sale-2', 'sale-3'];
const EXAMPLE_MOVEMENT_IDS = [
  'mov-1', 'mov-2', 'mov-3', 'mov-4', 'mov-5', 'mov-6', 'mov-7', 'mov-8', 'mov-9', 'mov-10', 'mov-sample'
];

const isExamplePurchase = (p: { id?: string; invoiceNumber?: string }) =>
  Boolean((p.id && EXAMPLE_PURCHASE_IDS.includes(p.id)) ||
  p.invoiceNumber === 'FAC-PROV-0089' ||
  p.invoiceNumber === 'FAC-PROV-0104');

const isExampleSale = (s: { id?: string; invoiceNumber?: string }) =>
  Boolean((s.id && EXAMPLE_SALE_IDS.includes(s.id)) ||
  s.invoiceNumber === 'VTA-00101' ||
  s.invoiceNumber === 'VTA-00102' ||
  s.invoiceNumber === 'VTA-00103');

const isExampleMovement = (m: { id?: string; referenceId?: string; notes?: string }) => {
  if (!m) return false;
  if (m.id && EXAMPLE_MOVEMENT_IDS.includes(m.id)) return true;
  if (m.referenceId && (
    m.referenceId === 'FAC-PROV-0089' ||
    m.referenceId === 'FAC-PROV-0104' ||
    m.referenceId === 'VTA-00101' ||
    m.referenceId === 'VTA-00102' ||
    m.referenceId === 'VTA-00103' ||
    m.referenceId.toLowerCase().includes('ejemplo') ||
    m.referenceId.toLowerCase().includes('muestra')
  )) return true;
  if (m.notes && (
    m.notes.toLowerCase().includes('ejemplo') ||
    m.notes.toLowerCase().includes('muestra') ||
    m.notes.includes('FAC-PROV-0089') ||
    m.notes.includes('FAC-PROV-0104') ||
    m.notes.includes('VTA-00101') ||
    m.notes.includes('VTA-00102') ||
    m.notes.includes('VTA-00103')
  )) return true;
  return false;
};

/**
 * Recursively removes all undefined fields from an object or array.
 * Firestore throws "Unsupported field value: undefined" if any field is undefined.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        result[key] = sanitizeForFirestore(value);
      }
    }
    return result as T;
  }
  return data;
}

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_products`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If cached products are the old grocery store demo items, migrate to Moon Store
          const hasOldDemoProducts = parsed.some(
            (p: Product) =>
              p.name?.includes('Café de Grano') ||
              p.name?.includes('Aceite de Oliva') ||
              p.name?.includes('Detergente Líquido')
          );
          if (!hasOldDemoProducts) {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Error loading products from cache', e);
      }
    }
    return INITIAL_PRODUCTS;
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_purchases`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((p: Purchase) => !isExamplePurchase(p));
        }
      } catch (e) {
        console.error('Error loading purchases from cache', e);
      }
    }
    return INITIAL_PURCHASES;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_sales`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((s: Sale) => !isExampleSale(s));
        }
      } catch (e) {
        console.error('Error loading sales from cache', e);
      }
    }
    return INITIAL_SALES;
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_movements`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((m: StockMovement) => !isExampleMovement(m));
        }
      } catch (e) {
        console.error('Error loading movements from cache', e);
      }
    }
    return INITIAL_MOVEMENTS;
  });

  const [config, setConfig] = useState<BusinessConfig>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_config`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          parsed.businessName &&
          parsed.businessName !== 'Comercial La Esperanza'
        ) {
          return parsed;
        }
      } catch (e) {
        console.error('Error loading config from cache', e);
      }
    }
    return INITIAL_BUSINESS_CONFIG;
  });

  const [cloudConnected, setCloudConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const initialSeededRef = useRef<boolean>(false);

  // Proactive cleanup of example purchases and sales from Firestore
  useEffect(() => {
    const purgeExampleData = async () => {
      try {
        const purges = [
          deleteDoc(doc(db, 'purchases', 'pur-1')),
          deleteDoc(doc(db, 'purchases', 'pur-2')),
          deleteDoc(doc(db, 'sales', 'sale-1')),
          deleteDoc(doc(db, 'sales', 'sale-2')),
          deleteDoc(doc(db, 'sales', 'sale-3')),
          deleteDoc(doc(db, 'movements', 'mov-1')),
          deleteDoc(doc(db, 'movements', 'mov-2')),
          deleteDoc(doc(db, 'movements', 'mov-3')),
          deleteDoc(doc(db, 'movements', 'mov-4')),
          deleteDoc(doc(db, 'movements', 'mov-5')),
          deleteDoc(doc(db, 'movements', 'mov-6')),
          deleteDoc(doc(db, 'movements', 'mov-7')),
          deleteDoc(doc(db, 'movements', 'mov-8')),
          deleteDoc(doc(db, 'movements', 'mov-9')),
          deleteDoc(doc(db, 'movements', 'mov-10')),
        ];
        await Promise.allSettled(purges);
      } catch (err) {
        console.warn('Example cleanup warning:', err);
      }
    };
    purgeExampleData();
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Sync to LocalStorage as offline backup & cache
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_products`, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_purchases`, JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_sales`, JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_movements`, JSON.stringify(movements));
  }, [movements]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_config`, JSON.stringify(config));
  }, [config]);

  // Firestore Real-Time Subscriptions
  useEffect(() => {
    setIsSyncing(true);

    // 1. Products Listener
    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudProducts = snapshot.docs.map((docSnap) => docSnap.data() as Product);
          // Sort with recently updated first
          cloudProducts.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
          setProducts(cloudProducts);
        } else if (!initialSeededRef.current && products.length > 0) {
          // Seed cloud database if empty
          initialSeededRef.current = true;
          syncAllToCloud();
        }
        setCloudConnected(true);
        setLastSyncTime(new Date());
        setIsSyncing(false);
      },
      (error) => {
        setCloudConnected(false);
        setIsSyncing(false);
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
    );

    // 2. Purchases Listener
    const unsubPurchases = onSnapshot(
      collection(db, 'purchases'),
      (snapshot) => {
        if (!snapshot.empty) {
          const allCloudPurchases = snapshot.docs.map((docSnap) => docSnap.data() as Purchase);
          // Purge any example purchases from Firestore
          allCloudPurchases.forEach((p) => {
            if (isExamplePurchase(p)) {
              deleteDoc(doc(db, 'purchases', p.id)).catch(() => {});
            }
          });
          const cloudPurchases = allCloudPurchases.filter((p) => !isExamplePurchase(p));
          cloudPurchases.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
          setPurchases(cloudPurchases);
        } else {
          setPurchases([]);
        }
        setLastSyncTime(new Date());
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'purchases');
      }
    );

    // 3. Sales Listener
    const unsubSales = onSnapshot(
      collection(db, 'sales'),
      (snapshot) => {
        if (!snapshot.empty) {
          const allCloudSales = snapshot.docs.map((docSnap) => docSnap.data() as Sale);
          // Purge any example sales from Firestore
          allCloudSales.forEach((s) => {
            if (isExampleSale(s)) {
              deleteDoc(doc(db, 'sales', s.id)).catch(() => {});
            }
          });
          const cloudSales = allCloudSales.filter((s) => !isExampleSale(s));
          cloudSales.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
          setSales(cloudSales);
        } else {
          setSales([]);
        }
        setLastSyncTime(new Date());
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'sales');
      }
    );

    // 4. Stock Movements Listener
    const unsubMovements = onSnapshot(
      collection(db, 'movements'),
      (snapshot) => {
        if (!snapshot.empty) {
          const allCloudMovements = snapshot.docs.map((docSnap) => docSnap.data() as StockMovement);
          // Purge any example movements from Firestore
          allCloudMovements.forEach((m) => {
            if (isExampleMovement(m)) {
              deleteDoc(doc(db, 'movements', m.id)).catch(() => {});
            }
          });
          const cloudMovements = allCloudMovements.filter((m) => !isExampleMovement(m));
          cloudMovements.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
          setMovements(cloudMovements);
        } else {
          setMovements([]);
        }
        setLastSyncTime(new Date());
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'movements');
      }
    );

    // 5. Config Listener
    const unsubConfig = onSnapshot(
      doc(db, 'config', 'store_config'),
      (docSnap) => {
        if (docSnap.exists()) {
          const cloudConfig = docSnap.data() as BusinessConfig;
          if (cloudConfig.businessName && cloudConfig.businessName !== 'Comercial La Esperanza') {
            setConfig(cloudConfig);
          } else {
            // Update cloud config to Moon Store
            setConfig(INITIAL_BUSINESS_CONFIG);
            setDoc(doc(db, 'config', 'store_config'), INITIAL_BUSINESS_CONFIG, { merge: true }).catch(() => {});
          }
        }
        setLastSyncTime(new Date());
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'config/store_config');
      }
    );

    return () => {
      unsubProducts();
      unsubPurchases();
      unsubSales();
      unsubMovements();
      unsubConfig();
    };
  }, []);

  // Helper to sync all current state to cloud
  const syncAllToCloud = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Batch write products
      const batch = writeBatch(db);
      for (const prod of products) {
        const ref = doc(db, 'products', prod.id);
        batch.set(ref, sanitizeForFirestore(prod), { merge: true });
      }

      // 2. Write Config
      const configRef = doc(db, 'config', 'store_config');
      batch.set(configRef, sanitizeForFirestore(config), { merge: true });

      // 3. Write Purchases
      for (const pur of purchases) {
        const ref = doc(db, 'purchases', pur.id);
        batch.set(ref, sanitizeForFirestore(pur), { merge: true });
      }

      // 4. Write Sales
      for (const sale of sales) {
        const ref = doc(db, 'sales', sale.id);
        batch.set(ref, sanitizeForFirestore(sale), { merge: true });
      }

      // 5. Write Movements
      for (const mov of movements.slice(0, 100)) {
        const ref = doc(db, 'movements', mov.id);
        batch.set(ref, sanitizeForFirestore(mov), { merge: true });
      }

      await batch.commit();
      setCloudConnected(true);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Error syncing all to cloud:', err);
      handleFirestoreError(err, OperationType.WRITE, 'sync_all');
    } finally {
      setIsSyncing(false);
    }
  }, [products, config, purchases, sales, movements]);

  const signInGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Error signing in with Google:', err);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const formatCurrency = (amount: number): string => {
    const symbol = (config.currency || '$').trim();
    const num = Math.round(Number(amount) || 0);
    // Format according to Colombian currency standards (es-CO with dot thousands separator)
    const formatted = num.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    if (symbol === '$') {
      return `$ ${formatted}`;
    }
    if (symbol.toLowerCase().includes('cop')) {
      return `$ ${formatted} COP`;
    }
    return `${symbol} ${formatted}`;
  };

  const addProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product => {
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      updatedAt: now,
    };

    setProducts((prev) => [newProduct, ...prev]);

    let initialMovement: StockMovement | null = null;
    if (newProduct.stock > 0) {
      initialMovement = {
        id: `mov-${Date.now()}`,
        date: now,
        type: 'ajuste_manual',
        productId: newProduct.id,
        productName: newProduct.name,
        quantityChange: newProduct.stock,
        previousStock: 0,
        newStock: newProduct.stock,
        notes: 'Inventario inicial al crear producto',
      };
      setMovements((prev) => [initialMovement!, ...prev]);
    }

    // Background write to Firestore
    (async () => {
      try {
        setIsSyncing(true);
        await setDoc(doc(db, 'products', newProduct.id), sanitizeForFirestore(newProduct));
        if (initialMovement) {
          await setDoc(doc(db, 'movements', initialMovement.id), sanitizeForFirestore(initialMovement));
        }
        setLastSyncTime(new Date());
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `products/${newProduct.id}`);
      } finally {
        setIsSyncing(false);
      }
    })();

    return newProduct;
  };

  const updateProduct = (id: string, productData: Partial<Product>) => {
    const now = new Date().toISOString();
    const existingProd = products.find((item) => item.id === id);
    const fullUpdatedProduct: Product = {
      ...(existingProd || ({} as Product)),
      ...productData,
      id,
      updatedAt: now,
    };

    setProducts((prev) =>
      prev.map((item) => (item.id === id ? fullUpdatedProduct : item))
    );

    // Background write to Firestore
    (async () => {
      try {
        setIsSyncing(true);
        await setDoc(doc(db, 'products', id), sanitizeForFirestore(fullUpdatedProduct), { merge: true });
        setLastSyncTime(new Date());
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `products/${id}`);
      } finally {
        setIsSyncing(false);
      }
    })();
  };

  const deleteProduct = (id: string, force = true): { success: boolean; message?: string } => {
    const hasSales = sales.some((s) => s.items.some((i) => i.productId === id));
    if (hasSales && !force) {
      return {
        success: false,
        message: 'No se puede eliminar un producto con historial de ventas sin confirmación.',
      };
    }

    setProducts((prev) => prev.filter((p) => p.id !== id));

    // Background delete from Firestore
    (async () => {
      try {
        setIsSyncing(true);
        await deleteDoc(doc(db, 'products', id));
        setLastSyncTime(new Date());
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
      } finally {
        setIsSyncing(false);
      }
    })();

    return { success: true };
  };

  const adjustStock = (productId: string, newStock: number, reason: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const diff = newStock - prod.stock;
    const now = new Date().toISOString();

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock, updatedAt: now } : p))
    );

    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      date: now,
      type: 'ajuste_manual',
      productId: prod.id,
      productName: prod.name,
      quantityChange: diff,
      previousStock: prod.stock,
      newStock: newStock,
      notes: reason || 'Ajuste manual de inventario',
    };
    setMovements((prev) => [movement, ...prev]);

    // Background write to Firestore
    (async () => {
      try {
        setIsSyncing(true);
        const batch = writeBatch(db);
        batch.update(doc(db, 'products', productId), { stock: newStock, updatedAt: now });
        batch.set(doc(db, 'movements', movement.id), movement);
        await batch.commit();
        setLastSyncTime(new Date());
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `products/${productId}`);
      } finally {
        setIsSyncing(false);
      }
    })();
  };

  const deleteMovement = (
    movementId: string,
    revertStock: boolean = false
  ): { success: boolean; error?: string } => {
    const movementToDelete = movements.find((m) => m.id === movementId);
    if (!movementToDelete) {
      return { success: false, error: 'Movimiento no encontrado' };
    }

    const now = new Date().toISOString();
    const updatedProducts = [...products];

    if (revertStock && movementToDelete.productId && movementToDelete.quantityChange !== 0) {
      const pIndex = updatedProducts.findIndex((p) => p.id === movementToDelete.productId);
      if (pIndex !== -1) {
        const prod = updatedProducts[pIndex];
        const newStock = Math.max(0, prod.stock - movementToDelete.quantityChange);
        updatedProducts[pIndex] = {
          ...prod,
          stock: newStock,
          updatedAt: now,
        };
        setProducts(updatedProducts);
      }
    }

    setMovements((prev) => prev.filter((m) => m.id !== movementId));

    // Background write to Firestore
    (async () => {
      try {
        setIsSyncing(true);
        const batch = writeBatch(db);
        batch.delete(doc(db, 'movements', movementId));

        if (revertStock && movementToDelete.productId && movementToDelete.quantityChange !== 0) {
          const p = updatedProducts.find((x) => x.id === movementToDelete.productId);
          if (p) {
            batch.update(doc(db, 'products', p.id), {
              stock: p.stock,
              updatedAt: now,
            });
          }
        }

        await batch.commit();
        setLastSyncTime(new Date());
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `movements/${movementId}`);
      } finally {
        setIsSyncing(false);
      }
    })();

    return { success: true };
  };

  const clearExampleMovements = async (): Promise<number> => {
    const examples = movements.filter((m) => isExampleMovement(m));
    if (examples.length === 0) return 0;
    const exampleIds = new Set(examples.map((m) => m.id));
    setMovements((prev) => prev.filter((m) => !exampleIds.has(m.id)));

    try {
      const batch = writeBatch(db);
      examples.forEach((m) => {
        batch.delete(doc(db, 'movements', m.id));
      });
      await batch.commit();
    } catch (e) {
      console.warn('Error deleting example movements from Firestore', e);
    }
    return examples.length;
  };

  const recordPurchase = (purchaseData: {
    supplierName: string;
    invoiceNumber: string;
    paymentMethod: Purchase['paymentMethod'];
    notes?: string;
    items: { productId: string; quantity: number; unitCost: number }[];
  }): Purchase => {
    const now = new Date().toISOString();
    const purchaseItems: PurchaseItem[] = [];
    let grandTotal = 0;
    const newMovements: StockMovement[] = [];

    const updatedProducts = [...products];

    purchaseData.items.forEach((item) => {
      const prodIndex = updatedProducts.findIndex((p) => p.id === item.productId);
      if (prodIndex !== -1) {
        const product = updatedProducts[prodIndex];
        const subtotal = item.quantity * item.unitCost;
        grandTotal += subtotal;

        purchaseItems.push({
          productId: product.id,
          productName: product.name,
          code: product.code,
          quantity: item.quantity,
          unitCost: item.unitCost,
          subtotal,
        });

        const prevStock = product.stock;
        const newStock = prevStock + item.quantity;

        updatedProducts[prodIndex] = {
          ...product,
          stock: newStock,
          costPrice: item.unitCost,
          updatedAt: now,
        };

        newMovements.push({
          id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          date: now,
          type: 'compra',
          productId: product.id,
          productName: product.name,
          quantityChange: item.quantity,
          previousStock: prevStock,
          newStock: newStock,
          referenceId: purchaseData.invoiceNumber || 'Compra sin factura',
          notes: `Proveedor: ${purchaseData.supplierName}`,
        });
      }
    });

    const newPurchase: Purchase = {
      id: `pur-${Date.now()}`,
      invoiceNumber: purchaseData.invoiceNumber || `FAC-P-${Math.floor(1000 + Math.random() * 9000)}`,
      date: now,
      supplierName: purchaseData.supplierName || 'Proveedor General',
      items: purchaseItems,
      total: grandTotal,
      paymentMethod: purchaseData.paymentMethod,
      notes: purchaseData.notes,
    };

    setProducts(updatedProducts);
    setPurchases((prev) => [newPurchase, ...prev]);
    setMovements((prev) => [...newMovements, ...prev]);

    // Background Firestore write
    (async () => {
      try {
        setIsSyncing(true);
        const batch = writeBatch(db);
        batch.set(doc(db, 'purchases', newPurchase.id), sanitizeForFirestore(newPurchase));

        purchaseItems.forEach((pi) => {
          const p = updatedProducts.find((x) => x.id === pi.productId);
          if (p) {
            batch.update(doc(db, 'products', p.id), sanitizeForFirestore({
              stock: p.stock,
              costPrice: p.costPrice,
              updatedAt: now,
            }));
          }
        });

        newMovements.forEach((mov) => {
          batch.set(doc(db, 'movements', mov.id), sanitizeForFirestore(mov));
        });

        await batch.commit();
        setLastSyncTime(new Date());
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `purchases/${newPurchase.id}`);
      } finally {
        setIsSyncing(false);
      }
    })();

    return newPurchase;
  };

  const deletePurchase = (
    purchaseId: string,
    revertStock: boolean = true
  ): { success: boolean; error?: string } => {
    const purchaseToDelete = purchases.find((p) => p.id === purchaseId);
    if (!purchaseToDelete) {
      return { success: false, error: 'Compra no encontrada' };
    }

    const now = new Date().toISOString();
    const updatedProducts = [...products];
    const restoreMovements: StockMovement[] = [];

    if (revertStock) {
      purchaseToDelete.items.forEach((item) => {
        const pIndex = updatedProducts.findIndex((p) => p.id === item.productId);
        if (pIndex !== -1) {
          const prod = updatedProducts[pIndex];
          const prevStock = prod.stock;
          const newStock = Math.max(0, prevStock - item.quantity);
          updatedProducts[pIndex] = {
            ...prod,
            stock: newStock,
            updatedAt: now,
          };
          restoreMovements.push({
            id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            date: now,
            type: 'ajuste_manual',
            productId: prod.id,
            productName: prod.name,
            quantityChange: -item.quantity,
            previousStock: prevStock,
            newStock: newStock,
            referenceId: purchaseToDelete.invoiceNumber,
            notes: `Ajuste por eliminación de orden de compra ${purchaseToDelete.invoiceNumber}`,
          });
        }
      });
      setProducts(updatedProducts);
      if (restoreMovements.length > 0) {
        setMovements((prev) => [...restoreMovements, ...prev]);
      }
    }

    setPurchases((prev) => prev.filter((p) => p.id !== purchaseId));

    // Background Firestore write
    (async () => {
      try {
        setIsSyncing(true);
        const batch = writeBatch(db);
        batch.delete(doc(db, 'purchases', purchaseId));

        if (revertStock) {
          purchaseToDelete.items.forEach((item) => {
            const p = updatedProducts.find((x) => x.id === item.productId);
            if (p) {
              batch.update(doc(db, 'products', p.id), {
                stock: p.stock,
                updatedAt: now,
              });
            }
          });
          restoreMovements.forEach((mov) => {
            batch.set(doc(db, 'movements', mov.id), mov);
          });
        }

        await batch.commit();
        setLastSyncTime(new Date());
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `purchases/${purchaseId}`);
      } finally {
        setIsSyncing(false);
      }
    })();

    return { success: true };
  };

  const recordSale = (saleData: {
    customerName?: string;
    customerPhone?: string;
    seller?: 'Isa' | 'Vivi' | string;
    paidTo?: 'Isa' | 'Juli' | string;
    deliveryFee?: number;
    deliveryPaidTo?: 'Isa' | 'Juli' | string;
    paymentMethod: Sale['paymentMethod'];
    discount?: number;
    notes?: string;
    date?: string;
    items: { productId: string; quantity: number; unitPrice?: number }[];
  }): { success: boolean; sale?: Sale; error?: string } => {
    // 1. Verify stock availability
    for (const item of saleData.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) {
        return { success: false, error: `Producto no encontrado (ID: ${item.productId})` };
      }
      if (prod.stock < item.quantity) {
        return {
          success: false,
          error: `Stock insuficiente para "${prod.name}". Solicitado: ${item.quantity}, Disponible: ${prod.stock}`,
        };
      }
    }

    const now = new Date().toISOString();
    const effectiveSaleDate = saleData.date ? new Date(saleData.date).toISOString() : now;
    const saleItems: SaleItem[] = [];
    let subtotal = 0;
    const newMovements: StockMovement[] = [];
    const updatedProducts = [...products];

    saleData.items.forEach((item) => {
      const prodIndex = updatedProducts.findIndex((p) => p.id === item.productId);
      const product = updatedProducts[prodIndex];
      const unitPrice = item.unitPrice !== undefined ? item.unitPrice : product.salePrice;
      const lineSubtotal = item.quantity * unitPrice;
      subtotal += lineSubtotal;

      saleItems.push({
        productId: product.id,
        productName: product.name,
        code: product.code,
        quantity: item.quantity,
        unitPrice: unitPrice,
        unitCost: product.costPrice,
        subtotal: lineSubtotal,
      });

      const prevStock = product.stock;
      const newStock = prevStock - item.quantity;

      updatedProducts[prodIndex] = {
        ...product,
        stock: newStock,
        updatedAt: now,
      };

      newMovements.push({
        id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        date: effectiveSaleDate,
        type: 'venta',
        productId: product.id,
        productName: product.name,
        quantityChange: -item.quantity,
        previousStock: prevStock,
        newStock: newStock,
        referenceId: `Venta-${effectiveSaleDate.slice(0, 10)}`,
        notes: `Vendedor: ${saleData.seller || 'Isa'} | Pago a: ${saleData.paidTo || 'Isa'}${saleData.customerName && saleData.customerName !== 'Consumidor Final' ? ` | Cliente: ${saleData.customerName}` : ''}`,
      });
    });

    const discount = saleData.discount || 0;
    const deliveryFee = Math.max(0, saleData.deliveryFee || 0);
    const deliveryPaidTo = saleData.deliveryPaidTo || saleData.paidTo || 'Isa';
    const total = Math.max(0, subtotal - discount) + deliveryFee;

    const saleNumber = `VTA-${Math.floor(100000 + Math.random() * 900000)}`;

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      invoiceNumber: saleNumber,
      date: effectiveSaleDate,
      customerName: saleData.customerName || 'Consumidor Final',
      customerPhone: saleData.customerPhone,
      seller: saleData.seller || 'Isa',
      paidTo: saleData.paidTo || 'Isa',
      deliveryFee,
      deliveryPaidTo,
      items: saleItems,
      subtotal,
      discount,
      total,
      paymentMethod: saleData.paymentMethod,
      notes: saleData.notes,
      status: 'completada',
    };

    newMovements.forEach((m) => {
      m.referenceId = saleNumber;
    });

    setProducts(updatedProducts);
    setSales((prev) => [newSale, ...prev]);
    setMovements((prev) => [...newMovements, ...prev]);

    // Background Firestore write
    (async () => {
      try {
        setIsSyncing(true);
        const batch = writeBatch(db);
        batch.set(doc(db, 'sales', newSale.id), sanitizeForFirestore(newSale));

        saleItems.forEach((si) => {
          const p = updatedProducts.find((x) => x.id === si.productId);
          if (p) {
            batch.update(doc(db, 'products', p.id), sanitizeForFirestore({
              stock: p.stock,
              updatedAt: now,
            }));
          }
        });

        newMovements.forEach((mov) => {
          batch.set(doc(db, 'movements', mov.id), sanitizeForFirestore(mov));
        });

        await batch.commit();
        setLastSyncTime(new Date());
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `sales/${newSale.id}`);
      } finally {
        setIsSyncing(false);
      }
    })();

    return { success: true, sale: newSale };
  };

  const cancelSale = (saleId: string, reason?: string): { success: boolean; error?: string } => {
    const saleToCancel = sales.find((s) => s.id === saleId);
    if (!saleToCancel) {
      return { success: false, error: 'Venta no encontrada' };
    }
    if (saleToCancel.status === 'anulada') {
      return { success: false, error: 'Esta venta ya fue anulada previamente' };
    }

    const now = new Date().toISOString();
    const updatedProducts = [...products];
    const restoreMovements: StockMovement[] = [];

    // Return stock
    saleToCancel.items.forEach((item) => {
      const pIndex = updatedProducts.findIndex((p) => p.id === item.productId);
      if (pIndex !== -1) {
        const prod = updatedProducts[pIndex];
        const prevStock = prod.stock;
        const newStock = prevStock + item.quantity;

        updatedProducts[pIndex] = {
          ...prod,
          stock: newStock,
          updatedAt: now,
        };

        restoreMovements.push({
          id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          date: now,
          type: 'anulacion_venta',
          productId: prod.id,
          productName: prod.name,
          quantityChange: item.quantity,
          previousStock: prevStock,
          newStock: newStock,
          referenceId: saleToCancel.invoiceNumber,
          notes: `Devolución por anulación de venta. ${reason ? `Motivo: ${reason}` : ''}`,
        });
      }
    });

    const updatedNotes = `${saleToCancel.notes ? saleToCancel.notes + ' | ' : ''}ANULADA: ${reason || 'Sin especificar'}`;

    setProducts(updatedProducts);
    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? {
              ...s,
              status: 'anulada',
              notes: updatedNotes,
            }
          : s
      )
    );
    setMovements((prev) => [...restoreMovements, ...prev]);

    // Background Firestore write
    (async () => {
      try {
        setIsSyncing(true);
        const batch = writeBatch(db);
        batch.update(doc(db, 'sales', saleId), {
          status: 'anulada',
          notes: updatedNotes,
        });

        saleToCancel.items.forEach((item) => {
          const p = updatedProducts.find((x) => x.id === item.productId);
          if (p) {
            batch.update(doc(db, 'products', p.id), {
              stock: p.stock,
              updatedAt: now,
            });
          }
        });

        restoreMovements.forEach((mov) => {
          batch.set(doc(db, 'movements', mov.id), mov);
        });

        await batch.commit();
        setLastSyncTime(new Date());
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `sales/${saleId}`);
      } finally {
        setIsSyncing(false);
      }
    })();

    return { success: true };
  };

  const deleteSale = (
    saleId: string,
    returnStockIfActive: boolean = false
  ): { success: boolean; error?: string } => {
    const saleToDelete = sales.find((s) => s.id === saleId);
    if (!saleToDelete) {
      return { success: false, error: 'Venta no encontrada' };
    }

    const now = new Date().toISOString();
    const updatedProducts = [...products];
    const restoreMovements: StockMovement[] = [];

    if (saleToDelete.status === 'completada' && returnStockIfActive) {
      saleToDelete.items.forEach((item) => {
        const pIndex = updatedProducts.findIndex((p) => p.id === item.productId);
        if (pIndex !== -1) {
          const prod = updatedProducts[pIndex];
          const prevStock = prod.stock;
          const newStock = prevStock + item.quantity;
          updatedProducts[pIndex] = {
            ...prod,
            stock: newStock,
            updatedAt: now,
          };
          restoreMovements.push({
            id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            date: now,
            type: 'anulacion_venta',
            productId: prod.id,
            productName: prod.name,
            quantityChange: item.quantity,
            previousStock: prevStock,
            newStock: newStock,
            referenceId: saleToDelete.invoiceNumber,
            notes: `Devolución al inventario por eliminación de venta ${saleToDelete.invoiceNumber}`,
          });
        }
      });
      setProducts(updatedProducts);
      if (restoreMovements.length > 0) {
        setMovements((prev) => [...restoreMovements, ...prev]);
      }
    }

    setSales((prev) => prev.filter((s) => s.id !== saleId));

    // Background Firestore write
    (async () => {
      try {
        setIsSyncing(true);
        const batch = writeBatch(db);
        batch.delete(doc(db, 'sales', saleId));

        if (saleToDelete.status === 'completada' && returnStockIfActive) {
          saleToDelete.items.forEach((item) => {
            const p = updatedProducts.find((x) => x.id === item.productId);
            if (p) {
              batch.update(doc(db, 'products', p.id), {
                stock: p.stock,
                updatedAt: now,
              });
            }
          });
          restoreMovements.forEach((mov) => {
            batch.set(doc(db, 'movements', mov.id), mov);
          });
        }

        await batch.commit();
        setLastSyncTime(new Date());
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `sales/${saleId}`);
      } finally {
        setIsSyncing(false);
      }
    })();

    return { success: true };
  };

  const clearSalesHistory = (
    returnStockForActive: boolean = false
  ): { success: boolean; clearedCount: number } => {
    const count = sales.length;
    if (count === 0) {
      return { success: true, clearedCount: 0 };
    }

    const salesSnapshot = [...sales];
    const now = new Date().toISOString();
    const updatedProducts = [...products];
    const restoreMovements: StockMovement[] = [];

    if (returnStockForActive) {
      salesSnapshot.forEach((sale) => {
        if (sale.status === 'completada') {
          sale.items.forEach((item) => {
            const pIndex = updatedProducts.findIndex((p) => p.id === item.productId);
            if (pIndex !== -1) {
              const prod = updatedProducts[pIndex];
              const prevStock = prod.stock;
              const newStock = prevStock + item.quantity;
              updatedProducts[pIndex] = {
                ...prod,
                stock: newStock,
                updatedAt: now,
              };
              restoreMovements.push({
                id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                date: now,
                type: 'anulacion_venta',
                productId: prod.id,
                productName: prod.name,
                quantityChange: item.quantity,
                previousStock: prevStock,
                newStock: newStock,
                referenceId: sale.invoiceNumber,
                notes: `Devolución al inventario por limpieza de historial (${sale.invoiceNumber})`,
              });
            }
          });
        }
      });

      setProducts(updatedProducts);
      if (restoreMovements.length > 0) {
        setMovements((prev) => [...restoreMovements, ...prev]);
      }
    }

    setSales([]);

    // Background Firestore batch delete
    (async () => {
      try {
        setIsSyncing(true);
        const batch = writeBatch(db);
        salesSnapshot.forEach((s) => {
          batch.delete(doc(db, 'sales', s.id));
        });

        if (returnStockForActive) {
          updatedProducts.forEach((p) => {
            batch.update(doc(db, 'products', p.id), {
              stock: p.stock,
              updatedAt: now,
            });
          });
          restoreMovements.forEach((m) => {
            batch.set(doc(db, 'movements', m.id), m);
          });
        }

        await batch.commit();
        setLastSyncTime(new Date());
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'sales/clear');
      } finally {
        setIsSyncing(false);
      }
    })();

    return { success: true, clearedCount: count };
  };

  const updateConfig = (newConfig: Partial<BusinessConfig>) => {
    const merged = { ...config, ...newConfig };
    setConfig(merged);

    // Background Firestore write
    (async () => {
      try {
        setIsSyncing(true);
        await setDoc(doc(db, 'config', 'store_config'), merged, { merge: true });
        setLastSyncTime(new Date());
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'config/store_config');
      } finally {
        setIsSyncing(false);
      }
    })();
  };

  const resetData = () => {
    setProducts(INITIAL_PRODUCTS);
    setPurchases(INITIAL_PURCHASES);
    setSales(INITIAL_SALES);
    setMovements(INITIAL_MOVEMENTS);
    setConfig(INITIAL_BUSINESS_CONFIG);

    // Sync reset to Firestore
    (async () => {
      try {
        setIsSyncing(true);
        const batch = writeBatch(db);

        // Overwrite products
        INITIAL_PRODUCTS.forEach((p) => {
          batch.set(doc(db, 'products', p.id), p);
        });
        INITIAL_PURCHASES.forEach((p) => {
          batch.set(doc(db, 'purchases', p.id), p);
        });
        INITIAL_SALES.forEach((s) => {
          batch.set(doc(db, 'sales', s.id), s);
        });
        INITIAL_MOVEMENTS.forEach((m) => {
          batch.set(doc(db, 'movements', m.id), m);
        });
        batch.set(doc(db, 'config', 'store_config'), INITIAL_BUSINESS_CONFIG);

        await batch.commit();
        setLastSyncTime(new Date());
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'reset_data');
      } finally {
        setIsSyncing(false);
      }
    })();
  };

  const exportJSON = (): string => {
    const backup = {
      exportDate: new Date().toISOString(),
      config,
      products,
      purchases,
      sales,
      movements,
    };
    return JSON.stringify(backup, null, 2);
  };

  const importJSON = (dataString: string): { success: boolean; message: string } => {
    try {
      const parsed = JSON.parse(dataString);
      if (!parsed.products || !Array.isArray(parsed.products)) {
        return { success: false, message: 'Formato de archivo inválido: faltan productos.' };
      }

      setProducts(parsed.products);
      if (parsed.purchases) setPurchases(parsed.purchases);
      if (parsed.sales) setSales(parsed.sales);
      if (parsed.movements) setMovements(parsed.movements);
      if (parsed.config) setConfig(parsed.config);

      // Background sync imported data to Firestore
      (async () => {
        try {
          setIsSyncing(true);
          const batch = writeBatch(db);
          for (const p of parsed.products) {
            batch.set(doc(db, 'products', p.id), p, { merge: true });
          }
          if (parsed.config) {
            batch.set(doc(db, 'config', 'store_config'), parsed.config, { merge: true });
          }
          if (parsed.sales) {
            for (const s of parsed.sales) {
              batch.set(doc(db, 'sales', s.id), s, { merge: true });
            }
          }
          await batch.commit();
          setLastSyncTime(new Date());
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'import_data');
        } finally {
          setIsSyncing(false);
        }
      })();

      return { success: true, message: 'Datos importados y sincronizados con la nube correctamente.' };
    } catch (err: any) {
      return { success: false, message: `Error al leer JSON: ${err.message}` };
    }
  };

  return (
    <BusinessContext.Provider
      value={{
        products,
        purchases,
        sales,
        movements,
        config,
        cloudConnected,
        isSyncing,
        lastSyncTime,
        currentUser,
        signInGoogle,
        signOutUser,
        syncAllToCloud,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        deleteMovement,
        clearExampleMovements,
        recordPurchase,
        deletePurchase,
        recordSale,
        cancelSale,
        deleteSale,
        clearSalesHistory,
        updateConfig,
        resetData,
        exportJSON,
        importJSON,
        formatCurrency,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = (): BusinessContextType => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};
