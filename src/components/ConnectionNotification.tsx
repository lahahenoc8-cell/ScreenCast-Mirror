import React, { useEffect, useState, useRef } from 'react';
import { 
  CheckCircle2, Smartphone, Laptop, Wifi, X, ArrowRight, 
  Sparkles, Radio, ShieldCheck, AlertTriangle 
} from 'lucide-react';
import { AppRole, PeerInfo } from '../types';

export interface ConnectionEvent {
  id: string;
  type: 'connected' | 'disconnected' | 'failed' | 'streaming_started';
  title: string;
  description: string;
  deviceName?: string;
  deviceRole?: 'sender' | 'receiver';
  timestamp: number;
}

interface ConnectionNotificationProps {
  currentRole: AppRole;
  roomId: string;
  lastEvent: ConnectionEvent | null;
  onDismiss: () => void;
  onActionClick?: () => void;
}

export const ConnectionNotification: React.FC<ConnectionNotificationProps> = ({
  currentRole,
  roomId,
  lastEvent,
  onDismiss,
  onActionClick,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (lastEvent) {
      setIsVisible(true);
      // Clean, rapid 3.2 second display so notifications inform without persisting or annoying the user
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismissRef.current();
      }, 3200);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [lastEvent?.id]);

  if (!lastEvent || !isVisible) return null;

  const isConnected = lastEvent.type === 'connected';
  const isDisconnected = lastEvent.type === 'disconnected';
  const isFailed = lastEvent.type === 'failed';

  return (
    <div 
      id="connection-status-toast"
      className="fixed top-16 sm:top-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className={`pointer-events-auto max-w-md w-full rounded-2xl p-4 shadow-2xl backdrop-blur-xl border flex items-start gap-3.5 transition-all ${
        isConnected 
          ? 'bg-slate-900/95 border-emerald-500/40 text-slate-100 shadow-[0_10px_40px_rgba(16,185,129,0.25)]' 
          : isFailed
            ? 'bg-slate-900/95 border-rose-500/60 text-slate-100 shadow-[0_10px_40px_rgba(244,63,94,0.35)] ring-1 ring-rose-500/30'
            : isDisconnected 
              ? 'bg-slate-900/95 border-amber-500/40 text-slate-100 shadow-[0_10px_40px_rgba(245,158,11,0.25)]'
              : 'bg-slate-900/95 border-indigo-500/40 text-slate-100 shadow-[0_10px_40px_rgba(99,102,241,0.25)]'
      }`}>
        {/* Device Icon Avatar */}
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
          isConnected 
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
            : isFailed
              ? 'bg-rose-500/25 text-rose-400 border-rose-500/40'
              : isDisconnected
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
        }`}>
          {isConnected ? (
            lastEvent.deviceRole === 'sender' ? (
              <Smartphone className="w-5 h-5 animate-pulse" />
            ) : (
              <Laptop className="w-5 h-5 animate-pulse" />
            )
          ) : isFailed || isDisconnected ? (
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          ) : (
            <Radio className="w-5 h-5 animate-spin" />
          )}
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
              {lastEvent.title}
              {isConnected && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              )}
            </h4>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              isConnected 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                : isFailed
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : isDisconnected
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
            }`}>
              {isConnected ? 'En direct' : isFailed ? 'Échec' : isDisconnected ? 'Déconnecté' : 'Synchronisé'}
            </span>
          </div>

          <p className="text-[11px] text-slate-300 mt-1 leading-snug">
            {lastEvent.description}
          </p>

          <div className="flex items-center justify-between gap-2 mt-2 pt-1 text-[10px] text-slate-400 border-t border-slate-800/80">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              Session : <span className="font-mono text-indigo-300 font-bold">{roomId}</span>
            </span>

            {onActionClick && (
              <button
                onClick={onActionClick}
                className="px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors"
              >
                Réessayer
              </button>
            )}
          </div>
        </div>

        {/* Close Button */}
        <button
          id="btn-dismiss-connection-toast"
          onClick={() => {
            setIsVisible(false);
            onDismiss();
          }}
          className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
