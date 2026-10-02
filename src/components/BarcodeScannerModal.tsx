import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  X,
  Upload,
  Keyboard,
  RefreshCw,
  Zap,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Package,
  Plus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { formatUnit } from '../utils/unitFormatter';
import { useBusiness } from '../context/BusinessContext';
import { Product } from '../types';
import { playScanSuccessSound, playScanNotFoundSound } from '../utils/scannerAudio';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  subtitle?: string;
  allowContinuous?: boolean;
  allowNewRegistration?: boolean;
  onRegisterNew?: (barcode: string) => void;
  onRegisterNewProduct?: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Escanear Código de Barras',
  subtitle = 'Apunta con la cámara hacia el código de barras o código QR del producto.',
  allowContinuous = true,
  allowNewRegistration = true,
  onRegisterNew,
  onRegisterNewProduct,
}) => {
  const effectiveRegisterNew = onRegisterNewProduct || onRegisterNew;
  const { products, formatCurrency } = useBusiness();

  // Mode: 'camera' | 'upload' | 'manual'
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  
  // Scanner state
  const [isCameraRunning, setIsCameraRunning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  // Scanning preferences
  const [continuousMode, setContinuousMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Manual input state
  const [manualCode, setManualCode] = useState('');
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Feedback state for last scanned item
  const [lastScanned, setLastScanned] = useState<{
    code: string;
    product: Product | undefined;
    time: Date;
  } | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera function
  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.debug('Error stopping html5QrCode', err);
      }
    }
    setIsCameraRunning(false);
    setIsTorchOn(false);
  }, []);

  // Process a scanned code
  const handleCodeDetected = useCallback(
    (rawCode: string) => {
      const cleanCode = rawCode.trim();
      if (!cleanCode) return;

      const now = Date.now();
      // Debounce if same code detected within 1.5 seconds
      if (lastScannedCodeRef.current === cleanCode && now - lastScannedTimeRef.current < 1500) {
        return;
      }

      lastScannedCodeRef.current = cleanCode;
      lastScannedTimeRef.current = now;

      // Find matching product
      const matched = products.find(
        (p) => p.code.toLowerCase() === cleanCode.toLowerCase()
      );

      setLastScanned({
        code: cleanCode,
        product: matched,
        time: new Date(),
      });

      if (soundEnabled) {
        if (matched) {
          playScanSuccessSound();
        } else {
          playScanNotFoundSound();
        }
      }

      // Trigger callback
      onScan(cleanCode);

      // If continuous mode is disabled, close modal after short delay
      if (!continuousMode && allowContinuous === false) {
        setTimeout(() => {
          onClose();
        }, 500);
      }
    },
    [products, soundEnabled, onScan, continuousMode, allowContinuous, onClose]
  );

  // Start camera scanning
  const startCamera = useCallback(async (deviceIdOrConstraint?: any) => {
    setCameraError(null);
    try {
      // Ensure any existing scanner is cleared
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } else {
        html5QrCodeRef.current = new Html5Qrcode('reader-viewport');
      }

      // Check camera devices
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length) {
        setAvailableCameras(devices);
        if (!selectedCameraId) {
          // Prefer rear/environment camera if available
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('trasera') ||
              d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      }

      const cameraConfig = deviceIdOrConstraint || selectedCameraId || { facingMode: 'environment' };

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const width = Math.min(viewfinderWidth * 0.85, 340);
          const height = Math.min(viewfinderHeight * 0.6, 200);
          return { width, height };
        },
        aspectRatio: 1.3333,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
        ],
      };

      await html5QrCodeRef.current.start(
        cameraConfig,
        config,
        (decodedText) => {
          handleCodeDetected(decodedText);
        },
        () => {
          // Frame without barcode, normal silent loop
        }
      );

      setIsCameraRunning(true);

      // Check if torch/flashlight is supported
      try {
        const capabilities = html5QrCodeRef.current.getRunningTrackCapabilities?.();
        if (capabilities && (capabilities as any).torch) {
          setHasTorch(true);
        }
      } catch (e) {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setIsCameraRunning(false);
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Concede acceso a la cámara en el navegador o utiliza la opción de subir imagen o entrada manual.'
          : err?.name === 'NotFoundError'
          ? 'No se detectó ninguna cámara disponible en este dispositivo.'
          : 'No se pudo iniciar la cámara en este entorno. Puedes ingresar el código manualmente o subir una imagen.';
      setCameraError(msg);
    }
  }, [selectedCameraId, handleCodeDetected]);

  // Toggle Torch/Flash
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !isCameraRunning) return;
    try {
      const newState = !isTorchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: newState } as any],
      });
      setIsTorchOn(newState);
    } catch (e) {
      console.warn('Torch toggle failed', e);
    }
  };

  // Lifecycle: handle modal open/close and tab switch
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      // Short delay to ensure container element '#reader-viewport' is rendered in DOM
      const timer = setTimeout(() => {
        startCamera();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab, startCamera, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop();
          }
          html5QrCodeRef.current.clear();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Handle Manual Code submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCodeDetected(manualCode.trim());
    setManualCode('');
  };

  // Handle Image File Upload scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraError(null);
    try {
      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('reader-viewport');
        html5QrCodeRef.current = scanner;
      }
      if (scanner.isScanning) {
        await scanner.stop();
      }

      const decodedText = await scanner.scanFile(file, true);
      handleCodeDetected(decodedText);
    } catch (err: any) {
      setCameraError(
        'No se pudo leer ningún código de barras en la imagen subida. Asegúrate de que la foto esté bien iluminada y enfocada.'
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-stone-100 shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Camera className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-lg text-stone-900 tracking-tight">{title}</h3>
            </div>
            <p className="text-xs text-stone-500 mt-1 max-w-md">{subtitle}</p>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center justify-between pt-3 shrink-0">
          <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-semibold text-stone-600">
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'camera'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'hover:text-stone-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Cámara en Vivo</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'upload'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'hover:text-stone-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Subir Foto</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('manual');
                setTimeout(() => manualInputRef.current?.focus(), 100);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'manual'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'hover:text-stone-900'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Entrada / Lector USB</span>
            </button>
          </div>

          {/* Preferences controls: Sound and Flash */}
          <div className="flex items-center space-x-1.5">
            {hasTorch && activeTab === 'camera' && (
              <button
                type="button"
                onClick={toggleTorch}
                title={isTorchOn ? 'Apagar linterna' : 'Encender linterna'}
                className={`p-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  isTorchOn
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Zap className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Sonido activado' : 'Sonido desactivado'}
              className={`p-1.5 rounded-lg text-xs border transition-colors ${
                soundEnabled
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-stone-50 border-stone-200 text-stone-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {/* CAMERA TAB */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              {/* Viewport container with animated scan laser effect */}
              <div className="relative bg-stone-950 rounded-xl overflow-hidden min-h-[260px] flex items-center justify-center border border-stone-800 shadow-inner">
                {/* HTML5 QR Code Mount */}
                <div id="reader-viewport" className="w-full h-full min-h-[260px] object-cover" />

                {/* Laser animation overlay while camera is scanning */}
                {isCameraRunning && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    {/* Corner Target Markers */}
                    <div className="w-64 h-36 border-2 border-emerald-400/60 rounded-xl relative">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />

                      {/* Moving Red/Green scanning laser line */}
                      <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_8px_#10b981] absolute top-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <span className="mt-2 text-[11px] font-medium text-emerald-300 bg-stone-900/80 px-2 py-0.5 rounded backdrop-blur-xs">
                      Enfocando código de barras...
                    </span>
                  </div>
                )}

                {/* Placeholder if camera hasn't started yet */}
                {!isCameraRunning && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 p-4 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
                    <p className="text-xs font-semibold text-stone-200">Iniciando sensor de cámara...</p>
                    <p className="text-[11px] text-stone-500 mt-1">Concede permiso si el navegador lo solicita</p>
                  </div>
                )}

                {/* Camera Error banner */}
                {cameraError && (
                  <div className="absolute inset-0 bg-stone-900/95 flex flex-col items-center justify-center text-stone-300 p-5 text-center">
                    <CameraOff className="w-10 h-10 text-rose-400 mb-2" />
                    <p className="text-xs font-bold text-rose-300 mb-1">Cámara no accesible</p>
                    <p className="text-[11px] text-stone-400 max-w-sm mb-3">{cameraError}</p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startCamera()}
                        className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Reintentar</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('manual')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                      >
                        Usar Teclado / USB
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera selection & continuous toggle bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-600 pt-1">
                {availableCameras.length > 1 ? (
                  <div className="flex items-center space-x-1.5 w-full sm:w-auto">
                    <span className="text-stone-400">Cámara:</span>
                    <select
                      value={selectedCameraId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setSelectedCameraId(newId);
                        startCamera(newId);
                      }}
                      className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-700"
                    >
                      {availableCameras.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label || `Cámara ${c.id.slice(0, 5)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="text-[11px] text-stone-400">
                    Formatos soportados: EAN-13, UPC, Code 128, QR y más.
                  </span>
                )}

                {allowContinuous && (
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={continuousMode}
                      onChange={(e) => setContinuousMode(e.target.checked)}
                      className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-medium text-stone-700">
                      Modo continuo (múltiples artículos)
                    </span>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* UPLOAD PHOTO TAB */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-300 hover:border-emerald-500 bg-stone-50/70 hover:bg-emerald-50/20 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all text-center group"
              >
                <div className="w-12 h-12 rounded-xl bg-stone-100 group-hover:bg-emerald-100 text-stone-600 group-hover:text-emerald-700 flex items-center justify-center mb-2 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-stone-800">
                  Haz clic o arrastra una imagen de código de barras
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  Formatos aceptados: JPG, PNG, WEBP tomados con tu teléfono o guardados.
                </p>
                <button
                  type="button"
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Seleccionar Archivo
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {cameraError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>
          )}

          {/* MANUAL / USB SCANNER TAB */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Código de Barras o SKU (compatible con pistola lectora USB/Bluetooth)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      ref={manualInputRef}
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Ej. 7501031311309 o PRD-101"
                      className="flex-1 px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!manualCode.trim()}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center space-x-1"
                    >
                      <span>Aceptar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1.5">
                    💡 Si utilizas un lector de código de barras físico conectado a tu computadora o celular, simplemente apunta al producto y dispara; el código se enviará automáticamente.
                  </p>
                </div>
              </form>
            </div>
          )}

          {/* RECENT SCAN FEEDBACK BANNER */}
          {lastScanned && (
            <div
              className={`p-3.5 rounded-xl border transition-all animate-in slide-in-from-top-1 ${
                lastScanned.product
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50/90 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2.5">
                  {lastScanned.product ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/70 border border-stone-200">
                        {lastScanned.code}
                      </span>
                      <span className="text-[10px] text-stone-500">
                        {lastScanned.time.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>

                    {lastScanned.product ? (
                      <div className="mt-1">
                        <p className="text-sm font-bold text-stone-900">
                          {lastScanned.product.name}
                        </p>
                        <p className="text-xs text-stone-600">
                          Precio:{' '}
                          <strong className="text-emerald-700">
                            {formatCurrency(lastScanned.product.salePrice)}
                          </strong>{' '}
                          • Stock disponible:{' '}
                          <strong
                            className={
                              lastScanned.product.stock > 0
                                ? 'text-stone-800'
                                : 'text-rose-600'
                            }
                          >
                            {lastScanned.product.stock}{' '}
                            {formatUnit(lastScanned.product.unit, lastScanned.product.stock)}
                          </strong>
                        </p>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <p className="text-xs font-semibold text-amber-900">
                          Código no registrado en el inventario.
                        </p>
                        {allowNewRegistration && effectiveRegisterNew && (
                          <button
                            type="button"
                            onClick={() => {
                              stopCamera();
                              onClose();
                              effectiveRegisterNew(lastScanned.code);
                            }}
                            className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Registrar como nuevo producto</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* QUICK-TEST BARCODES (Instant 1-click test simulation for preview environment) */}
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Códigos rápidos de prueba (Inventario)</span>
              </span>
              <span className="text-[10px] text-stone-400">Clic para simular escaneo</span>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {products.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleCodeDetected(p.code)}
                  className="text-left text-xs bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-stone-200 rounded-lg px-2.5 py-1 transition-all shadow-2xs group flex items-center space-x-1.5"
                >
                  <span className="font-mono font-bold text-[10px] text-emerald-800 bg-emerald-50 group-hover:bg-emerald-100 px-1.5 py-0.5 rounded">
                    {p.code}
                  </span>
                  <span className="text-stone-700 text-[11px] max-w-[130px] truncate">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold transition-colors"
          >
            Cerrar Escáner
          </button>

          {lastScanned && !continuousMode && (
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Listo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
