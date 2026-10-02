import React, { useState } from 'react';
import { Download, MonitorCheck, ExternalLink, X, Smartphone, Laptop, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // If already installed and running inside standalone app window
  if (isInstalled) {
    return (
      <div
        className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200"
        title="Aplicación instalada y ejecutándose en modo escritorio"
      >
        <MonitorCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>App Instalada</span>
      </div>
    );
  }

  const appUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenDirect = () => {
    window.open(appUrl, '_blank');
  };

  const handleButtonClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleButtonClick}
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#C86D85] hover:bg-[#A7455F] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        title="Instalar Moon Store en este computador o dispositivo"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-[#FFF5F7] text-[#C86D85] flex items-center justify-center">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    Cómo instalar Moon Store en tu PC
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    No requiere descargar archivos .EXE pesados ni virus
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-stone-700 leading-relaxed">
              <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 space-y-2">
                <p className="font-semibold text-rose-900">
                  ¿Por qué no hay un archivo de instalación (.exe)?
                </p>
                <p className="text-rose-800">
                  Moon Store es una <strong>Aplicación Web Progresiva (PWA)</strong> oficial. Se instala directamente a través de tu navegador (Google Chrome, Microsoft Edge, Brave, etc.) creando un programa ejecutable en tu escritorio con acceso directo e icono propio, sin descargar archivos riesgosos.
                </p>
              </div>

              {/* Paso a paso */}
              <div className="space-y-2.5">
                <div className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
                  <span className="w-5 h-5 rounded-full bg-[#C86D85] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-stone-900">Abrir en pestaña completa</p>
                    <p className="text-stone-500 mt-0.5">
                      Si estás dentro del editor de AI Studio, haz clic abajo en «Abrir en pestaña nueva» para que tu navegador muestre el botón oficial de instalación:
                    </p>
                    <button
                      onClick={handleOpenDirect}
                      className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#8C344D] text-white rounded-lg font-semibold text-xs hover:bg-[#6e273a] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir aplicación en pestaña nueva</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
                  <span className="w-5 h-5 rounded-full bg-[#C86D85] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-stone-900">Hacer clic en el icono de Instalar</p>
                    <p className="text-stone-500 mt-0.5">
                      En la barra de direcciones de Chrome o Edge (donde dice https://...), al lado de la estrella de favoritos, verás un ícono de un <strong>monitor con flecha hacia abajo</strong> o una pequeña cruz <strong>(+)</strong> que dice <strong>«Instalar Moon Store»</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
                  <span className="w-5 h-5 rounded-full bg-[#C86D85] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-stone-900">¡Listo! Acceso directo en el Escritorio</p>
                    <p className="text-stone-500 mt-0.5">
                      Al presionar «Instalar», Moon Store se abrirá en su propia ventana sin barras ni pestañas, y te creará el acceso directo en el Escritorio y menú de programas.
                    </p>
                  </div>
                </div>
              </div>

              {/* Enlace para compartir o abrir en cualquier otro PC */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-stone-500 truncate">
                  Enlace para abrir en cualquier computador:
                </span>
                <button
                  onClick={handleCopyLink}
                  className="px-2.5 py-1 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center space-x-1 shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">¡Copiado!</span>
                    </>
                  ) : (
                    <span>Copiar enlace</span>
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-5 w-full rounded-xl bg-stone-100 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-200 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
};

