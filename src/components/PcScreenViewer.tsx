import React, { useState, useRef, useEffect } from 'react';
import { 
  Monitor, Volume2, VolumeX, Maximize2, Minimize2, Camera, 
  MousePointer, Zap, Activity, ShieldCheck, Sparkles, Send,
  ArrowUp, ArrowDown, CornerDownLeft, Play, Pause, RefreshCw,
  Sliders, Hand, Check, MessageSquare, Laptop
} from 'lucide-react';
import { StreamStats } from '../types';
import { ScreenCastManager } from '../services/webrtc';
import { soundEngine } from '../utils/audioAlert';

interface PcScreenViewerProps {
  manager: ScreenCastManager | null;
  remoteStream: MediaStream | null;
  fallbackFrame: string | null;
  streamStats: StreamStats;
  isStreaming: boolean;
  onSendFeedback?: (title: string, desc: string) => void;
}

export const PcScreenViewer: React.FC<PcScreenViewerProps> = ({
  manager,
  remoteStream,
  fallbackFrame,
  streamStats,
  isStreaming,
  onSendFeedback,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [touchMode, setTouchMode] = useState<'click' | 'view'>('click');
  const [clickRipples, setClickRipples] = useState<{ id: string; x: number; y: number }[]>([]);
  const [quickInput, setQuickInput] = useState<string>('');
  const [snapshotSuccess, setSnapshotSuccess] = useState<boolean>(false);

  // Attach remote stream to video element
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current.play().catch((e) => {
        console.warn('Auto-play was prevented:', e);
      });
    }
  }, [remoteStream]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Tap on PC screen to click remotely
  const handleScreenTouch = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (touchMode !== 'click') return;
    const rect = e.currentTarget.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    } else {
      return;
    }

    const relX = ((clientX - rect.left) / rect.width) * 100;
    const relY = ((clientY - rect.top) / rect.height) * 100;

    // Visual ripple effect
    const rippleId = Math.random().toString(36).substring(2, 9);
    setClickRipples((prev) => [...prev, { id: rippleId, x: clientX - rect.left, y: clientY - rect.top }]);
    setTimeout(() => {
      setClickRipples((prev) => prev.filter((r) => r.id !== rippleId));
    }, 600);

    soundEngine.playTapSound();
    soundEngine.triggerVibration(15);

    // Send click and coordinates to PC
    if (manager) {
      manager.sendRemotePcEvent({
        action: 'mouse_move',
        x: relX,
        y: relY,
        timestamp: Date.now(),
      });
      manager.sendRemotePcEvent({
        action: 'mouse_click',
        x: relX,
        y: relY,
        timestamp: Date.now(),
      });
    }
  };

  // Take screenshot of PC screen on phone
  const handleTakeSnapshot = () => {
    let capturedDataUrl: string | null = null;

    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        capturedDataUrl = canvas.toDataURL('image/png');
      }
    } else if (fallbackFrame) {
      capturedDataUrl = fallbackFrame;
    }

    if (capturedDataUrl) {
      soundEngine.playCameraShutter();
      soundEngine.triggerVibration(35);
      const link = document.createElement('a');
      link.href = capturedDataUrl;
      link.download = `capture-ecran-pc-${Date.now()}.png`;
      link.click();
      setSnapshotSuccess(true);
      setTimeout(() => setSnapshotSuccess(false), 3000);
      onSendFeedback?.('📸 Capture Enregistrée', 'L\'écran du PC a été téléchargé sur votre smartphone.');
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim() || !manager) return;
    manager.sendRemotePcEvent({
      action: 'type_text',
      text: quickInput,
    });
    soundEngine.playTapSound();
    setQuickInput('');
  };

  const isLive = isStreaming || !!remoteStream || !!fallbackFrame;

  return (
    <div ref={containerRef} className="flex flex-col space-y-4">
      {/* Live Stream Viewport Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 space-y-3 shadow-2xl overflow-hidden">
        {/* Top bar with stats & controls */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-bold text-white flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-indigo-400" />
              {isLive ? "Écran de l'ordinateur en direct" : "En attente du partage PC..."}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isLive && (
              <span className="px-2 py-0.5 rounded-full bg-slate-950 text-indigo-300 font-mono text-[10px] border border-slate-800">
                {streamStats.fps} FPS
              </span>
            )}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
              title={isMuted ? "Activer l'audio" : "Couper l'audio"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
            <button
              onClick={handleTakeSnapshot}
              disabled={!isLive}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
              title="Enregistrer une capture d'écran"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-400" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
              title="Plein écran"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Video / Frame Stage */}
        <div 
          onClick={handleScreenTouch}
          className={`relative w-full aspect-video rounded-2xl bg-black border border-slate-800 overflow-hidden flex items-center justify-center select-none ${
            touchMode === 'click' && isLive ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''
          }`}
        >
          {remoteStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isMuted}
              className="w-full h-full object-contain pointer-events-none"
            />
          ) : fallbackFrame ? (
            <img
              src={fallbackFrame}
              alt="Écran PC en direct"
              className="w-full h-full object-contain pointer-events-none"
            />
          ) : (
            <div className="p-6 text-center space-y-3 max-w-xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 mx-auto flex items-center justify-center border border-indigo-500/30">
                <Laptop className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-white text-xs">Aucun flux PC reçu pour le moment</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Sur l'écran de votre ordinateur, cliquez sur le bouton <strong className="text-indigo-300">"Diffuser mon Écran PC ➔ Mobile"</strong>.
                </p>
              </div>
              {manager && (
                <button
                  onClick={() => {
                    soundEngine.playTapSound();
                    manager.sendRemotePcEvent({ action: 'ping_test' });
                    onSendFeedback?.('🔔 Signal Envoyé', 'Signal transmis à l\'ordinateur.');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition-colors"
                >
                  🔔 Envoyer un signal d'appel au PC
                </button>
              )}
            </div>
          )}

          {/* Click Ripple animations */}
          {clickRipples.map((ripple) => (
            <div
              key={ripple.id}
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-400 bg-indigo-500/40 animate-ping"
              style={{
                left: `${ripple.x}px`,
                top: `${ripple.y}px`,
                width: '36px',
                height: '36px',
              }}
            />
          ))}

          {/* Touch Mode Badge */}
          {isLive && (
            <div className="absolute bottom-2 left-2 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-950/80 backdrop-blur-md text-[10px] text-slate-300 border border-slate-700">
              <Hand className="w-3 h-3 text-indigo-400" />
              <span>{touchMode === 'click' ? '👆 Touchez pour cliquer sur le PC' : 'Mode Lecture seule'}</span>
            </div>
          )}
        </div>

        {snapshotSuccess && (
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs flex items-center justify-between">
            <span className="font-semibold">✓ Capture d'écran enregistrée avec succès !</span>
          </div>
        )}
      </div>

      {/* Quick Remote Controls under Live View */}
      {isLive && (
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Actions Rapides sur l'Ordinateur
            </span>
            <div className="flex gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setTouchMode('click')}
                className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition-colors ${
                  touchMode === 'click' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400'
                }`}
              >
                Clic Tactile
              </button>
              <button
                onClick={() => setTouchMode('view')}
                className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition-colors ${
                  touchMode === 'view' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400'
                }`}
              >
                Lecture Seule
              </button>
            </div>
          </div>

          {/* Quick Keys grid */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => {
                soundEngine.playTapSound();
                manager?.sendRemotePcEvent({ action: 'mouse_click' });
              }}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-slate-100 font-bold text-xs flex flex-col items-center gap-1 border border-slate-700 shadow-sm"
            >
              <MousePointer className="w-3.5 h-3.5 text-indigo-400" />
              <span>Clic Gauche</span>
            </button>

            <button
              onClick={() => {
                soundEngine.playTapSound();
                manager?.sendRemotePcEvent({ action: 'mouse_right_click' });
              }}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-slate-100 font-bold text-xs flex flex-col items-center gap-1 border border-slate-700 shadow-sm"
            >
              <MousePointer className="w-3.5 h-3.5 text-purple-400" />
              <span>Clic Droit</span>
            </button>

            <button
              onClick={() => {
                soundEngine.playTapSound();
                manager?.sendRemotePcEvent({ action: 'mouse_scroll', deltaY: -50 });
              }}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-slate-100 font-bold text-xs flex flex-col items-center gap-1 border border-slate-700 shadow-sm"
            >
              <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Scroll Haut</span>
            </button>

            <button
              onClick={() => {
                soundEngine.playTapSound();
                manager?.sendRemotePcEvent({ action: 'mouse_scroll', deltaY: 50 });
              }}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-slate-100 font-bold text-xs flex flex-col items-center gap-1 border border-slate-700 shadow-sm"
            >
              <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>Scroll Bas</span>
            </button>
          </div>

          {/* Quick Key buttons (Enter, Space, Escape) */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={() => {
                soundEngine.playTapSound();
                manager?.sendRemotePcEvent({ action: 'key_press', key: 'Enter' });
              }}
              className="py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 active:bg-indigo-600 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-800"
            >
              <CornerDownLeft className="w-3.5 h-3.5 text-indigo-400" />
              <span>Entrée</span>
            </button>

            <button
              onClick={() => {
                soundEngine.playTapSound();
                manager?.sendRemotePcEvent({ action: 'media_play_pause' });
              }}
              className="py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 active:bg-indigo-600 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-800"
            >
              <Play className="w-3.5 h-3.5 text-amber-400" />
              <span>Play/Pause</span>
            </button>

            <button
              onClick={() => {
                soundEngine.playTapSound();
                manager?.sendRemotePcEvent({ action: 'key_press', key: 'Escape' });
              }}
              className="py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 active:bg-indigo-600 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-800"
            >
              <span>Échap</span>
            </button>
          </div>

          {/* Type text remotely */}
          <form onSubmit={handleSendText} className="flex gap-2 pt-1">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Taper du texte sur le PC..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!quickInput.trim()}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Envoyer</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
