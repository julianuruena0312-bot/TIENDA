import React, { useState, useRef } from 'react';
import {
  Settings,
  X,
  Save,
  Download,
  Upload,
  RotateCcw,
  Store,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  RefreshCw,
  Database,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { MoonStoreLogo } from './MoonStoreLogo';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    config,
    updateConfig,
    exportJSON,
    importJSON,
    resetData,
    cloudConnected,
    isSyncing,
    lastSyncTime,
    currentUser,
    signInGoogle,
    signOutUser,
    syncAllToCloud,
  } = useBusiness();

  const [businessName, setBusinessName] = useState(config.businessName);
  const [ownerName, setOwnerName] = useState(config.ownerName);
  const [phone, setPhone] = useState(config.phone);
  const [address, setAddress] = useState(config.address);
  const [currency, setCurrency] = useState(config.currency);
  const [savedMessage, setSavedMessage] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState(false);
  const [importMessage, setImportMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    await syncAllToCloud();
    setSyncSuccessMsg(true);
    setTimeout(() => setSyncSuccessMsg(false), 2500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      currency: currency.trim() || '$',
    });
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2500);
  };

  const handleDownloadBackup = () => {
    const dataStr = exportJSON();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `respaldo_negocio_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importJSON(content);
      if (res.success) {
        setImportMessage({ text: res.message, isError: false });
        setTimeout(() => {
          setImportMessage(null);
          onClose();
        }, 1800);
      } else {
        setImportMessage({ text: res.message, isError: true });
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    resetData();
    setIsConfirmingReset(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-800 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-lg text-stone-900">Configuración del Negocio</h3>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedMessage && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Configuración guardada correctamente.</span>
          </div>
        )}

        {importMessage && (
          <div
            className={`mt-3 p-3 text-xs rounded-lg flex items-center space-x-2 border ${
              importMessage.isError
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {importMessage.isError ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{importMessage.text}</span>
          </div>
        )}

        {/* Moon Store Brand Banner */}
        <div className="mt-4 p-3 bg-gradient-to-r from-[#FFF5F7] to-[#FCE7EC] rounded-xl border border-[#F2BDCB] flex items-center justify-between">
          <MoonStoreLogo size="sm" />
          <span className="text-[11px] font-bold text-[#8C344D] bg-white px-2.5 py-1 rounded-md border border-[#F2BDCB] shadow-2xs">
            Colores & Logo Activos
          </span>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nombre Comercial del Negocio
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#C86D85]/20 focus:border-[#C86D85]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Símbolo de Moneda (COP)
              </label>
              <input
                type="text"
                required
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="$"
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg font-bold focus:ring-2 focus:ring-[#C86D85]/20 focus:border-[#C86D85]"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">Ej. $ o $ COP (Peso Colombiano)</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Teléfono</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+57 300 123 4567"
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#C86D85]/20 focus:border-[#C86D85]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Dirección del Establecimiento (para tickets)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Carrera 43A # 1-50, Medellín, Colombia"
              className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#C86D85]/20 focus:border-[#C86D85]"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-[#C86D85] hover:bg-[#B3556E] text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>

        {/* Firebase Cloud Firestore Sync Section */}
        <div className="mt-6 pt-5 border-t border-stone-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Cloud className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                Base de Datos en la Nube (Firebase)
              </h4>
            </div>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                cloudConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {cloudConnected ? 'Conectado a Firestore' : 'Conectando...'}
            </span>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            Tu tienda está conectada a <strong>Google Firebase Firestore</strong>. Todos los productos, imágenes, ventas, compras y configuración se sincronizan automáticamente en tiempo real. Puedes abrir esta aplicación desde cualquier ordenador, tableta o teléfono y ver tus datos actualizados al instante.
          </p>

          {syncSuccessMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>¡Datos sincronizados exitosamente con la nube!</span>
            </div>
          )}

          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Estado de Sincronización:</span>
              <span className="font-semibold text-stone-800 flex items-center space-x-1">
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                    <span>Sincronizando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Al día ({lastSyncTime ? lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'})</span>
                  </>
                )}
              </span>
            </div>

            {currentUser && (
              <div className="flex items-center justify-between pt-1 border-t border-stone-200">
                <span className="text-stone-500">Cuenta de Google:</span>
                <span className="font-semibold text-stone-800 truncate max-w-[200px]">
                  {currentUser.email}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Forzar Sincronización a la Nube'}</span>
            </button>

            {!currentUser ? (
              <button
                type="button"
                onClick={signInGoogle}
                className="py-2 px-3 border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
              >
                <span>Acceder con Google</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={signOutUser}
                className="py-2 px-3 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold transition-colors"
              >
                <span>Cerrar Sesión</span>
              </button>
            )}
          </div>
        </div>

        {/* Backup & Restore Section */}
        <div className="mt-6 pt-5 border-t border-stone-200 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
            Respaldo y Seguridad de Datos
          </h4>
          <p className="text-xs text-stone-500">
            Tus datos de productos, inventario, compras y ventas están guardados localmente. Puedes exportar una copia de seguridad o restaurarla en cualquier momento.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleDownloadBackup}
              className="py-2 px-3 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-stone-500" />
              <span>Descargar Copia JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-2 px-3 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Upload className="w-4 h-4 text-stone-500" />
              <span>Restaurar Copia</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
          </div>

          <div className="pt-2">
            {!isConfirmingReset ? (
              <button
                type="button"
                onClick={() => setIsConfirmingReset(true)}
                className="w-full py-2 px-3 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium flex items-center justify-center space-x-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer a datos de ejemplo</span>
              </button>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
                <p className="text-xs text-rose-800 font-medium text-center">
                  ¿Seguro que deseas restablecer los datos del negocio a los de ejemplo?
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingReset(false)}
                    className="px-3 py-1 bg-white border border-stone-200 text-stone-600 rounded-md text-xs font-semibold hover:bg-stone-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleResetData}
                    className="px-3 py-1 bg-rose-600 text-white rounded-md text-xs font-semibold hover:bg-rose-700"
                  >
                    Sí, restablecer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
