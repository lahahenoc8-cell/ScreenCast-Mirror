import React from 'react';
import { 
  Cast, Smartphone, Monitor, SplitSquareVertical, 
  HelpCircle, MessageSquare, Plus, Copy, Check, QrCode, LogOut,
  Wifi, Power, Link2, Unlink
} from 'lucide-react';
import { AppRole } from '../types';
import { QrCodeScannerModal } from './QrCodeScannerModal';

interface NavbarProps {
  role: AppRole;
  onChangeRole: (newRole: AppRole) => void;
  roomId: string;
  onJoinRoom: (newRoomId: string) => void;
  onNewRoom: () => void;
  onOpenHelp: () => void;
  onToggleClipboard: () => void;
  clipboardCount: number;
  peerCount: number;
  isStreaming: boolean;
  socketState?: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed';
  onRetryConnect?: () => void;
  onDisconnect?: () => void;
  onConnect?: () => void;
  isDisconnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  role,
  onChangeRole,
  roomId,
  onJoinRoom,
  onNewRoom,
  onOpenHelp,
  onToggleClipboard,
  clipboardCount,
  peerCount,
  isStreaming,
  socketState = 'connected',
  onRetryConnect,
  onDisconnect,
  onConnect,
  isDisconnected = false,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [showJoinModal, setShowJoinModal] = React.useState(false);
  const [showQrScanner, setShowQrScanner] = React.useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = React.useState(false);
  const [inputRoomId, setInputRoomId] = React.useState('');

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let cleaned = inputRoomId.trim().toUpperCase();
    if (!cleaned) return;
    if (!cleaned.startsWith('CAST-') && /^\d+$/.test(cleaned)) {
      cleaned = `CAST-${cleaned}`;
    }
    onJoinRoom(cleaned);
    setShowJoinModal(false);
    setInputRoomId('');
  };

  const handleScanSuccess = (newRoom: string) => {
    onJoinRoom(newRoom);
    setShowJoinModal(false);
  };

  return (
    <header 
      id="main-navbar"
      className="h-16 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between z-30 shrink-0"
    >
      {/* Brand & App Name */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
          <Cast className="w-5 h-5 text-white" />
        </div>
        <div className="shrink-0">
          <h1 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2 whitespace-nowrap">
            ScreenCast Mirror
            <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              HD WebRTC
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 hidden sm:block whitespace-nowrap">Partage d'écran Téléphone vers Ordinateur</p>
        </div>
      </div>

      {/* Role Navigation Switcher */}
      <div className="flex items-center rounded-2xl bg-slate-950 p-1 border border-slate-800 shrink-0">
        <button
          id="nav-role-receiver"
          onClick={() => onChangeRole('receiver')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            role === 'receiver'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ordinateur</span> (Récepteur)
        </button>

        <button
          id="nav-role-sender"
          onClick={() => onChangeRole('sender')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            role === 'sender'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Téléphone</span> (Émetteur)
        </button>

        <button
          id="nav-role-dual"
          onClick={() => onChangeRole('dual_test')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            role === 'dual_test'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <SplitSquareVertical className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Mode Démo / Test</span>
        </button>
      </div>

      {/* Actions & Room Code */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Real-time Connection State Badge */}
        {socketState === 'failed' || socketState === 'disconnected' ? (
          <button
            onClick={onRetryConnect}
            className="flex items-center gap-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-2.5 py-1.5 rounded-xl border border-rose-500/40 text-xs font-bold transition-colors whitespace-nowrap"
            title="Connexion interrompue. Cliquez pour réessayer."
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="hidden xl:inline">Non connecté (Réessayer)</span>
            <span className="xl:hidden hidden sm:inline">Hors-ligne</span>
          </button>
        ) : socketState === 'reconnecting' || socketState === 'connecting' ? (
          <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-300 px-2.5 py-1.5 rounded-xl border border-amber-500/30 text-xs font-semibold whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="hidden sm:inline">Connexion...</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs whitespace-nowrap">
            <span className={`w-2 h-2 rounded-full ${peerCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-slate-300 hidden md:inline">
              {peerCount > 0 ? `${peerCount} connecté(s)` : 'En attente...'}
            </span>
          </div>
        )}

        {/* Room Code Badge & Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs whitespace-nowrap">
          <span className="text-slate-400 hidden sm:inline">Session :</span>
          <button
            onClick={copyRoomCode}
            className="font-mono font-bold text-indigo-300 hover:text-white flex items-center gap-1"
            title="Cliquez pour copier le code"
          >
            {roomId}
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
          </button>
          <button
            id="btn-switch-room-modal"
            onClick={() => setShowJoinModal(true)}
            className="ml-1 px-1.5 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-semibold transition-colors"
            title="Rejoindre un autre code de session"
          >
            Changer
          </button>
        </div>

        {/* QR Code Scanner Button */}
        <button
          id="btn-nav-scan-qr"
          onClick={() => setShowQrScanner(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-colors"
          title="Scanner un QR Code pour se connecter"
        >
          <QrCode className="w-4 h-4 text-indigo-400" />
          <span className="hidden sm:inline">Scanner QR</span>
        </button>

        {/* Clipboard & Files Drawer Toggle */}
        <button
          id="btn-open-clipboard"
          onClick={onToggleClipboard}
          className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700/60"
          title="Ouvrir le presse-papier et partage de fichiers"
        >
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          {clipboardCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
              {clipboardCount}
            </span>
          )}
        </button>

        {/* Help Button */}
        <button
          id="btn-open-help"
          onClick={onOpenHelp}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700/60"
          title="Guide d'utilisation et aide"
        >
          <HelpCircle className="w-4 h-4 text-slate-300" />
        </button>

        {/* Option Connexion & Option Déconnexion */}
        <div 
          id="nav-connection-controls"
          className="flex items-center rounded-2xl bg-slate-950 p-1 border border-slate-800 gap-1.5 shrink-0"
        >
          {!isDisconnected && socketState === 'connected' ? (
            <>
              {/* Statut Connecté */}
              <div 
                id="badge-nav-connected"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold"
                title="Session active et synchronisée"
              >
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="inline">Connecté</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>

              {/* Bouton Déconnexion */}
              <button
                id="btn-nav-option-disconnect"
                onClick={() => setShowDisconnectModal(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 cursor-pointer"
                title="Se déconnecter de la session"
              >
                <Power className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </>
          ) : (
            <>
              {/* Bouton Se Connecter */}
              <button
                id="btn-nav-option-connect"
                onClick={() => {
                  onConnect?.() || onRetryConnect?.();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 border border-emerald-300 animate-pulse font-extrabold cursor-pointer"
                title="Cliquer pour vous connecter à la session"
              >
                <Wifi className="w-3.5 h-3.5 text-slate-950" />
                <span>Se connecter</span>
              </button>

              {/* Statut Déconnecté */}
              <div 
                id="badge-nav-disconnected"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400"
                title="Session actuellement déconnectée"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>Déconnecté</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Disconnect Confirmation Modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Quitter la session ?</h3>
                <p className="text-xs text-slate-400">Code de session : <span className="font-mono text-indigo-300 font-bold">{roomId}</span></p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-2xl border border-slate-800">
              La diffusion en direct et la télécommande seront immédiatement arrêtées et la connexion sera fermée pour cet appareil.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                id="btn-confirm-disconnect"
                onClick={() => {
                  setShowDisconnectModal(false);
                  onDisconnect?.();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-lg shadow-rose-600/30"
              >
                Confirmer la Déconnexion
              </button>
              <button
                onClick={() => setShowDisconnectModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cast className="w-4 h-4 text-indigo-400" />
              Rejoindre ou changer de Session
            </h3>
            <p className="text-xs text-slate-400">
              Entrez le code à 4 chiffres (ou CAST-XXXX) affiché sur votre autre appareil pour vous synchroniser.
            </p>

            <form onSubmit={handleJoinSubmit} className="space-y-3">
              <input
                id="input-join-room-code"
                type="text"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value)}
                placeholder="Ex: 8821 ou CAST-8821"
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-indigo-500"
                autoFocus
              />

              <button
                id="btn-open-scanner-from-modal"
                type="button"
                onClick={() => {
                  setShowJoinModal(false);
                  setShowQrScanner(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <QrCode className="w-4 h-4 text-indigo-400" />
                <span>📷 Scanner le QR Code de l'écran avec la caméra</span>
              </button>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                >
                  Annuler
                </button>
                <button
                  id="btn-confirm-join-room"
                  type="submit"
                  disabled={!inputRoomId.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-bold text-white transition-colors shadow"
                >
                  Rejoindre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Scanner Full Modal */}
      <QrCodeScannerModal
        isOpen={showQrScanner}
        onClose={() => setShowQrScanner(false)}
        onScanSuccess={handleScanSuccess}
      />
    </header>
  );
};
