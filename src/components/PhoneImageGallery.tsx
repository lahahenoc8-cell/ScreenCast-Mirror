import React, { useState } from 'react';
import { 
  Image as ImageIcon, Download, Share2, Eye, 
  Sparkles, CheckCircle2, ArrowRight, Laptop, Maximize2, Trash2
} from 'lucide-react';
import { ClipboardItem } from '../types';
import { soundEngine } from '../utils/audioAlert';

interface PhoneImageGalleryProps {
  items: ClipboardItem[];
  onBroadcastImage?: (imageDataUrl: string) => void;
}

export const PhoneImageGallery: React.FC<PhoneImageGalleryProps> = ({
  items,
  onBroadcastImage,
}) => {
  const [activeImage, setActiveImage] = useState<ClipboardItem | null>(null);

  // Filter image transfers
  const images = items.filter(
    (item) => item.type === 'file' && (item.fileType?.startsWith('image/') || item.fileName?.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i))
  );

  return (
    <div id="phone-image-gallery-container" className="space-y-4">
      {/* Header card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 space-y-1.5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Images Reçues de l'Ordinateur</h3>
              <p className="text-[10px] text-slate-300">Synchronisées directement en P2P</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
            {images.length} photo{images.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Gallery Grid or Empty State */}
      {images.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <ImageIcon className="w-6 h-6 stroke-1 text-slate-500" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-300">En attente d'images depuis le PC</p>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
              Sur l'ordinateur, ouvrez l'onglet <strong className="text-indigo-300">« Partage Images »</strong> pour glisser ou coller une photo : elle s'affichera instantanément ici en haute résolution.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5 shadow-md hover:border-slate-700 transition-all"
            >
              {/* Image Preview Container */}
              <div 
                className="rounded-xl overflow-hidden bg-black/90 border border-slate-800 h-44 flex items-center justify-center relative cursor-pointer group"
                onClick={() => {
                  soundEngine.playTapSound();
                  setActiveImage(img);
                }}
              >
                {img.fileData ? (
                  <img
                    src={img.fileData}
                    alt={img.fileName || 'Photo reçue'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-600" />
                )}

                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-900/90 text-white text-[11px] font-bold flex items-center gap-1">
                    <Maximize2 className="w-3 h-3" /> Plein écran
                  </span>
                </div>

                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-sm text-[9px] font-mono text-slate-300">
                  {img.fileSize || 'Image'}
                </span>
              </div>

              {/* Caption and Info */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white truncate max-w-[170px]">
                    {img.fileName || 'Image sans titre'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(img.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {img.caption && (
                  <p className="text-[11px] text-indigo-300 italic truncate">
                    "{img.caption}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                {img.fileData && (
                  <a
                    href={img.fileData}
                    download={img.fileName || 'image_recue.png'}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Enregistrer</span>
                  </a>
                )}

                {onBroadcastImage && img.fileData && (
                  <button
                    onClick={() => {
                      soundEngine.playTapSound();
                      onBroadcastImage(img.fileData!);
                    }}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] flex items-center gap-1 border border-slate-700 transition-colors"
                    title="Diffuser cette image sur l'ordinateur"
                  >
                    <Laptop className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Diffuser</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Modal Image Viewer */}
      {activeImage && activeImage.fileData && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col p-4 animate-in fade-in"
          onClick={() => setActiveImage(null)}
        >
          {/* Top bar */}
          <div 
            className="flex items-center justify-between py-2 px-1 text-white text-xs border-b border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="truncate font-semibold text-slate-200">
              {activeImage.fileName}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={activeImage.fileData}
                download={activeImage.fileName || 'image.png'}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1 text-[11px]"
              >
                <Download className="w-3.5 h-3.5" /> Enregistrer
              </a>
              <button
                onClick={() => setActiveImage(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Main Display */}
          <div 
            className="flex-1 flex flex-col items-center justify-center p-2 overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeImage.fileData}
              alt={activeImage.fileName || 'Plein écran'}
              className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl"
            />
            {activeImage.caption && (
              <div className="mt-3 px-4 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-indigo-200 text-center max-w-md">
                "{activeImage.caption}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
