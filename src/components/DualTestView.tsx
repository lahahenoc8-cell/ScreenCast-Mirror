import React, { useState } from 'react';
import { Smartphone, Monitor, Sparkles, ArrowRight, Zap, RefreshCw, MousePointer, Radio, Bell, Vibrate, Flashlight, MessageSquare } from 'lucide-react';
import { VirtualPhoneContent } from './VirtualPhoneContent';
import { PhoneRemotePad } from './PhoneRemotePad';
import { PhoneControlToolbar } from './PhoneControlToolbar';
import { StreamStats, LaserPointerState, RemotePcEvent } from '../types';
import { ScreenCastManager } from '../services/webrtc';
import { soundEngine } from '../utils/audioAlert';

interface DualTestViewProps {
  manager: ScreenCastManager | null;
  roomId: string;
  streamStats: StreamStats;
  laserPointer: LaserPointerState;
  onToggleClipboard: () => void;
  clipboardCount: number;
}

export const DualTestView: React.FC<DualTestViewProps> = ({
  manager,
  roomId,
  streamStats,
  laserPointer,
  onToggleClipboard,
  clipboardCount,
}) => {
  const [leftTab, setLeftTab] = useState<'screen' | 'remote'>('screen');
  const [activeLaser, setActiveLaser] = useState<LaserPointerState>({ x: 50, y: 50, active: false });
  const [simulatedPcCursor, setSimulatedPcCursor] = useState<{ x: number; y: number; clicking: boolean }>({ x: 50, y: 50, clicking: false });
  const [simulatedPhoneAlert, setSimulatedPhoneAlert] = useState<string | null>(null);
  const [simulatedFlash, setSimulatedFlash] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handlePhonePointer = (x: number, y: number) => {
    setActiveLaser({ x, y, active: true, color: '#6366f1' });
    if (manager) {
      manager.sendPointer(x, y, true, '#6366f1');
    }
  };

  const handlePcToolbarFeedback = (actionName: string) => {
    setActionFeedback(actionName);
    setTimeout(() => setActionFeedback(null), 2500);

    if (actionName.includes('Sonnerie')) {
      setSimulatedPhoneAlert('🔔 Sonnerie en cours...');
      soundEngine.startRingtone();
      setTimeout(() => {
        soundEngine.stopRingtone();
        setSimulatedPhoneAlert(null);
      }, 3000);
    } else if (actionName.includes('Vibration')) {
      setSimulatedPhoneAlert('📳 Vibration reçue !');
      soundEngine.triggerVibration([200, 100, 200]);
      setTimeout(() => setSimulatedPhoneAlert(null), 2000);
    } else if (actionName.includes('Flash')) {
      setSimulatedFlash((prev) => !prev);
      setSimulatedPhoneAlert('🔦 Flash / Torche');
      setTimeout(() => setSimulatedPhoneAlert(null), 2000);
    } else if (actionName.includes('Synthèse')) {
      setSimulatedPhoneAlert('🗣️ Synthèse vocale');
      setTimeout(() => setSimulatedPhoneAlert(null), 2000);
    }
  };

  return (
    <div 
      id="dual-test-view-container"
      className="flex-1 flex flex-col lg:flex-row bg-slate-950 text-slate-100 overflow-hidden relative"
    >
      {/* LEFT SIDE: PHONE SENDER SIMULATOR */}
      <div className="w-full lg:w-[440px] bg-slate-900/60 border-r border-slate-800 flex flex-col shrink-0">
        {/* Left header */}
        <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">1. Téléphone (Émetteur)</h3>
              <p className="text-[10px] text-slate-400">Écran ou Télécommande PC</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setLeftTab('screen')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                leftTab === 'screen' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Écran
            </button>
            <button
              onClick={() => setLeftTab('remote')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                leftTab === 'remote' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Télécommande
            </button>
          </div>
        </div>

        {/* Phone Body */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto relative">
          {simulatedFlash && (
            <div className="absolute inset-4 z-50 bg-white rounded-[32px] flex items-center justify-center text-black font-black text-xs shadow-2xl">
              🔦 FLASH TORCHE ACTIF (Cliquez pour désactiver)
            </div>
          )}

          {leftTab === 'screen' ? (
            <div className="w-full max-w-[320px] h-[560px] rounded-[40px] border-[10px] border-slate-800 bg-black shadow-2xl overflow-hidden ring-1 ring-slate-700/60 relative">
              {simulatedPhoneAlert && (
                <div className="absolute top-8 inset-x-4 z-40 bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-xl text-center shadow animate-bounce">
                  {simulatedPhoneAlert}
                </div>
              )}
              <VirtualPhoneContent onPointerMove={handlePhonePointer} />
            </div>
          ) : (
            <div className="w-full max-w-[360px] h-full flex flex-col">
              <PhoneRemotePad manager={manager} roomId={roomId} />
            </div>
          )}
        </div>

        {/* Tip */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>{leftTab === 'screen' ? 'Touchez une app ou photo' : 'Glissez sur le trackpad'}</span>
          <span className="text-indigo-400 font-semibold">Reflet en temps réel →</span>
        </div>
      </div>

      {/* RIGHT SIDE: COMPUTER RECEIVER SCREEN */}
      <div className="flex-1 flex flex-col bg-slate-950">
        {/* Right header */}
        <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">2. Ordinateur (Récepteur & Contrôleur)</h3>
              <p className="text-[10px] text-slate-400">Aperçu HD + Contrôles du Téléphone</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Session :</span>
            <span className="font-mono font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
              {roomId}
            </span>
          </div>
        </div>

        {/* Top PC Toolbar to Control the Phone */}
        <div className="px-4 py-2 bg-slate-900/95 border-b border-slate-800 flex justify-center">
          <PhoneControlToolbar
            manager={manager}
            isStreaming={true}
            onActionFeedback={handlePcToolbarFeedback}
          />
        </div>

        {/* Feedback alert toast */}
        {actionFeedback && (
          <div className="bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 text-center shadow">
            {actionFeedback}
          </div>
        )}

        {/* Embedded Computer Receiver in Active Mode */}
        <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden bg-radial from-slate-900/80 to-slate-950">
          <div className="w-full max-w-[340px] h-[560px] rounded-[44px] border-[10px] border-slate-800 bg-black shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden ring-1 ring-slate-700/60 relative">
            {/* Mirror Virtual Phone */}
            <VirtualPhoneContent interactive={false} />

            {/* Laser pointer overlay */}
            {activeLaser.active && (
              <div
                className="absolute pointer-events-none z-40 transition-all duration-75 -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${activeLaser.x}%`,
                  top: `${activeLaser.y}%`,
                }}
              >
                <div className="relative">
                  <span className="absolute -inset-2 rounded-full bg-indigo-500 opacity-75 animate-ping" />
                  <div className="w-4 h-4 rounded-full bg-indigo-500 border-2 border-white shadow-lg" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live telemetry bar */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Zap className="w-3.5 h-3.5" /> 60 FPS
            </span>
            <span>Latence : 16 ms</span>
            <span>Résolution : 1080 × 2400</span>
          </div>
          <button
            onClick={onToggleClipboard}
            className="text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            Presse-papier & Fichiers ({clipboardCount})
          </button>
        </div>
      </div>
    </div>
  );
};
