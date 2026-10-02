/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BusinessProvider } from './context/BusinessContext';
import { Navbar, ActiveTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { InventoryManager } from './components/InventoryManager';
import { PointOfSale } from './components/PointOfSale';
import { SalesHistory } from './components/SalesHistory';
import { SalesSummary } from './components/SalesSummary';
import { StockMovements } from './components/StockMovements';
import { SettingsModal } from './components/SettingsModal';
import { OfflineIndicator } from './components/OfflineIndicator';

function MainApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF7F8] text-stone-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onQuickNewSale={() => setActiveTab('pos')}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Dashboard
                setActiveTab={setActiveTab}
                onOpenProductModal={() => {
                  setActiveTab('inventory');
                  setIsProductModalOpen(true);
                }}
                onOpenPurchaseModal={() => {
                  setActiveTab('purchases');
                  setIsPurchaseModalOpen(true);
                }}
              />
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <InventoryManager
                isCreateModalOpen={isProductModalOpen}
                setIsCreateModalOpen={setIsProductModalOpen}
              />
            </motion.div>
          )}

          {activeTab === 'pos' && (
            <motion.div
              key="pos"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <PointOfSale />
            </motion.div>
          )}

          {activeTab === 'sales' && (
            <motion.div
              key="sales"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <SalesHistory />
            </motion.div>
          )}

          {activeTab === 'purchases' && (
            <motion.div
              key="purchases"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <SalesSummary />
            </motion.div>
          )}

          {activeTab === 'movements' && (
            <motion.div
              key="movements"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <StockMovements />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Settings & Backup Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Network connectivity banner */}
      <OfflineIndicator />

      {/* Footer */}
      <footer className="bg-white border-t border-[#F2D6DE] mt-auto py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#C86D85] inline-block animate-pulse"></span>
            <span className="font-medium text-stone-700">Moon Store • Tienda para Mujeres</span>
            <span className="text-stone-300">|</span>
            <span className="text-[#8C344D] font-semibold">Peso Colombiano (COP)</span>
          </div>
          <div className="text-stone-400">
            Control de Inventario, Compras y Punto de Venta
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BusinessProvider>
      <MainApp />
    </BusinessProvider>
  );
}
