import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ReceiptText,
  BarChart3,
  History,
  Settings,
  AlertTriangle,
  Plus,
  Cloud,
  RefreshCw,
  User as UserIcon,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { MoonStoreLogo } from './MoonStoreLogo';
import { PWAInstallButton } from './PWAInstallButton';

export type ActiveTab = 'dashboard' | 'inventory' | 'pos' | 'sales' | 'purchases' | 'movements';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
  onQuickNewSale: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onQuickNewSale,
}) => {
  const {
    config,
    products,
    cloudConnected,
    isSyncing,
    lastSyncTime,
    currentUser,
    signInGoogle,
    signOutUser,
    syncAllToCloud,
  } = useBusiness();

  const [showUserMenu, setShowUserMenu] = useState(false);

  // Calculate low stock items count
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Panel de Control', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart },
    { id: 'sales', label: 'Historial Ventas', icon: ReceiptText },
    { id: 'purchases', label: 'Resumen', icon: BarChart3 },
    { id: 'movements', label: 'Movimientos', icon: History },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#F2D6DE] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Business Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <MoonStoreLogo size="md" subtitle="TIENDA PARA MUJERES" showIcon={false} />
            {/* Cloud Sync Pill */}
            <button
              onClick={syncAllToCloud}
              title={
                cloudConnected
                  ? `Sincronizado con Firebase Firestore. Clic para forzar sincronización.`
                  : 'Reconectando con la base de datos en la nube...'
              }
              className={`hidden md:flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                cloudConnected
                  ? 'bg-[#FDF2F4] text-[#A7455F] border-[#F2BDCB] hover:bg-[#FCE7EC]'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {isSyncing ? (
                <RefreshCw className="w-3 h-3 animate-spin text-[#C86D85]" />
              ) : (
                <Cloud className="w-3 h-3 text-[#C86D85]" />
              )}
              <span>{isSyncing ? 'Sincronizando...' : 'Nube Activa'}</span>
            </button>
          </div>

          {/* Quick Actions (Right side on Desktop) */}
          <div className="flex items-center space-x-2">
            {/* PWA Direct Installation Button */}
            <PWAInstallButton />

            {lowStockCount > 0 && (
              <button
                id="btn-alert-low-stock"
                onClick={() => setActiveTab('inventory')}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors"
                title={`${lowStockCount} productos con stock bajo o agotado`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Stock Bajo:</span>
                <span className="bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full text-xs font-bold">
                  {lowStockCount}
                </span>
              </button>
            )}

            {/* Google User Auth */}
            <div className="relative">
              {currentUser ? (
                <div>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-1.5 p-1 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors"
                    title={currentUser.email || 'Usuario conectado'}
                  >
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="Usuario"
                        className="w-7 h-7 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#FDF2F4] text-[#C86D85] flex items-center justify-center font-bold text-xs">
                        {currentUser.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-stone-200 p-3 z-50 text-xs space-y-2">
                      <div className="pb-2 border-b border-stone-100">
                        <p className="font-semibold text-stone-900 truncate">
                          {currentUser.displayName || 'Propietario del Negocio'}
                        </p>
                        <p className="text-stone-500 truncate text-[11px]">{currentUser.email}</p>
                        <div className="mt-1 flex items-center space-x-1 text-[#A7455F] text-[11px]">
                          <CheckCircle2 className="w-3 h-3 text-[#C86D85]" />
                          <span>Conectado a Firebase Firestore</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          signOutUser();
                          setShowUserMenu(false);
                        }}
                        className="w-full py-1.5 px-2 text-rose-600 hover:bg-rose-50 rounded-lg flex items-center space-x-2 font-medium transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={signInGoogle}
                  className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 border border-stone-200 hover:border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700 rounded-lg text-xs font-semibold transition-colors"
                  title="Inicia sesión con tu cuenta de Google para respaldar y abrir tu negocio en cualquier PC"
                >
                  <UserIcon className="w-3.5 h-3.5 text-stone-500" />
                  <span>Acceder con Google</span>
                </button>
              )}
            </div>

            <button
              id="btn-open-settings"
              onClick={onOpenSettings}
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-[#FDF2F4] rounded-lg transition-colors"
              title="Configuración y Respaldos"
            >
              <Settings className="w-5 h-5 text-stone-600 hover:text-[#C86D85]" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex space-x-1 overflow-x-auto scrollbar-none py-1 border-t border-[#F7E1E7]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#C86D85] text-white shadow-xs'
                    : 'text-stone-600 hover:text-[#8C344D] hover:bg-[#FDF2F4]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-400'}`} />
                <span>{item.label}</span>
                {item.id === 'inventory' && lowStockCount > 0 && (
                  <span
                    className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white text-[#8C344D]' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {lowStockCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
