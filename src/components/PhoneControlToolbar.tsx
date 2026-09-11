import React, { useState } from 'react';
import { 
  Bell, BellOff, Vibrate, Flashlight, Mic, 
  Camera, Volume2, Volume1, CornerDownLeft, 
  Home, ChevronLeft, Square, Lock, Unlock, 
  Send, Sparkles, Zap, MessageSquare, Check, Radio
} from 'lucide-react';
import { ScreenCastManager } from '../services/webrtc';
import { RemotePhoneActionType, RemotePhoneEvent } from '../types';

interface PhoneControlToolbarProps {
  manager: ScreenCastManager | null;
  isStreaming: boolean;
  onActionFeedback?: (actionName: string) => void;
}

export const PhoneControlToolbar: React.FC<PhoneControlToolbarProps> = ({
  manager,
  isStreaming,
  onActionFeedback,
}) => {
  const [isRinging, setIsRinging] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [showSpeechModal, setShowSpeechModal] = useState<boolean>(false);
  const [speechText, setSpeechText] = useState<string>('Bonjour ! Votre ordinateur est connecté à votre smartphone.');
  const [sentSpeechSuccess, setSentSpeechSuccess] = useState<boolean>(false);

  const sendPhoneEvent = (action: RemotePhoneActionType, extra?: Partial<RemotePhoneEvent>) => {
    if (manager) {
      manager.sendRemotePhoneEvent({
        action,
        timestamp: Date.now(),
        ...extra,
      });
    }
  };

  const toggleRing = () => {
    const nextState = !isRinging;
    setIsRinging(nextState);
    sendPhoneEvent('ring', { text: nextState ? 'start' : 'stop' });
    onActionFeedback?.(nextState ? '🔊 Sonnerie déclenchée sur le téléphone' : 'Sonnerie arrêtée');
  };

  const handleVibrate = () => {
    sendPhoneEvent('vibrate');
    onActionFeedback?.('📳 Vibration envoyée au smartphone');
  };

  const toggleTorch = () => {
    const nextState = !isTorchOn;
    setIsTorchOn(nextState);
    sendPhoneEvent('torch', { text: nextState ? 'on' : 'off' });
    onActionFeedback?.(nextState ? '🔦 Flash / Torche allumé sur le smartphone' : '🔦 Flash éteint');
  };

  const handleSpeak = () => {
    if (!speechText.trim()) return;
    sendPhoneEvent('speak', { text: speechText.trim() });
    setSentSpeechSuccess(true);
    onActionFeedback?.(`🗣️ Synthèse vocale envoyée : "${speechText.slice(0, 30)}..."`);
    setTimeout(() => {
      setSentSpeechSuccess(false);
      setShowSpeechModal(false);
    }, 1200);
  };

  const handleCameraSnap = () => {
    sendPhoneEvent('camera_snap');
    onActionFeedback?.('📸 Photo demandée au smartphone (en cours de transfert)');
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {/* Upper Control Bar (Ring, Vibrate, Flash, Speak, Camera, Volume) */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl px-3 py-1.5 flex items-center gap-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
        <span className="text-[11px] font-bold text-slate-400 px-1 hidden sm:inline flex items-center gap-1">
          <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          Contrôle Téléphone :
        </span>

        {/* Ring / Siren Button */}
        <button
          id="btn-phone-ring"
          onClick={toggleRing}
          className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow ${
            isRinging 
              ? 'bg-rose-600 text-white animate-bounce' 
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60'
          }`}
          title="Faire sonner le téléphone (Alerte / Retrouver son téléphone)"
        >
          {isRinging ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4 text-amber-400" />}
          <span className="hidden md:inline">{isRinging ? 'Arrêter Sonnerie' : 'Faire Sonner'}</span>
        </button>

        {/* Vibrate Button */}
        <button
          id="btn-phone-vibrate"
          onClick={handleVibrate}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60"
          title="Faire vibrer le smartphone"
        >
          <Vibrate className="w-4 h-4 text-indigo-400" />
          <span className="hidden lg:inline">Vibrer</span>
        </button>

        {/* Flashlight / Torch Button */}
        <button
          id="btn-phone-torch"
          onClick={toggleTorch}
          className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
            isTorchOn 
              ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/60'
          }`}
          title="Allumer le Flash / Torche du smartphone"
        >
          <Flashlight className="w-4 h-4" />
          <span className="hidden lg:inline">{isTorchOn ? 'Flash ON' : 'Flash'}</span>
        </button>

        {/* Text-To-Speech Button */}
        <button
          id="btn-phone-speak"
          onClick={() => setShowSpeechModal(!showSpeechModal)}
          className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
            showSpeechModal
              ? 'bg-indigo-600 text-white border-indigo-400'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/60'
          }`}
          title="Faire parler le téléphone (Synthèse Vocale à distance)"
        >
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span className="hidden md:inline">Faire Parler</span>
        </button>

        {/* Remote Camera Snap */}
        <button
          id="btn-phone-camera-snap"
          onClick={handleCameraSnap}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60"
          title="Prendre une photo à distance avec l'appareil photo du mobile"
        >
          <Camera className="w-4 h-4 text-cyan-400" />
          <span className="hidden lg:inline">Photo Distante</span>
        </button>
      </div>

      {/* Popover Speech Input */}
      {showSpeechModal && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-2xl z-30 max-w-sm w-full animate-in fade-in zoom-in duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              Synthèse vocale à distance sur le téléphone
            </span>
            <button
              onClick={() => setShowSpeechModal(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={speechText}
              onChange={(e) => setSpeechText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSpeak()}
              placeholder="Texte que le smartphone doit énoncer à voix haute..."
              className="flex-1 bg-slate-950 border border-slate-700 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleSpeak}
              disabled={!speechText.trim()}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 shadow"
            >
              {sentSpeechSuccess ? <Check className="w-4 h-4" /> : <Send className="w-3.5 h-3.5" />}
              <span>Énoncer</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
