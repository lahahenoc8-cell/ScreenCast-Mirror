import React, { useState } from 'react';
import { 
  Camera, Download, Trash2, Copy, Check, ZoomIn, 
  ZoomOut, Maximize2, Sparkles, Smartphone, ArrowRight,
  ExternalLink, Layers, RefreshCw, X, ShieldCheck
} from 'lucide-react';
import { PhoneCapture } from '../types';
import { ScreenCastManager } from '../services/webrtc';
import { soundEngine } from '../utils/audioAlert';

interface PhoneCapturesGalleryProps {
  captures: PhoneCapture[];
  manager: ScreenCastManager | null;
  onDeleteCapture: (id: string) => void;
  onClearAllCaptures: () => void;
  onSelectCaptureForMirror?: (url: string) => void;
  isPhoneConnected: boolean;
}

export const PhoneCapturesGallery: React.FC<PhoneCapturesGalleryProps> = ({
  captures,
  manager,
  onDeleteCapture,
  onClearAllCaptures,
  onSelectCaptureForMirror,
  isPhoneConnected,
}) => {
  const [selectedCapture, setSelectedCapture] = useState<PhoneCapture | null>(null);
  const [filter, setFilter] = useState<'all' | 'camera_rear' | 'camera_front' | 'screen'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isTriggeringRemoteSnap, setIsTriggeringRemoteSnap] = useState<boolean>(false);

  const filteredCaptures = captures.filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'camera_rear') return c.source === 'camera_rear' || c.source === 'camera_snapshot';
    if (filter === 'camera_front') return c.source === 'camera_front';
    if (filter === 'screen') return c.source === 'screen';
    return true;
  });

  const handleDownload = (capture: PhoneCapture) => {
    soundEngine.playTapSound();
    const link = document.createElement('a');
    link.href = capture.url;
    link.download = capture.fileName || `capture-phone-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    soundEngine.playTapSound();
    captures.forEach((c, idx) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = c.url;
        link.download = c.fileName || `capture-phone-${idx + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, idx * 250);
    });
  };

  const handleCopyImage = async (capture: PhoneCapture) => {
    soundEngine.playTapSound();
    try {
      // Convert base64 dataUrl to blob
      const res = await fetch(capture.url);
      const blob = await res.blob();
      
      if (navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({ [blob.type || 'image/png']: blob })
        ]);
        setCopiedId(capture.id);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        // Fallback copy text
        await navigator.clipboard.writeText(capture.url);
        setCopiedId(capture.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      console.warn('Clipboard image copy fallback:', err);
    }
  };

  const handleTriggerRemoteCameraSnap = () => {
    if (!manager) return;
    setIsTriggeringRemoteSnap(true);
    soundEngine.playTapSound();
    manager.sendRemotePhoneEvent({
      action: 'camera_snap',
      timestamp: Date.now(),
    });

    setTimeout(() => {
      setIsTriggeringRemoteSnap(false);
    }, 1800);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-indigo-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Espace Captures Caméra Téléphone
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold">
                {captures.length} capture{captures.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
              Toutes les photos prises depuis la caméra du smartphone connecté sont transmises et archivées ici en haute définition.
            </p>
          </div>
        </div>

        {/* Remote Action & Batch Buttons */}
        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          <button
            id="btn-remote-trigger-photo"
            onClick={handleTriggerRemoteCameraSnap}
            disabled={!isPhoneConnected || isTriggeringRemoteSnap}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              isTriggeringRemoteSnap
                ? 'bg-indigo-700 text-white animate-pulse'
                : isPhoneConnected
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 shadow-indigo-500/20'
                : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
            }`}
            title="Envoyer un signal au téléphone pour prendre immédiatement une photo avec sa caméra"
          >
            <Camera className="w-4 h-4" />
            <span>
              {isTriggeringRemoteSnap ? 'Déclenchement...' : 'Prendre une photo à distance'}
            </span>
          </button>

          {captures.length > 0 && (
            <>
              <button
                id="btn-download-all-captures"
                onClick={handleDownloadAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700/80 transition-colors shadow"
                title="Télécharger toutes les captures"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Tout télécharger</span>
              </button>

              <button
                id="btn-clear-all-captures"
                onClick={() => {
                  if (confirm('Voulez-vous vraiment effacer toutes les captures reçues ?')) {
                    onClearAllCaptures();
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-900/30 text-xs font-semibold text-rose-300 border border-rose-500/30 transition-colors"
                title="Vider la galerie de captures"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-1 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Toutes ({captures.length})
          </button>
          <button
            onClick={() => setFilter('camera_rear')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'camera_rear'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📷 Caméra Arrière ({captures.filter(c => c.source === 'camera_rear' || c.source === 'camera_snapshot').length})
          </button>
          <button
            onClick={() => setFilter('camera_front')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'camera_front'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🤳 Caméra Avant ({captures.filter(c => c.source === 'camera_front').length})
          </button>
          <button
            onClick={() => setFilter('screen')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'screen'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📱 Captures Écran ({captures.filter(c => c.source === 'screen').length})
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Synchronisation instantanée WebRTC</span>
        </div>
      </div>

      {/* Captures Grid or Empty State */}
      {filteredCaptures.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-4 my-auto">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
            <Camera className="w-8 h-8 stroke-1" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-base font-bold text-white">Aucune capture caméra enregistrée</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pour prendre une photo depuis la caméra de votre smartphone :
            </p>
            <ul className="text-xs text-slate-300 text-left space-y-1.5 pt-2 list-disc list-inside bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
              <li>Sur le smartphone, appuyez sur <strong className="text-indigo-300">« 📸 Prendre une Photo »</strong></li>
              <li>Ou activez la caméra mobile et touchez <strong className="text-indigo-300">« Capturer Photo HD »</strong></li>
              <li>Ou cliquez sur <strong className="text-indigo-300">« Prendre une photo à distance »</strong> ci-dessus</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCaptures.map((capture) => {
            const isFront = capture.source === 'camera_front';
            const isScreen = capture.source === 'screen';
            return (
              <div
                key={capture.id}
                className="group flex flex-col rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 overflow-hidden shadow-lg hover:shadow-indigo-500/10 transition-all duration-200"
              >
                {/* Image Preview Container */}
                <div 
                  className="relative aspect-video sm:aspect-[4/3] bg-black/90 flex items-center justify-center overflow-hidden cursor-pointer"
                  onClick={() => {
                    soundEngine.playTapSound();
                    setSelectedCapture(capture);
                    setZoomLevel(1);
                  }}
                >
                  <img
                    src={capture.url}
                    alt={capture.fileName}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Top Overlay Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shadow-md backdrop-blur-md border ${
                      isFront
                        ? 'bg-purple-900/80 text-purple-200 border-purple-500/40'
                        : isScreen
                        ? 'bg-sky-900/80 text-sky-200 border-sky-500/40'
                        : 'bg-emerald-900/80 text-emerald-200 border-emerald-500/40'
                    }`}>
                      {capture.sourceLabel || (isFront ? 'Selfie Avant' : isScreen ? 'Écran' : 'Caméra Arrière HD')}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2 z-10">
                    <span className="px-2 py-0.5 rounded-md bg-black/70 text-slate-300 text-[10px] font-mono backdrop-blur-md border border-white/10">
                      {formatTimestamp(capture.timestamp)}
                    </span>
                  </div>

                  {/* Hover Quick Zoom Trigger */}
                  <div className="absolute inset-0 bg-indigo-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="px-3 py-1.5 rounded-xl bg-indigo-600/90 text-white text-xs font-semibold shadow-lg flex items-center gap-1.5 backdrop-blur-md">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Agrandir</span>
                    </span>
                  </div>
                </div>

                {/* Card Meta & Action Bar */}
                <div className="p-3 bg-slate-900/95 flex flex-col justify-between flex-1 gap-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-200 truncate" title={capture.fileName}>
                        {capture.fileName}
                      </h4>
                      {capture.size && (
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {capture.size}
                        </span>
                      )}
                    </div>
                    {capture.caption && (
                      <p className="text-[11px] text-slate-400 italic line-clamp-1">
                        « {capture.caption} »
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownload(capture)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Télécharger l'image sur l'ordinateur"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleCopyImage(capture)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Copier l'image dans le presse-papier"
                      >
                        {copiedId === capture.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {onSelectCaptureForMirror && (
                        <button
                          onClick={() => {
                            onSelectCaptureForMirror(capture.url);
                            soundEngine.playTapSound();
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-colors"
                          title="Afficher comme écran miroir principal"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => onDeleteCapture(capture.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Supprimer cette capture"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedCapture && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex flex-col p-4 sm:p-6"
          onClick={() => setSelectedCapture(null)}
        >
          {/* Modal Header */}
          <div 
            className="flex items-center justify-between pb-3 border-b border-slate-800 text-white shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400">
                <Camera className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">{selectedCapture.fileName}</h3>
                <p className="text-xs text-slate-400">
                  {selectedCapture.sourceLabel} • Capturée le {formatTimestamp(selectedCapture.timestamp)}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-1">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 text-slate-400 hover:text-white"
                  title="Dézoomer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono px-2 text-slate-300">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-1.5 text-slate-400 hover:text-white"
                  title="Zoomer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => handleDownload(selectedCapture)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger</span>
              </button>

              <button
                onClick={() => setSelectedCapture(null)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Image Viewport */}
          <div 
            className="flex-1 flex items-center justify-center overflow-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedCapture.url}
              alt={selectedCapture.fileName}
              style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease-out' }}
              className="max-h-[82vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800/80"
            />
          </div>
        </div>
      )}
    </div>
  );
};
