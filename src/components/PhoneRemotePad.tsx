import React, { useState, useRef, useEffect } from 'react';
import { 
  MousePointer, Volume2, VolumeX, Play, Pause, 
  SkipBack, SkipForward, Maximize2, Send, CornerDownLeft, 
  Delete, Search, Layers, Copy, Clipboard, Sliders, 
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ShieldCheck,
  Sparkles, Zap, Smartphone, Laptop, Check, RefreshCw,
  HelpCircle, Info, X, ExternalLink, Terminal
} from 'lucide-react';
import { ScreenCastManager } from '../services/webrtc';
import { RemotePcEvent } from '../types';

interface PhoneRemotePadProps {
  manager: ScreenCastManager | null;
  roomId: string;
}

export const PhoneRemotePad: React.FC<PhoneRemotePadProps> = ({ manager, roomId }) => {
  const [subTab, setSubTab] = useState<'trackpad' | 'media' | 'keyboard'>('trackpad');
  const [sensitivity, setSensitivity] = useState<number>(1.5);
  const [dragLock, setDragLock] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [lastActionToast, setLastActionToast] = useState<string | null>(null);
  const [feedbackClick, setFeedbackClick] = useState<boolean>(false);
  const [touchPoint, setTouchPoint] = useState<{ x: number; y: number } | null>(null);
  const [showHelpGuide, setShowHelpGuide] = useState<boolean>(false);

  const trackpadRef = useRef<HTMLDivElement>(null);
  const lastTouchRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isDragging = useRef<boolean>(false);

  const showToast = (msg: string) => {
    setLastActionToast(msg);
    setTimeout(() => setLastActionToast(null), 1800);
  };

  const sendPcEvent = (event: RemotePcEvent) => {
    if (manager) {
      manager.sendRemotePcEvent(event);
    }
    // Haptic feedback if available
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  // Unified Pointer (Mouse & Touch) Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only capture primary button or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch (err) {}

    const now = Date.now();
    lastTouchRef.current = { x: e.clientX, y: e.clientY, time: now };
    touchStartRef.current = { x: e.clientX, y: e.clientY, time: now };
    isDragging.current = true;

    if (trackpadRef.current) {
      const rect = trackpadRef.current.getBoundingClientRect();
      setTouchPoint({
        x: Math.max(10, Math.min(rect.width - 10, e.clientX - rect.left)),
        y: Math.max(10, Math.min(rect.height - 10, e.clientY - rect.top)),
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || !lastTouchRef.current) return;

    if (trackpadRef.current) {
      const rect = trackpadRef.current.getBoundingClientRect();
      setTouchPoint({
        x: Math.max(10, Math.min(rect.width - 10, e.clientX - rect.left)),
        y: Math.max(10, Math.min(rect.height - 10, e.clientY - rect.top)),
      });
    }

    const deltaX = (e.clientX - lastTouchRef.current.x) * sensitivity;
    const deltaY = (e.clientY - lastTouchRef.current.y) * sensitivity;

    if (Math.abs(deltaX) > 0.2 || Math.abs(deltaY) > 0.2) {
      sendPcEvent({
        action: 'mouse_move',
        deltaX,
        deltaY,
        timestamp: Date.now(),
      });
      lastTouchRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch (err) {}

    setTouchPoint(null);

    if (touchStartRef.current) {
      const duration = Date.now() - touchStartRef.current.time;
      const dist = Math.hypot(e.clientX - touchStartRef.current.x, e.clientY - touchStartRef.current.y);
      // If short tap/click without big movement, trigger left click
      if (duration < 300 && dist < 12) {
        sendPcEvent({ action: 'mouse_click', timestamp: Date.now() });
        setFeedbackClick(true);
        setTimeout(() => setFeedbackClick(false), 200);
        showToast('Clic Gauche PC');
      }
    }
    lastTouchRef.current = null;
    touchStartRef.current = null;
    isDragging.current = false;
  };

  // Trackpad Multi-Touch Handlers (for 2-finger scroll)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      lastTouchRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        time: Date.now(),
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && lastTouchRef.current) {
      const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const deltaY = (currentY - lastTouchRef.current.y) * sensitivity * 1.5;

      sendPcEvent({
        action: 'mouse_scroll',
        deltaY,
        timestamp: Date.now(),
      });

      lastTouchRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: currentY,
        time: Date.now(),
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) {
      lastTouchRef.current = null;
      touchStartRef.current = null;
      isDragging.current = false;
    }
  };

  const handleSendPing = () => {
    sendPcEvent({
      action: 'ping_test',
      timestamp: Date.now(),
    });
    showToast('🔔 Ping de liaison envoyé au PC');
  };

  const handleSendText = () => {
    if (!inputText.trim()) return;
    sendPcEvent({
      action: 'type_text',
      text: inputText,
      timestamp: Date.now(),
    });
    showToast(`Texte envoyé: "${inputText}"`);
    setInputText('');
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 p-4 space-y-4 max-w-lg mx-auto w-full select-none">
      {/* Sub tabs: Trackpad / Media / Keyboard */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-800">
        <button
          id="btn-subtab-trackpad"
          onClick={() => setSubTab('trackpad')}
          className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'trackpad' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span>Trackpad</span>
        </button>

        <button
          id="btn-subtab-media"
          onClick={() => setSubTab('media')}
          className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'media' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Média / Diapo</span>
        </button>

        <button
          id="btn-subtab-keyboard"
          onClick={() => setSubTab('keyboard')}
          className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'keyboard' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
          <span>Clavier PC</span>
        </button>
      </div>

      {/* Floating Action Feedback Toast */}
      {lastActionToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-indigo-400/40 animate-bounce">
          <Zap className="w-3.5 h-3.5 text-amber-300" />
          <span>{lastActionToast}</span>
        </div>
      )}

      {/* TAB 1: TRACKPAD VIRTUEL */}
      {subTab === 'trackpad' && (
        <div className="flex-1 flex flex-col space-y-3">
          {/* Quick Connection Bar with Direct Ping Test */}
          <div className="p-2.5 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between text-xs gap-1.5 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-medium">Session : <span className="font-mono text-indigo-300">{roomId}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                id="btn-phone-help-guide"
                onClick={() => setShowHelpGuide(true)}
                className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-[11px] border border-slate-700 flex items-center gap-1 transition-all"
                title="Comment manipuler l'ordinateur"
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span>Aide</span>
              </button>
              <button
                id="btn-phone-ping-pc"
                onClick={handleSendPing}
                className="px-2.5 py-1 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white font-semibold text-[11px] border border-indigo-500/40 flex items-center gap-1 transition-all"
                title="Tester la liaison avec l'ordinateur"
              >
                <Zap className="w-3 h-3 text-amber-300" />
                <span>Tester liaison</span>
              </button>
            </div>
          </div>

          {/* Trackpad Surface */}
          <div
            ref={trackpadRef}
            id="virtual-trackpad-surface"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`flex-1 min-h-[280px] sm:min-h-[340px] rounded-3xl border-2 transition-colors relative flex flex-col items-center justify-center overflow-hidden touch-none select-none cursor-crosshair shadow-inner ${
              feedbackClick 
                ? 'bg-indigo-950/70 border-indigo-400' 
                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
            }`}
          >
            {/* Real-time Finger Contact Indicator */}
            {touchPoint && (
              <div
                className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 z-20 transition-transform duration-75"
                style={{ left: touchPoint.x, top: touchPoint.y }}
              >
                <div className="w-12 h-12 rounded-full bg-indigo-500/25 border-2 border-indigo-400/80 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <div className="w-3 h-3 rounded-full bg-white shadow" />
                </div>
              </div>
            )}

            {/* Center Trackpad Guide Icon */}
            <div className="flex flex-col items-center gap-2 text-slate-500 pointer-events-none">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 shadow">
                <MousePointer className="w-6 h-6 text-indigo-400" />
              </div>
              <p className="text-xs font-medium text-slate-300">Surface Trackpad PC</p>
              <p className="text-[11px] text-slate-500 text-center px-6">
                Glissez 1 doigt pour déplacer • 1 tap = Clic gauche • 2 doigts = Défilement
              </p>
            </div>

            {/* Visual click ripple indicator */}
            {feedbackClick && (
              <span className="absolute w-20 h-20 rounded-full bg-indigo-500/30 animate-ping pointer-events-none" />
            )}

            {/* Scroll Zone on the right edge */}
            <div className="absolute right-2 inset-y-6 w-8 rounded-full bg-slate-800/40 border border-slate-700/30 flex flex-col items-center justify-between py-3 pointer-events-none text-slate-500 text-[9px] font-bold">
              <span>▲</span>
              <span className="rotate-90 text-[8px] tracking-wider text-slate-400">DÉFILER</span>
              <span>▼</span>
            </div>
          </div>

          {/* Mouse Buttons: Left Click & Right Click */}
          <div className="grid grid-cols-2 gap-3 h-16">
            <button
              id="btn-mouse-left"
              onClick={() => {
                sendPcEvent({ action: 'mouse_click', timestamp: Date.now() });
                showToast('Clic Gauche PC');
              }}
              className="rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-indigo-600 text-white font-bold text-sm border border-slate-800 shadow flex items-center justify-center gap-2 transition-colors"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
              <span>Clic Gauche</span>
            </button>

            <button
              id="btn-mouse-right"
              onClick={() => {
                sendPcEvent({ action: 'mouse_right_click', timestamp: Date.now() });
                showToast('Clic Droit PC');
              }}
              className="rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-indigo-600 text-white font-bold text-sm border border-slate-800 shadow flex items-center justify-center gap-2 transition-colors"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
              <span>Clic Droit</span>
            </button>
          </div>

          {/* Controls bar: Sensitivity */}
          <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Sensibilité :</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 1.5, 2, 2.5].map((val) => (
                <button
                  key={val}
                  onClick={() => setSensitivity(val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    sensitivity === val ? 'bg-indigo-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {val}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEDIA & PRESENTATION REMOTE */}
      {subTab === 'media' && (
        <div className="flex-1 flex flex-col space-y-4">
          {/* Presentation Slides Section */}
          <div className="p-4 bg-slate-900/90 rounded-3xl border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Diaporama & Présentation PC
              </span>
              <span className="text-[10px] text-slate-500">PowerPoint / Slides / Keynote</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                id="btn-slide-prev"
                onClick={() => {
                  sendPcEvent({ action: 'media_prev', timestamp: Date.now() });
                  showToast('⏮ Diapo Précédente');
                }}
                className="py-4 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all shadow"
              >
                <SkipBack className="w-5 h-5 text-indigo-400" />
                <span>Diapo Précédente</span>
              </button>

              <button
                id="btn-slide-next"
                onClick={() => {
                  sendPcEvent({ action: 'media_next', timestamp: Date.now() });
                  showToast('⏭ Diapo Suivante');
                }}
                className="py-4 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <span>Diapo Suivante</span>
                <SkipForward className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Media & Audio Section */}
          <div className="p-4 bg-slate-900/90 rounded-3xl border border-slate-800 shadow-md space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              Contrôle Multimédia & Volume PC
            </span>

            {/* Play/Pause & Fullscreen */}
            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-media-play"
                onClick={() => {
                  sendPcEvent({ action: 'media_play_pause', timestamp: Date.now() });
                  showToast('⏯ Lecture / Pause PC');
                }}
                className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
              >
                <Play className="w-4 h-4 text-emerald-400" />
                <span>Lecture / Pause</span>
              </button>

              <button
                id="btn-media-fullscreen"
                onClick={() => {
                  sendPcEvent({ action: 'fullscreen_toggle', timestamp: Date.now() });
                  showToast('🖥️ Basculer Plein Écran PC');
                }}
                className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
              >
                <Maximize2 className="w-4 h-4 text-amber-400" />
                <span>Plein Écran PC</span>
              </button>
            </div>

            {/* Volume Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                id="btn-vol-down"
                onClick={() => {
                  sendPcEvent({ action: 'media_vol_down', timestamp: Date.now() });
                  showToast('🔉 Volume -');
                }}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center justify-center gap-1 border border-slate-700"
              >
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Vol -</span>
              </button>

              <button
                id="btn-vol-mute"
                onClick={() => {
                  sendPcEvent({ action: 'media_mute', timestamp: Date.now() });
                  showToast('🔇 Muet PC');
                }}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center justify-center gap-1 border border-slate-700"
              >
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                <span>Muet</span>
              </button>

              <button
                id="btn-vol-up"
                onClick={() => {
                  sendPcEvent({ action: 'media_vol_up', timestamp: Date.now() });
                  showToast('🔊 Volume +');
                }}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center justify-center gap-1 border border-slate-700"
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Vol +</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KEYBOARD & SHORTCUTS */}
      {subTab === 'keyboard' && (
        <div className="flex-1 flex flex-col space-y-4">
          {/* Direct Text Input Sender */}
          <div className="p-4 bg-slate-900/90 rounded-3xl border border-slate-800 shadow-md space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CornerDownLeft className="w-3.5 h-3.5 text-indigo-400" />
              Saisie de Texte Directe sur PC
            </span>

            <div className="flex gap-2">
              <input
                type="text"
                id="input-text-pc"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                placeholder="Tapez du texte à insérer sur le PC..."
                className="flex-1 bg-slate-950 border border-slate-700 text-xs text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500"
              />
              <button
                id="btn-send-text-pc"
                onClick={handleSendText}
                disabled={!inputText.trim()}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Taper</span>
              </button>
            </div>
          </div>

          {/* Quick Shortcuts Pad */}
          <div className="p-4 bg-slate-900/90 rounded-3xl border border-slate-800 shadow-md space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Touches & Raccourcis PC
            </span>

            {/* Functional keys grid */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '↩ Entrée', key: 'Enter' },
                { label: '⌫ Retour', key: 'Backspace' },
                { label: '⎋ Échap', key: 'Escape' },
                { label: '⇥ Tab', key: 'Tab' },
                { label: '📋 Ctrl+C', key: 'ctrl+c' },
                { label: '📝 Ctrl+V', key: 'ctrl+v' },
                { label: '🔀 Alt+Tab', key: 'alt+tab' },
                { label: '🔎 Ctrl+F', key: 'ctrl+f' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    sendPcEvent({ action: 'key_press', key: item.key, timestamp: Date.now() });
                    showToast(`Touche PC : ${item.label}`);
                  }}
                  className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-slate-200 text-xs font-semibold border border-slate-700/80 transition-colors text-center truncate"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Directional Arrows D-Pad */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block text-center">
                Pavé Directionnel (Flèches)
              </span>
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => {
                    sendPcEvent({ action: 'key_press', key: 'ArrowUp', timestamp: Date.now() });
                    showToast('Flèche Haut ↑');
                  }}
                  className="w-12 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-white flex items-center justify-center border border-slate-700"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      sendPcEvent({ action: 'key_press', key: 'ArrowLeft', timestamp: Date.now() });
                      showToast('Flèche Gauche ←');
                    }}
                    className="w-12 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-white flex items-center justify-center border border-slate-700"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      sendPcEvent({ action: 'key_press', key: 'ArrowDown', timestamp: Date.now() });
                      showToast('Flèche Bas ↓');
                    }}
                    className="w-12 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-white flex items-center justify-center border border-slate-700"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      sendPcEvent({ action: 'key_press', key: 'ArrowRight', timestamp: Date.now() });
                      showToast('Flèche Droite →');
                    }}
                    className="w-12 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-white flex items-center justify-center border border-slate-700"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Guide d'aide au contrôle PC */}
      {showHelpGuide && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowHelpGuide(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Manipuler votre Ordinateur</h4>
                  <p className="text-[11px] text-slate-400">Guide rapide d'utilisation</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelpGuide(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                  <MousePointer className="w-3.5 h-3.5" />
                  <span>1. Curseur & Clics</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-300">
                  <li><strong>Glisser 1 doigt</strong> sur le pavé noir déplace le curseur en temps réel sur l'écran du PC.</li>
                  <li><strong>1 tap rapide</strong> ou le bouton <em>Clic Gauche</em> effectue un clic.</li>
                  <li><strong>Bouton Clic Droit</strong> ou appui long ouvre le menu contextuel.</li>
                  <li><strong>Glisser 2 doigts</strong> vers le haut/bas fait défiler la page.</li>
                </ul>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Play className="w-3.5 h-3.5" />
                  <span>2. Diaporama & Multimédia</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Dans l'onglet <strong>Multimédia</strong>, contrôlez vos présentations PowerPoint / Google Slides (Diapo Suivante/Précédente, Plein écran) ainsi que le volume et la lecture vidéo de votre PC.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  <span>3. Clavier & Saisie de texte</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Dans l'onglet <strong>Clavier</strong>, tapez des messages ou utilisez les touches Entrée, Échap, Espace et les flèches directionnelles.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-sky-300">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>4. Contrôle global hors navigateur</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Par défaut, un site web ne peut pas déplacer la souris physique du système d'exploitation hors de sa fenêtre (sécurité navigateur).
                  Sur l'ordinateur, rendez-vous dans l'onglet <strong>Télécommande ➔ Piloter le PC ➔ Pont Système OS</strong> pour télécharger le script Python léger qui permet de piloter 100% de Windows/Mac (bureau, logiciels, jeux) !
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHelpGuide(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition-colors"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
