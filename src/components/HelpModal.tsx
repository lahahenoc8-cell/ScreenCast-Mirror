import React from 'react';
import { 
  Smartphone, Monitor, Wifi, QrCode, ShieldCheck, 
  HelpCircle, CheckCircle2, ArrowRight, Zap, PlayCircle,
  AlertTriangle, Camera, Image, Laptop
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, roomId }) => {
  if (!isOpen) return null;

  return (
    <div 
      id="help-modal"
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 text-slate-100 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Guide de partage d'écran & compatibilité</h2>
              <p className="text-xs text-slate-400">Pourquoi certains navigateurs restreignent la capture et comment faire</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Browser limitation explanation */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 text-amber-200">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4" />
            <span>Pourquoi mon navigateur n'autorise pas la capture d'écran ?</span>
          </div>
          <p className="leading-relaxed text-[11px] text-amber-200/90">
            Sur <strong>iPhone / iPad (iOS Safari)</strong>, Apple interdit aux pages web l'enregistrement de l'écran entier du système pour des raisons de confidentialité (mots de passe, cartes bancaires).
            Sur <strong>Android</strong>, certains navigateurs intégrés bloquent également l'API standard <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">getDisplayMedia</code>.
          </p>
        </div>

        {/* 3 Solutions */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Nos 3 solutions intégrées :</h3>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Camera className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-slate-200">1. Mode Caméra HD / Visualiseur</p>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Fonctionne sur 100% des smartphones (iOS et Android). Utilisez l'appareil photo arrière ou avant pour projeter des documents, du texte ou votre environnement en temps réel à 60 FPS.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <Image className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-slate-200">2. Diffuseur de Captures d'écran & Photos</p>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Faites une capture d'écran sur votre téléphone (ex: Bouton Marche + Volume), puis cliquez sur l'onglet <strong>Captures</strong> pour l'afficher instantanément en plein écran HD sur votre ordinateur.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
              <Laptop className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-slate-200">3. Partage d'écran natif (Android Chrome ou AirPlay/QuickTime)</p>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Sur Android Chrome, cliquez sur « Partager l'écran » et validez l'alerte système. Sur iPhone, vous pouvez aussi brancher le câble USB à votre PC/Mac ou utiliser AirPlay.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
          >
            Fermer le guide
          </button>
        </div>
      </div>
    </div>
  );
};
