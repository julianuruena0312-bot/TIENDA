import React, { useState, useRef } from 'react';
import { Camera, Upload, Link, X, Image as ImageIcon, Check, RefreshCw } from 'lucide-react';

interface ImageUploaderProps {
  value?: string;
  onChange: (imageUrl: string | undefined) => void;
  className?: string;
}

// Helper to compress and resize image to fit comfortably in localStorage
const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Error al decodificar la imagen'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDimension = 640;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Draw image onto canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to webp if supported, or jpeg with high compression efficiency
        try {
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(compressedDataUrl);
        } catch {
          resolve(canvas.toDataURL('image/png'));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP, etc.).');
      return;
    }
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const compressedDataUrl = await compressImageFile(file);
      onChange(compressedDataUrl);
    } catch (err) {
      console.error(err);
      setErrorMessage('Hubo un problema al procesar la imagen.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
    // reset input value so the same file can be chosen again if desired
    e.target.value = '';
  };

  const handleApplyUrl = () => {
    if (!urlDraft.trim()) return;
    onChange(urlDraft.trim());
    setUrlDraft('');
    setShowUrlInput(false);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-stone-700">
          Foto del Producto <span className="text-stone-400 font-normal">(Opcional)</span>
        </label>

        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center space-x-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Quitar foto</span>
          </button>
        )}
      </div>

      {/* Hidden Inputs for File Selection and Camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Image Preview or Dropzone */}
      {value ? (
        <div className="relative group rounded-xl border border-stone-200 overflow-hidden bg-stone-50 flex items-center justify-center h-44">
          <img
            src={value}
            alt="Vista previa del producto"
            className="w-full h-full object-contain p-1"
            referrerPolicy="no-referrer"
          />

          {/* Overlay Actions on Hover / Active */}
          <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white/90 hover:bg-white text-stone-800 rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1 transition-transform active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Cambiar</span>
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1 transition-transform active:scale-95"
              title="Tomar foto con la cámara"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Cámara</span>
            </button>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1 transition-transform active:scale-95"
            >
              <X className="w-3.5 h-3.5" />
              <span>Quitar</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/50'
              : 'border-stone-200 hover:border-emerald-400 bg-stone-50/50 hover:bg-emerald-50/20'
          }`}
        >
          {isProcessing ? (
            <div className="py-4 flex flex-col items-center space-y-2">
              <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
              <span className="text-xs text-stone-500 font-medium">Optimizando imagen...</span>
            </div>
          ) : (
            <div className="py-2 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 shadow-2xs">
                <ImageIcon className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-stone-700">
                Haz clic para subir o arrastra la foto aquí
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Formatos JPG, PNG o WEBP (se optimiza automáticamente)
              </p>

              {/* Action Buttons inside Dropzone */}
              <div
                className="mt-3 flex items-center justify-center gap-2 flex-wrap"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-xs font-medium flex items-center space-x-1 shadow-2xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-stone-500" />
                  <span>Subir Archivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-xs font-medium flex items-center space-x-1 shadow-2xs transition-colors"
                  title="Tomar foto con la cámara de tu móvil o laptop"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tomar Foto</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-xs font-medium flex items-center space-x-1 shadow-2xs transition-colors"
                >
                  <Link className="w-3.5 h-3.5 text-sky-600" />
                  <span>Enlace Web</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* URL Input Form */}
      {showUrlInput && (
        <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
          <label className="block text-[11px] font-semibold text-stone-600">
            Pegar enlace directo de imagen (URL):
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="https://ejemplo.com/foto-producto.jpg"
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleApplyUrl}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-xs shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Usar</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <p className="text-xs text-rose-600 font-medium">{errorMessage}</p>
      )}
    </div>
  );
};
