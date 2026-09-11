import React, { useState, useRef, useEffect } from 'react';
import { 
  Image as ImageIcon, Upload, Send, Sparkles, CheckCircle2, 
  Trash2, Copy, FileImage, Eye, RefreshCw, Smartphone, 
  ArrowRight, Download, Layers, ShieldCheck, Zap
} from 'lucide-react';
import { ScreenCastManager } from '../services/webrtc';
import { ClipboardItem } from '../types';
import { soundEngine } from '../utils/audioAlert';

interface PcImageShareTabProps {
  manager: ScreenCastManager | null;
  roomId: string;
  isPhoneConnected: boolean;
  clipboardItems: ClipboardItem[];
  onImageSent?: (fileName: string) => void;
}

// Curated high quality sample images for 1-click test transfers
const SAMPLE_IMAGES = [
  {
    id: 'sample-1',
    name: 'Wallpaper_Neon_Cyberpunk.jpg',
    category: 'Fond d\'écran',
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80',
    caption: 'Superbe fond d\'écran néon haute résolution pour smartphone',
  },
  {
    id: 'sample-2',
    name: 'Nature_Landscape_Alps.jpg',
    category: 'Paysage',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=80',
    caption: 'Vue panoramique des montagnes alpines au lever du soleil',
  },
  {
    id: 'sample-3',
    name: 'Infographie_Architecture_Web.png',
    category: 'Schéma & Document',
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80',
    caption: 'Graphique d\'analyse et métriques de performance',
  },
  {
    id: 'sample-4',
    name: 'Design_Mobile_Mockup.png',
    category: 'Design & UI',
    url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&auto=format&fit=crop&q=80',
    caption: 'Maquette d\'interface utilisateur sombre pour application mobile',
  },
];

