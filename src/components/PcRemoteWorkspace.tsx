import React, { useState, useEffect, useRef } from 'react';
import { 
  MousePointer, Sliders, Play, Pause, Volume2, VolumeX, 
  SkipBack, SkipForward, Maximize2, Sparkles, Zap, Laptop, 
  Smartphone, Check, Copy, Code, Terminal, FileText, 
  Send, CornerDownLeft, ArrowUp, ArrowDown, HelpCircle, 
  Activity, RefreshCw, ChevronRight, Info
} from 'lucide-react';
import { ScreenCastManager } from '../services/webrtc';
import { RemotePcEvent } from '../types';
import { soundEngine } from '../utils/audioAlert';

interface PcRemoteWorkspaceProps {
  manager: ScreenCastManager | null;
  roomId: string;
  remoteCursor: {
    x: number;
    y: number;
    visible: boolean;
    isClicking: boolean;
    clickType?: 'left' | 'right';
    lastAction?: string;
  };
  lastEvent: RemotePcEvent | null;
  onActionFeedback?: (msg: string) => void;
}

export const PcRemoteWorkspace: React.FC<PcRemoteWorkspaceProps> = ({
  manager,
  roomId,
  remoteCursor,
  lastEvent,
  onActionFeedback,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'interactive' | 'presentation' | 'media' | 'terminal' | 'native_os'>('interactive');
  
  // Interactive Presentation Slide Deck state
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const slides = [
    {
      title: 'Bienvenue sur ScreenCast Remote',
      subtitle: 'Contrôle à distance de votre ordinateur depuis votre smartphone',
      badge: 'Diapo 1/4 • Introduction',
      color: 'from-indigo-600 to-purple-600',
      bullets: [
        'Curseur virtuel réactif en temps réel via WebRTC & WebSocket',
        'Contrôle de diaporamas (PowerPoint, Google Slides, Keynote)',
        'Pavé tactile, clics souris et saisie clavier déportée',
      ],
    },
    {
      title: 'Performances & Latence Ultra-Faible',
      subtitle: 'Technologie peer-to-peer optimisée pour le streaming',
      badge: 'Diapo 2/4 • Architecture',
      color: 'from-blue-600 to-cyan-600',
      bullets: [
        'Transmission directe RTCDataChannel < 20 ms',
        'Relais WebSocket chiffré et résilient en cas de réseau complexe',
        'Bande passante adaptative avec support 1080p 60 FPS',
      ],
    },
    {
      title: 'Multimédia & Productivité',
      subtitle: 'Pilotez vos vidéos, musique et présentations',
      badge: 'Diapo 3/4 • Fonctionnalités',
      color: 'from-emerald-600 to-teal-600',
      bullets: [
        'Boutons Suivant / Précédent sur le smartphone',
        'Réglage du volume sonore et coupure du son à distance',
        'Saisie rapide de texte et navigation dans les documents',
      ],
    },
    {
      title: 'Prêt pour vos Présentations !',
      subtitle: 'Testez les boutons de votre téléphone pour naviguer',
      badge: 'Diapo 4/4 • Prêt à l\'emploi',
      color: 'from-purple-600 to-pink-600',
      bullets: [
        'Utilisez le bouton "Diapo Suivante" sur le mobile',
        'Basculez en plein écran avec la télécommande',
        'Ou téléchargez le script compagnon pour piloter tout votre OS Windows/Mac',
      ],
    },
  ];

  // Interactive Media Player state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [mediaVolume, setMediaVolume] = useState<number>(80);
  const [mediaMuted, setMediaMuted] = useState<boolean>(false);
  const [playbackProgress, setPlaybackProgress] = useState<number>(35);

  // Interactive Live Notepad state
  const [notepadText, setNotepadText] = useState<string>(
    'Bienvenue dans votre bloc-notes PC connecté !\nTapez du texte ou utilisez les touches du clavier depuis votre smartphone pour voir le texte s\'écrire ici en direct...'
  );

  // Scroll Test Document state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPercentage, setScrollPercentage] = useState<number>(0);

  // Click Target Counter
  const [clickCount, setClickCount] = useState<number>(0);
  const [targetHits, setTargetHits] = useState<number>(0);

  // Script Copy confirmation
  const [scriptCopied, setScriptCopied] = useState<boolean>(false);

  // Event Log history
  const [eventLog, setEventLog] = useState<{ id: string; time: string; text: string; type: string }[]>([]);

  // React to remote events from phone
  useEffect(() => {
    if (!lastEvent) return;

    const timeStr = new Date(lastEvent.timestamp).toLocaleTimeString();
    let desc = '';

    switch (lastEvent.action) {
      case 'media_next':
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        soundEngine.playTapSound();
        desc = `⏭ Diapo suivante (Diapo ${((currentSlide + 1) % slides.length) + 1})`;
        break;

      case 'media_prev':
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
        soundEngine.playTapSound();
        desc = `⏮ Diapo précédente (Diapo ${((currentSlide - 1 + slides.length) % slides.length) + 1})`;
        break;

      case 'media_play_pause':
        setIsPlaying((prev) => !prev);
        soundEngine.playTapSound();
        desc = `⏯ Lecture / Pause (${!isPlaying ? 'Lecture' : 'Pause'})`;
        break;

      case 'media_vol_up':
        setMediaVolume((prev) => Math.min(100, prev + 10));
        setMediaMuted(false);
        soundEngine.playTapSound();
        desc = `🔊 Volume + (${Math.min(100, mediaVolume + 10)}%)`;
        break;

      case 'media_vol_down':
        setMediaVolume((prev) => Math.max(0, prev - 10));
        soundEngine.playTapSound();
        desc = `🔉 Volume - (${Math.max(0, mediaVolume - 10)}%)`;
        break;

      case 'media_mute':
        setMediaMuted((prev) => !prev);
        soundEngine.playTapSound();
        desc = `🔇 Muet (${!mediaMuted ? 'Activé' : 'Désactivé'})`;
        break;

      case 'type_text':
        if (lastEvent.text) {
          setNotepadText((prev) => prev + (prev.length > 0 ? ' ' : '') + lastEvent.text);
          soundEngine.playTapSound();
          desc = `📝 Texte reçu : "${lastEvent.text}"`;
        }
        break;

      case 'key_press':
        if (lastEvent.key) {
          const k = lastEvent.key;
          soundEngine.playTapSound();
          if (k === 'Enter') {
            setNotepadText((prev) => prev + '\n');
            desc = '⌨️ Touche Entrée (nouvelle ligne)';
          } else if (k === 'Backspace') {
            setNotepadText((prev) => prev.slice(0, -1));
            desc = '⌨️ Touche Retour arrière';
          } else if (k === 'Space') {
            setNotepadText((prev) => prev + ' ');
            desc = '⌨️ Touche Espace';
          } else if (k === 'ArrowRight') {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
            desc = '⌨️ Flèche Droite (Diapo Suivante)';
          } else if (k === 'ArrowLeft') {
            setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
            desc = '⌨️ Flèche Gauche (Diapo Précédente)';
          } else {
            desc = `⌨️ Touche PC : ${k}`;
          }
        }
        break;

      case 'mouse_scroll':
        if (scrollContainerRef.current && lastEvent.deltaY) {
          scrollContainerRef.current.scrollTop += lastEvent.deltaY * 3;
          desc = `📜 Défilement (${lastEvent.deltaY > 0 ? 'Bas' : 'Haut'})`;
        }
        break;

      case 'mouse_click':
        setClickCount((c) => c + 1);
        desc = '🖱️ Clic gauche reçu du smartphone';
        break;

      case 'mouse_right_click':
        desc = '🖱️ Clic droit reçu du smartphone';
        break;

      case 'ping_test':
        soundEngine.playTapSound();
        desc = '🔔 Signal Ping smartphone reçu avec succès !';
        break;

      default:
        break;
    }

    if (desc) {
      setEventLog((prev) => [
        { id: Math.random().toString(), time: timeStr, text: desc, type: lastEvent.action },
        ...prev.slice(0, 19),
      ]);
    }
  }, [lastEvent]);

  // Handle scroll progress
  const handleScrollUpdate = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const progress = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100) || 0;
      setScrollPercentage(progress);
    }
  };

  // Generate Python Native Bridge script
  const pythonScript = `# ========================================================
# ScreenCast Mirror - Pont Natif Contrôle Souris & Clavier
# Ce script permet au smartphone de piloter TOUT votre PC (hors navigateur)
# ========================================================
# Prérequis : pip install websockets pyautogui

import asyncio
import json
import websockets
import pyautogui

pyautogui.FAILSAFE = False

ROOM_ID = "${roomId}"
SERVER_HOST = "${typeof window !== 'undefined' ? window.location.host : 'localhost:3000'}"
PROTOCOL = "${typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws'}"
WS_URL = f"{PROTOCOL}://{SERVER_HOST}/ws"

async def bridge():
    print(f"[*] Connexion au serveur de relais {WS_URL}...")
    async with websockets.connect(WS_URL) as ws:
        # Rejoindre la session de votre ordinateur
        join_payload = {
            "type": "join",
            "roomId": ROOM_ID,
            "role": "receiver",
            "deviceName": "Contrôleur Natif PC (Souris & Clavier)"
        }
        await ws.send(json.dumps(join_payload))
        print(f"[+] Connecté avec succès à la session {ROOM_ID} !")
        print("[+] Déplacez votre doigt sur le smartphone : la souris de votre ordinateur bouge en direct !")

        while True:
            raw = await ws.recv()
            msg = json.loads(raw)
            
            if msg.get("type") == "remote-pc-event":
                ev = msg.get("event", {})
                action = ev.get("action")
                
                # 1. Déplacement de la souris
                if action == "mouse_move":
                    dx = ev.get("deltaX", 0) * 2.2
                    dy = ev.get("deltaY", 0) * 2.2
                    pyautogui.moveRel(dx, dy)

                # 2. Clic gauche
                elif action == "mouse_click":
                    pyautogui.click()
                    print("🖱️ Clic Gauche exécuté")

                # 3. Clic droit
                elif action == "mouse_right_click":
                    pyautogui.rightClick()
                    print("🖱️ Clic Droit exécuté")

                # 4. Défilement molette
                elif action == "mouse_scroll":
                    delta = ev.get("deltaY", 0)
                    pyautogui.scroll(int(-delta * 12))

                # 5. Saisie de texte
                elif action == "type_text":
                    text = ev.get("text", "")
                    pyautogui.write(text, interval=0.01)
                    print(f"📝 Texte saisi : {text}")

                # 6. Touches du clavier
                elif action == "key_press":
                    k = ev.get("key", "").lower()
                    if k == "enter": pyautogui.press("enter")
                    elif k == "backspace": pyautogui.press("backspace")
                    elif k == "space": pyautogui.press("space")
                    elif k == "arrowup": pyautogui.press("up")
                    elif k == "arrowdown": pyautogui.press("down")
                    elif k == "arrowleft": pyautogui.press("left")
                    elif k == "arrowright": pyautogui.press("right")

asyncio.run(bridge())
`;

  const copyPythonScript = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(pythonScript);
      setScriptCopied(true);
      soundEngine.playTapSound();
      setTimeout(() => setScriptCopied(false), 2500);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto max-w-6xl mx-auto w-full space-y-5 select-none">
      
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 text-indigo-400 shrink-0 shadow">
            <MousePointer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white">Espace Contrôle PC depuis Smartphone</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Liaison Prête
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Manipulez le curseur, les clics, les présentations et la saisie de texte depuis votre téléphone
            </p>
          </div>
        </div>

        {/* Live Cursor Diagnostics Pill */}
        <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-2xl border border-slate-800 text-xs">
          <Smartphone className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="text-left">
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Position Curseur</div>
            <div className="font-mono text-xs text-indigo-300 font-bold">
              X: {Math.round(remoteCursor.x)}% • Y: {Math.round(remoteCursor.y)}%
            </div>
          </div>
          <div className="h-6 w-px bg-slate-800 mx-1" />
          <div className="text-left">
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Clics Reçus</div>
            <div className="font-mono text-xs text-emerald-400 font-bold">{clickCount}</div>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex rounded-2xl bg-slate-950 p-1.5 border border-slate-800 text-xs overflow-x-auto gap-1">
        <button
          id="btn-workspace-tab-interactive"
          onClick={() => setActiveSubTab('interactive')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'interactive' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Atelier Interactif & Clics</span>
        </button>

        <button
          id="btn-workspace-tab-presentation"
          onClick={() => setActiveSubTab('presentation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'presentation' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <SkipForward className="w-3.5 h-3.5 text-indigo-400" />
          <span>Diaporama & Présentation</span>
        </button>

        <button
          id="btn-workspace-tab-media"
          onClick={() => setActiveSubTab('media')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'media' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          <span>Lecteur Multimédia & Son</span>
        </button>

        <button
          id="btn-workspace-tab-terminal"
          onClick={() => setActiveSubTab('terminal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'terminal' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-purple-400" />
          <span>Bloc-notes & Clavier</span>
        </button>

        <button
          id="btn-workspace-tab-native"
          onClick={() => setActiveSubTab('native_os')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'native_os' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-300 hover:text-white'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>Piloter tout Windows / Mac (Pont OS)</span>
        </button>
      </div>

      {/* SUB TAB 1: INTERACTIVE ARENA & CLICKS */}
      {activeSubTab === 'interactive' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Interactive Stage */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <MousePointer className="w-4 h-4 text-indigo-400" />
                    Zone de Test du Curseur & Clics en Direct
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Faites glisser votre doigt sur le trackpad de votre téléphone pour déplacer le curseur bleu ci-dessus
                  </p>
                </div>
                <button
                  onClick={() => {
                    setTargetHits(0);
                    setClickCount(0);
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs flex items-center gap-1"
                  title="Réinitialiser"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Réinitialiser</span>
                </button>
              </div>

              {/* Target Buttons to test clicks */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  id="target-btn-1"
                  onClick={() => {
                    setTargetHits((h) => h + 1);
                    soundEngine.playTapSound();
                    onActionFeedback?.('🎯 Cible 1 activée par le clic !');
                  }}
                  className="p-4 rounded-2xl bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/30 text-left space-y-1 transition-all active:scale-95"
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                  <p className="text-xs font-bold text-white">Bouton Cible A</p>
                  <p className="text-[10px] text-indigo-300">Touchez pour valider</p>
                </button>

                <button
                  id="target-btn-2"
                  onClick={() => {
                    setTargetHits((h) => h + 1);
                    soundEngine.playTapSound();
                    onActionFeedback?.('🎯 Cible 2 activée par le clic !');
                  }}
                  className="p-4 rounded-2xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 text-left space-y-1 transition-all active:scale-95"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <p className="text-xs font-bold text-white">Bouton Cible B</p>
                  <p className="text-[10px] text-emerald-300">Touchez pour valider</p>
                </button>

                <button
                  id="target-btn-3"
                  onClick={() => {
                    setTargetHits((h) => h + 1);
                    soundEngine.playTapSound();
                    onActionFeedback?.('🎯 Cible 3 activée par le clic !');
                  }}
                  className="p-4 rounded-2xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/30 text-left space-y-1 transition-all active:scale-95"
                >
                  <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                  <p className="text-xs font-bold text-white">Bouton Cible C</p>
                  <p className="text-[10px] text-purple-300">Touchez pour valider</p>
                </button>
              </div>

              {/* Scrollable Document Area to test 2-finger scroll */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    Zone de Test du Défilement (Défilez à 2 doigts sur mobile)
                  </span>
                  <span className="text-indigo-400 font-mono text-[11px] font-semibold">{scrollPercentage}%</span>
                </div>

                <div
                  ref={scrollContainerRef}
                  onScroll={handleScrollUpdate}
                  className="h-40 rounded-2xl bg-slate-950 border border-slate-800 p-4 overflow-y-auto space-y-3 text-xs text-slate-300 leading-relaxed custom-scrollbar shadow-inner"
                >
                  <p className="font-bold text-indigo-300">1. Défilement fluide bidirectionnel</p>
                  <p>
                    Sur l'onglet <strong>Télécommande PC</strong> de votre smartphone, posez 2 doigts sur le trackpad et glissez vers le haut ou vers le bas : cette boîte de texte défilera en temps réel.
                  </p>
                  <p className="font-bold text-emerald-300">2. Sensibilité personnalisable</p>
                  <p>
                    Vous pouvez régler la sensibilité de déplacement (1x, 1.5x, 2x, 2.5x) directement sous le trackpad virtuel sur votre téléphone pour un confort optimal.
                  </p>
                  <p className="font-bold text-purple-300">3. Clic Gauche & Clic Droit</p>
                  <p>
                    Un tap bref avec 1 doigt sur le trackpad déclenche un clic gauche. Vous disposez aussi des deux gros boutons Clic Gauche et Clic Droit pour un contrôle précis.
                  </p>
                  <p className="font-bold text-amber-300">4. Présentations professionnelles</p>
                  <p>
                    Utilisez votre smartphone comme télécommande de conférence pour avancer vos diapositives sans fil en toute liberté.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Log & Event Feed */}
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col h-[400px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  Journal des Actions Smartphone
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{eventLog.length} reçus</span>
              </div>

              <div className="flex-1 overflow-y-auto py-2 space-y-1.5 custom-scrollbar text-xs">
                {eventLog.length > 0 ? (
                  eventLog.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-300 font-medium truncate">{item.text}</span>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">{item.time}</span>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 space-y-2">
                    <Smartphone className="w-8 h-8 text-slate-700 animate-pulse" />
                    <p className="text-xs">En attente d'une action du smartphone...</p>
                    <p className="text-[11px] text-slate-600">
                      Touchez le trackpad ou appuyez sur une touche pour voir les actions défiler ici
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 2: PRESENTATION SLIDES */}
      {activeSubTab === 'presentation' && (
        <div className="space-y-4">
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden min-h-[380px] flex flex-col justify-between">
            {/* Top Slide Meta */}
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                {slides[currentSlide].badge}
              </span>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Pilotez avec les boutons</span>
                <strong className="text-indigo-400">⏮ Diapo Précédente / Diapo Suivante ⏭</strong>
                <span>sur votre smartphone</span>
              </div>
            </div>

            {/* Slide Content */}
            <div className="my-8 space-y-4 max-w-2xl">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {slides[currentSlide].title}
              </h3>
              <p className="text-base text-indigo-200 font-medium">
                {slides[currentSlide].subtitle}
              </p>

              <ul className="space-y-2.5 pt-4">
                {slides[currentSlide].bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm text-slate-300">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-500/40">
                      ✓
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Slide Navigation Controls on PC */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
              <div className="flex gap-1.5">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      currentSlide === idx ? 'w-8 bg-indigo-500' : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                    title={`Aller à la diapositive ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                  <span>Précédent</span>
                </button>
                <button
                  onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow transition-colors"
                >
                  <span>Suivant</span>
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 3: MEDIA & AUDIO PLAYER */}
      {activeSubTab === 'media' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              Lecteur Multimédia & Audio Contrôlable à Distance
            </h3>
            <span className="text-xs text-slate-400">
              Pilotez la lecture et le volume depuis l'onglet <strong>Média / Diapo</strong> du smartphone
            </span>
          </div>

          {/* Interactive Player Screen */}
          <div className="relative aspect-video max-h-72 w-full rounded-2xl bg-black border border-slate-800 flex flex-col items-center justify-center overflow-hidden group shadow-inner">
            {/* Visualizer Wave Animation */}
            <div className="flex items-end gap-1.5 h-24">
              {[40, 65, 30, 85, 95, 50, 75, 45, 90, 60, 35, 80].map((height, i) => (
                <div
                  key={i}
                  className={`w-3 rounded-full transition-all duration-300 ${
                    isPlaying 
                      ? 'bg-gradient-to-t from-indigo-500 to-emerald-400 animate-pulse' 
                      : 'bg-slate-800'
                  }`}
                  style={{ height: isPlaying ? `${height}%` : '20%' }}
                />
              ))}
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm font-bold text-white">{isPlaying ? 'Lecture en cours...' : 'En pause'}</p>
              <p className="text-xs text-slate-400 font-mono">
                Volume : {mediaMuted ? 'Muet (0%)' : `${mediaVolume}%`}
              </p>
            </div>
          </div>

          {/* Player Progress Bar & Volume Gauge */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>Progression de la piste</span>
                <span>01:24 / 03:45</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: '42%' }} />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  {mediaMuted || mediaVolume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                  Niveau sonore PC
                </span>
                <span className="font-mono font-bold text-white">{mediaMuted ? 'MUET' : `${mediaVolume}%`}</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${mediaMuted ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                  style={{ width: mediaMuted ? '0%' : `${mediaVolume}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 4: LIVE NOTEPAD & KEYBOARD */}
      {activeSubTab === 'terminal' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                Bloc-notes & Saisie Clavier en Direct
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Sur votre smartphone, allez dans l'onglet <strong>Clavier PC</strong> : tapez du texte ou appuyez sur Entrée / Effacer
              </p>
            </div>
            <button
              onClick={() => setNotepadText('')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-colors"
            >
              Effacer le bloc-notes
            </button>
          </div>

          <textarea
            value={notepadText}
            onChange={(e) => setNotepadText(e.target.value)}
            rows={8}
            className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors custom-scrollbar shadow-inner leading-relaxed"
            placeholder="Le texte envoyé depuis le smartphone s'écrira ici en direct..."
          />
        </div>
      )}

      {/* SUB TAB 5: NATIVE OS GLOBAL BRIDGE (WINDOWS / MAC) */}
      {activeSubTab === 'native_os' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              Prendre le Contrôle de tout votre Ordinateur (Windows / macOS / Linux)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              Les navigateurs web (Chrome, Edge, Safari) appliquent une politique de sécurité stricte (sandbox) interdisant aux sites web de déplacer le pointeur global de la souris en dehors du navigateur.
              Grâce à ce script compagnon ultra-léger (10 lignes Python), votre smartphone pilote directement le curseur de tout votre système d'exploitation !
            </p>
          </div>

          {/* Step by Step Guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">1</span>
              <p className="text-xs font-bold text-white">Installer les outils</p>
              <p className="text-[11px] text-slate-400 font-mono bg-slate-900 p-2 rounded-xl border border-slate-800">
                pip install websockets pyautogui
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">2</span>
              <p className="text-xs font-bold text-white">Copier le script</p>
              <p className="text-[11px] text-slate-400">
                Cliquez sur le bouton ci-dessous pour copier le script pré-configuré avec votre code de session <strong className="text-indigo-300 font-mono">{roomId}</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">3</span>
              <p className="text-xs font-bold text-white">Lancer le pont</p>
              <p className="text-[11px] text-slate-400 font-mono bg-slate-900 p-2 rounded-xl border border-slate-800">
                python remote_bridge.py
              </p>
            </div>
          </div>

          {/* Script Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Code className="w-4 h-4 text-cyan-400" />
                Script Compagnon Python (remote_bridge.py)
              </span>
              <button
                id="btn-copy-python-bridge"
                onClick={copyPythonScript}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all"
              >
                {scriptCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{scriptCopied ? 'Script copié !' : 'Copier le script Python'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-56 custom-scrollbar shadow-inner">
              {pythonScript}
            </pre>
          </div>
        </div>
      )}

    </div>
  );
};