export const PcImageShareTab: React.FC<PcImageShareTabProps> = ({
  manager,
  roomId,
  isPhoneConnected,
  clipboardItems,
  onImageSent,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccessToast, setSendSuccessToast] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; name: string; caption?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter image transfers from clipboardItems
  const sentAndReceivedImages = clipboardItems.filter(
    (item) => item.type === 'file' && (item.fileType?.startsWith('image/') || item.fileName?.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i))
  );

  // Global Paste Handler for Ctrl+V images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            soundEngine.playTapSound();
            showToast('📋 Image collée depuis le presse-papier de l\'ordinateur !');
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const showToast = (message: string) => {
    setSendSuccessToast(message);
    setTimeout(() => setSendSuccessToast(null), 3500);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (JPG, PNG, WEBP, GIF, SVG).');
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    soundEngine.playTapSound();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSendSelectedImage = async () => {
    if (!selectedFile || !manager) return;

    setIsSending(true);
    try {
      manager.sendFile(selectedFile, caption.trim() || undefined);
      soundEngine.playConnectChime();
      showToast(`📸 "${selectedFile.name}" transmis avec succès à votre smartphone !`);
      onImageSent?.(selectedFile.name);

      // Reset selection after brief delay
      setTimeout(() => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setCaption('');
        setIsSending(false);
      }, 500);
    } catch (e) {
      console.error('Erreur lors de l\'envoi de l\'image:', e);
      setIsSending(false);
    }
  };

  const handleSendSampleImage = async (sample: typeof SAMPLE_IMAGES[0]) => {
    if (!manager) return;
    setIsSending(true);
    try {
      // Fetch the sample image and convert to blob/file
      const response = await fetch(sample.url);
      const blob = await response.blob();
      const file = new File([blob], sample.name, { type: blob.type || 'image/jpeg' });

      manager.sendFile(file, sample.caption);
      soundEngine.playConnectChime();
      showToast(`✨ Image test "${sample.name}" transmise au smartphone !`);
      onImageSent?.(sample.name);
    } catch (err) {
      console.error('Erreur lors du transfert de l\'image exemple:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div id="pc-image-share-container" className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 rounded-3xl border border-indigo-500/20 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-md">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Partage d'Images : Ordinateur ➔ Smartphone
              </h2>
              <p className="text-xs text-slate-300">
                Envoyez des photos, captures d'écran et graphiques en HD instantanément vers votre téléphone.
              </p>
            </div>
          </div>
        </div>

        {/* Connection status badge */}
        <div className="flex items-center gap-2 bg-slate-900/90 px-3.5 py-2 rounded-2xl border border-slate-800 shrink-0">
          <span className={`w-2.5 h-2.5 rounded-full ${isPhoneConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-xs font-semibold text-slate-200">
            {isPhoneConnected ? 'Smartphone récepteur prêt' : 'En attente du smartphone'}
          </span>
          <span className="font-mono text-[11px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
            {roomId}
          </span>
        </div>
      </div>

      {/* Success Toast */}
      {sendSuccessToast && (
        <div className="fixed top-20 right-6 z-50 px-4 py-3 rounded-2xl bg-emerald-600/95 border border-emerald-400/50 text-white font-bold text-xs shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{sendSuccessToast}</span>
        </div>
      )}

      {/* Main Upload / Drag-and-Drop Area & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload Dropzone & Staging Area */}
        <div className="lg:col-span-7 space-y-4">
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 relative overflow-hidden group ${
              isDragging 
                ? 'border-indigo-400 bg-indigo-950/40 scale-[0.99]' 
                : previewUrl 
                  ? 'border-indigo-500/40 bg-slate-900/90' 
                  : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 hover:border-slate-700'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*"
              className="hidden" 
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />

            {previewUrl ? (
              <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="relative rounded-2xl overflow-hidden bg-black/80 border border-slate-700 max-h-80 flex items-center justify-center group/img">
                  <img 
                    src={previewUrl} 
                    alt="Aperçu avant envoi" 
                    className="max-h-80 object-contain rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={() => setEnlargedImage({ url: previewUrl, name: selectedFile?.name || 'Aperçu' })}
                      className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
                    >
                      <Eye className="w-4 h-4" /> Agrandir
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
                    >
                      <RefreshCw className="w-4 h-4" /> Changer
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300 px-1">
                  <div className="truncate font-semibold text-indigo-300">
                    {selectedFile?.name}
                  </div>
                  <div className="text-slate-400 font-mono text-[11px] shrink-0 ml-2">
                    {selectedFile && selectedFile.size > 1024 * 1024 
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} Mo` 
                      : `${Math.round((selectedFile?.size || 0) / 1024)} Ko`}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 py-6 pointer-events-none">
                <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-inner group-hover:scale-105 transition-transform">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">
                    Glissez-déposez une image ou cliquez pour parcourir
                  </p>
                  <p className="text-xs text-slate-400">
                    PNG, JPG, WEBP, GIF, SVG supportés en haute fidélité
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                  <span className="font-semibold text-indigo-400">Astuce :</span>
                  <span>Appuyez sur <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white text-[10px]">Ctrl+V</kbd> pour coller une capture directement</span>
                </div>
              </div>
            )}
          </div>

          {/* Caption & Send Action Panel */}
          {selectedFile && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <span>Message ou légende accompagnant l'image (optionnel) :</span>
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Ex: Voici la photo pour la présentation..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  id="btn-send-image-to-phone"
                  onClick={handleSendSelectedImage}
                  disabled={isSending}
                  className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSending ? 'Transmission en cours...' : '🚀 Envoyer instantanément au Smartphone'}</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setCaption('');
                  }}
                  className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  title="Annuler l'image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Preset Sample Gallery */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Images exemples prêtes à l'envoi (Test en 1 Clic)
              </h3>
              <span className="text-[10px] text-slate-400">Cliquez pour envoyer</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SAMPLE_IMAGES.map((sample) => (
                <div
                  key={sample.id}
                  className="group relative rounded-2xl overflow-hidden border border-slate-800 hover:border-indigo-500/60 bg-slate-950 flex flex-col transition-all cursor-pointer shadow hover:shadow-indigo-500/20"
                  onClick={() => handleSendSampleImage(sample)}
                >
                  <div className="h-24 w-full overflow-hidden bg-slate-900 relative">
                    <img 
                      src={sample.url} 
                      alt={sample.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                    <span className="absolute bottom-1.5 left-2 text-[9px] font-bold text-white px-1.5 py-0.5 rounded bg-indigo-600/80">
                      {sample.category}
                    </span>
                  </div>

                  <div className="p-2 space-y-1">
                    <p className="text-[11px] font-medium text-slate-200 truncate group-hover:text-indigo-300">
                      {sample.name}
                    </p>
                    <button className="w-full py-1 rounded-lg bg-slate-900 group-hover:bg-indigo-600 text-slate-300 group-hover:text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-colors">
                      <Send className="w-3 h-3" /> Envoyer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: History of Shared Images & Live Sync */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg flex flex-col h-full min-h-[420px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Galerie d'Images Synchronisées</h3>
                  <p className="text-[10px] text-slate-400">{sentAndReceivedImages.length} image(s) échangée(s)</p>
                </div>
              </div>
            </div>

            {/* List or Empty State */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[500px]">
              {sentAndReceivedImages.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
                  <FileImage className="w-12 h-12 stroke-1 text-slate-600" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-300">Aucune image partagée pour le moment</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs">
                      Sélectionnez ou collez une photo ci-contre : elle apparaîtra ici et s'affichera immédiatement sur votre smartphone connecté.
                    </p>
                  </div>
                </div>
              ) : (
                sentAndReceivedImages.map((item) => (
                  <div 
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all flex items-start gap-3 group"
                  >
                    {/* Thumbnail */}
                    <div 
                      className="w-16 h-16 rounded-xl bg-black border border-slate-800 overflow-hidden shrink-0 cursor-pointer relative group/thumb"
                      onClick={() => item.fileData && setEnlargedImage({ url: item.fileData, name: item.fileName || 'Image', caption: item.caption })}
                    >
                      {item.fileData ? (
                        <img 
                          src={item.fileData} 
                          alt={item.fileName || 'Miniature'} 
                          className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white truncate max-w-[150px]">
                          {item.fileName || 'Image sans titre'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {item.caption && (
                        <p className="text-[11px] text-indigo-300 italic truncate">
                          "{item.caption}"
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Transmis
                        </span>
                        <span className="text-slate-500">{item.fileSize || 'Image HD'}</span>
                      </div>
                    </div>

                    {/* Download button */}
                    {item.fileData && (
                      <a
                        href={item.fileData}
                        download={item.fileName || 'image_partagee.png'}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors self-center"
                        title="Télécharger"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* P2P Encryption Footer Info */}
            <div className="pt-3 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1 text-indigo-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Transfert local direct P2P
              </span>
              <span>Aucun stockage distant</span>
            </div>
          </div>
        </div>
      </div>

      {/* High Res Image Modal Viewer */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="max-w-4xl w-full max-h-[85vh] flex flex-col items-center space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between text-white text-xs px-2">
              <div className="truncate font-semibold text-slate-200">
                {enlargedImage.name} {enlargedImage.caption ? `— "${enlargedImage.caption}"` : ''}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={enlargedImage.url}
                  download={enlargedImage.name}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 shadow"
                >
                  <Download className="w-3.5 h-3.5" /> Télécharger
                </a>
                <button
                  onClick={() => setEnlargedImage(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-black max-h-[75vh] flex items-center justify-center">
              <img 
                src={enlargedImage.url} 
                alt={enlargedImage.name} 
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
