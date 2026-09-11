import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { 
  Smartphone, Monitor, RotateCw, Maximize2, Minimize2, 
  Camera, CircleDot, Volume2, VolumeX, Sparkles, Sliders, 
  Download, Play, Pause, RefreshCw, QrCode, Copy, Check, 
  Edit3, Trash2, MousePointer, ShieldCheck, Zap, Activity,
  ChevronLeft, Home, Square, Lock, Radio, CornerDownLeft, Laptop,
  Image as ImageIcon, Gamepad2, ScreenShare, LogOut,
  Wifi, Power, Mic, MicOff, Unlock, Flashlight
} from 'lucide-react';
import { StreamStats, LaserPointerState, AnnotationPath, RemotePcEvent, AppRole, RemotePhoneEvent, ClipboardItem, PhoneCapture } from '../types';
import { ScreenCastManager } from '../services/webrtc';
import { PhoneControlToolbar } from './PhoneControlToolbar';
import { QrCodeScannerModal } from './QrCodeScannerModal';
import { PcImageShareTab } from './PcImageShareTab';
import { PhoneCapturesGallery } from './PhoneCapturesGallery';
import { PcRemoteWorkspace } from './PcRemoteWorkspace';
import { VoiceCommandModal } from './VoiceCommandModal';
import { soundEngine } from '../utils/audioAlert';
import { voiceCommandManager } from '../utils/voiceCommandHelper';

interface ComputerReceiverProps {
  manager: ScreenCastManager | null;
  roomId: string;
  remoteStream: MediaStream | null;
  fallbackFrame: string | null;
  isStreaming: boolean;
  streamStats: StreamStats;
  laserPointer: LaserPointerState;
  onToggleClipboard: () => void;
  clipboardCount: number;
  clipboardItems?: ClipboardItem[];
  phoneCaptures?: PhoneCapture[];
  onDeleteCapture?: (id: string) => void;
  onClearAllCaptures?: () => void;
  onDisconnect?: () => void;
  onConnect?: () => void;
  isDisconnected?: boolean;
  onChangeRole?: (role: AppRole) => void;
  onJoinRoom?: (roomId: string) => void;
}

interface TouchRipple {
  id: number;
  x: number;
  y: number;
}

export const ComputerReceiver: React.FC<ComputerReceiverProps> = ({
  manager,
  roomId,
  remoteStream,
  fallbackFrame,
  isStreaming,
  streamStats,
  laserPointer,
  onToggleClipboard,
  clipboardCount,
  clipboardItems = [],
  phoneCaptures = [],
  onDeleteCapture = () => {},
  onClearAllCaptures = () => {},
  onDisconnect,
  onConnect,
  isDisconnected = false,
  onChangeRole,
  onJoinRoom,
}) => {
  const [activeTab, setActiveTab] = useState<'screen' | 'captures' | 'images' | 'remote'>('screen');
  const [showQrScanner, setShowQrScanner] = useState<boolean>(false);
  const [isPcBroadcasting, setIsPcBroadcasting] = useState<boolean>(false);
  const [pcBroadcastError, setPcBroadcastError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const phoneScreenRef = useRef<HTMLDivElement>(null);

  const handleStartPcScreenShare = async () => {
    setPcBroadcastError(null);
    try {
      if (!manager) return;
      await manager.startScreenCapture('1080p', true);
      setIsPcBroadcasting(true);
      showActionToast('🖥️ Diffusion de votre écran PC vers le smartphone démarrée !');
    } catch (err: any) {
      console.error('Failed to share PC screen:', err);
      if (err.name !== 'NotAllowedError' && err.name !== 'PermissionDeniedError') {
        setPcBroadcastError(err.message || 'Impossible de démarrer le partage d\'écran PC.');
      }
    }
  };

  const handleStopPcScreenShare = () => {
    if (manager) {
      manager.stopStream();
    }
    setIsPcBroadcasting(false);
    showActionToast('⏹️ Diffusion de l\'écran PC arrêtée.');
  };

  // Display Settings
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [phoneFrameStyle, setPhoneFrameStyle] = useState<'iphone' | 'android' | 'borderless'>('iphone');
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showAdjustments, setShowAdjustments] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [mirrorCustomImage, setMirrorCustomImage] = useState<string | null>(null);
  const [newCaptureToast, setNewCaptureToast] = useState<PhoneCapture | null>(null);
  const prevCapturesCountRef = useRef<number>(phoneCaptures.length);

  // Screen Lock & Voice Command State
  const [isPhoneScreenLocked, setIsPhoneScreenLocked] = useState<boolean>(false);
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [lastVoiceCommandToast, setLastVoiceCommandToast] = useState<string | null>(null);

  // Execute Voice Command on Computer
  const executeVoiceAction = (commandId: string) => {
    soundEngine.playTapSound();
    switch (commandId) {
      case 'capture':
        takeScreenshot();
        showActionToast('📸 Capture d\'écran enregistrée !', 'camera');
        break;
      case 'next_slide':
        showActionToast('⏭️ Diapositive suivante');
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        break;
      case 'prev_slide':
        showActionToast('⏮️ Diapositive précédente');
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        break;
      case 'fullscreen':
        toggleFullscreen();
        showActionToast('🖥️ Plein écran basculé');
        break;
      case 'pause_resume':
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
            showActionToast('▶️ Lecture reprise');
          } else {
            videoRef.current.pause();
            showActionToast('⏸️ Lecture mise en pause');
          }
        }
        break;
      case 'volume_up':
        setVolume((v) => Math.min(1, Number((v + 0.2).toFixed(1))));
        setIsMuted(false);
        showActionToast('🔊 Volume augmenté');
        break;
      case 'volume_down':
        setVolume((v) => Math.max(0, Number((v - 0.2).toFixed(1))));
        showActionToast('🔉 Volume diminué');
        break;
      case 'mute_toggle':
        setIsMuted((m) => !m);
        showActionToast(isMuted ? '🔊 Son rétabli' : '🔇 Son coupé');
        break;
      case 'click_action':
        setRemoteCursor((prev) => ({ ...prev, isClicking: true, visible: true, clickType: 'left', lastAction: 'click' }));
        setTimeout(() => {
          setRemoteCursor((prev) => ({ ...prev, isClicking: false }));
        }, 250);
        showActionToast('🖱️ Clic souris simulé');
        break;
      case 'flash_on':
        manager?.sendRemotePhoneEvent({ type: 'torch', text: 'on' });
        showActionToast('💡 Ordre d\'allumer la torche transmis au smartphone');
        break;
      case 'flash_off':
        manager?.sendRemotePhoneEvent({ type: 'torch', text: 'off' });
        showActionToast('🌑 Ordre d\'éteindre la torche transmis au smartphone');
        break;
      case 'flash_toggle':
        manager?.sendRemotePhoneEvent({ type: 'torch', text: 'toggle' });
        showActionToast('💡 Commande Flash transmise au smartphone');
        break;
      case 'flip_camera':
        manager?.sendRemotePhoneEvent({ type: 'camera_snap' });
        showActionToast('📷 Commande caméra transmise au smartphone');
        break;
      default:
        break;
    }
  };

  const executeVoiceActionRef = useRef(executeVoiceAction);
  useEffect(() => {
    executeVoiceActionRef.current = executeVoiceAction;
  });

  // Wire Voice Command subscription for local PC speech input
  useEffect(() => {
    const unsubVoiceHandler = voiceCommandManager.registerHandler((commandId: string) => {
      executeVoiceActionRef.current(commandId);
    });

    const unsubVoice = voiceCommandManager.subscribe((state) => {
      setIsVoiceListening(state.isListening);
      if (state.lastCommand) {
        setLastVoiceCommandToast(state.lastCommand);
        setTimeout(() => setLastVoiceCommandToast(null), 3500);
      }
    });

    return () => {
      unsubVoiceHandler();
      unsubVoice();
    };
  }, []);

  // Monitor incoming captures to display toast notification if on other tab
  useEffect(() => {
    if (phoneCaptures.length > prevCapturesCountRef.current) {
      const latest = phoneCaptures[0];
      if (latest) {
        setNewCaptureToast(latest);
        setTimeout(() => setNewCaptureToast(null), 5000);
      }
    }
    prevCapturesCountRef.current = phoneCaptures.length;
  }, [phoneCaptures]);

  // Remote PC Control from Phone (Simulated Cursor & Actions)
  const [remoteCursor, setRemoteCursor] = useState<{ 
    x: number; 
    y: number; 
    visible: boolean; 
    isClicking: boolean;
    clickType?: 'left' | 'right';
    lastAction?: string;
  }>({
    x: 50,
    y: 50,
    visible: false,
    isClicking: false,
  });
  const [lastRemoteEvent, setLastRemoteEvent] = useState<RemotePcEvent | null>(null);
  const [remoteSubTab, setRemoteSubTab] = useState<'pc_workspace' | 'phone_control'>('pc_workspace');
  const [remoteActionToast, setRemoteActionToast] = useState<{ text: string; icon?: string } | null>(null);
  const [touchRipples, setTouchRipples] = useState<TouchRipple[]>([]);
  const [phoneFeedbackBanner, setPhoneFeedbackBanner] = useState<string | null>(null);

  // Annotations
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [drawColor, setDrawColor] = useState<string>('#ef4444');
  const [drawSize, setDrawSize] = useState<number>(4);
  const [paths, setPaths] = useState<AnnotationPath[]>([]);

  // Recording
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Toast notification helper
  const showActionToast = (text: string, icon?: string) => {
    setRemoteActionToast({ text, icon });
    setTimeout(() => setRemoteActionToast(null), 2500);
  };

  // Wire WebRTC remote control callbacks
  useEffect(() => {
    if (!manager) return;

    manager.updateCallbacks({
      onRemotePcEvent: (event: RemotePcEvent) => {
        setLastRemoteEvent(event);
        switch (event.action) {
          case 'mouse_move': {
            setRemoteCursor((prev) => {
              let nextX = prev.x;
              let nextY = prev.y;
              if (event.x !== undefined && event.y !== undefined) {
                nextX = Math.max(1, Math.min(99, event.x));
                nextY = Math.max(1, Math.min(99, event.y));
              } else {
                const deltaX = event.deltaX || 0;
                const deltaY = event.deltaY || 0;
                nextX = Math.max(1, Math.min(99, prev.x + deltaX * 0.28));
                nextY = Math.max(1, Math.min(99, prev.y + deltaY * 0.28));
              }
              return { x: nextX, y: nextY, visible: true, isClicking: false, lastAction: 'move' };
            });
            break;
          }

          case 'mouse_click': {
            setRemoteCursor((prev) => {
              let curX = prev.x;
              let curY = prev.y;
              if (event.x !== undefined && event.y !== undefined) {
                curX = Math.max(1, Math.min(99, event.x));
                curY = Math.max(1, Math.min(99, event.y));
              }
              return { ...prev, x: curX, y: curY, isClicking: true, visible: true, clickType: 'left', lastAction: 'click' };
            });
            soundEngine.playTapSound();
            showActionToast('🖱️ Clic Gauche reçu du Téléphone');
            setTimeout(() => {
              setRemoteCursor((prev) => ({ ...prev, isClicking: false }));
            }, 250);
            break;
          }

          case 'mouse_right_click': {
            setRemoteCursor((prev) => ({ ...prev, isClicking: true, visible: true, clickType: 'right', lastAction: 'right_click' }));
            soundEngine.playTapSound();
            showActionToast('🖱️ Clic Droit reçu du Téléphone');
            setTimeout(() => {
              setRemoteCursor((prev) => ({ ...prev, isClicking: false }));
            }, 250);
            break;
          }

          case 'mouse_double_click': {
            setRemoteCursor((prev) => ({ ...prev, isClicking: true, visible: true, clickType: 'left', lastAction: 'double_click' }));
            soundEngine.playTapSound();
            showActionToast('🖱️ Double-clic reçu du Téléphone');
            setTimeout(() => {
              setRemoteCursor((prev) => ({ ...prev, isClicking: false }));
            }, 250);
            break;
          }

          case 'mouse_scroll': {
            showActionToast(`📜 Défilement Mobile (${event.deltaY && event.deltaY > 0 ? 'Bas' : 'Haut'})`);
            break;
          }

          case 'ping_test': {
            soundEngine.playTapSound();
            showActionToast('🔔 Signal de test reçu du Téléphone !');
            break;
          }

          case 'key_press': {
            soundEngine.playTapSound();
            showActionToast(`⌨️ Touche PC : ${event.key}`);
            break;
          }

          case 'type_text': {
            soundEngine.playTapSound();
            showActionToast(`📝 Saisie reçue : "${event.text}"`);
            break;
          }

          case 'media_play_pause': {
            showActionToast('⏯️ Multimédia : Lecture / Pause');
            break;
          }

          case 'media_next': {
            showActionToast('⏭️ Diapo / Piste Suivante');
            break;
          }

          case 'media_prev': {
            showActionToast('⏮️ Diapo / Piste Précédente');
            break;
          }

          case 'media_vol_up': {
            showActionToast('🔊 Volume PC augmenté');
            break;
          }

          case 'media_vol_down': {
            showActionToast('🔉 Volume PC diminué');
            break;
          }

          case 'media_mute': {
            showActionToast('🔇 Son PC coupé');
            break;
          }

          case 'fullscreen_toggle': {
            toggleFullscreen();
            showActionToast('🖥️ Plein écran basculé');
            break;
          }
        }
      },

      onPhoneFeedback: (data) => {
        if (data.feedbackType === 'photo_captured') {
          showActionToast('📸 Photo capturée par le smartphone !', 'photo');
        } else if (data.feedbackType === 'screen-state') {
          const isLocked = !!data.payload?.locked;
          setIsPhoneScreenLocked(isLocked);
          if (isLocked) {
            showActionToast('🔒 Téléphone verrouillé / en veille — Flux continu maintenu');
          } else {
            showActionToast('🔓 Téléphone actif & déverrouillé');
          }
        }
      },

      onVoiceCommand: (data) => {
        showActionToast(`🎙️ Commande vocale reçue : « ${data.label} »`);
        executeVoiceActionRef.current(data.commandId);
      }
    });
  }, [manager]);

  // Update video element with remote stream
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current.play().catch((err) => {
        console.warn('Auto-play was blocked or waiting for user interaction:', err);
      });
    }
  }, [remoteStream]);

  // Handle fallback canvas frame rendering
  useEffect(() => {
    const frameSource = fallbackFrame || mirrorCustomImage;
    if (frameSource && !remoteStream && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) {
          canvasRef.current.width = img.width;
          canvasRef.current.height = img.height;
          ctx.drawImage(img, 0, 0);
        }
      };
      img.src = frameSource;
    }
  }, [fallbackFrame, mirrorCustomImage, remoteStream]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((e) => console.error(e));
    } else {
      document.exitFullscreen().catch((e) => console.error(e));
    }
  };

  const rotateScreen = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Remote Phone Touch Event Emitter (PC clicks on Phone Screen)
  const handlePhoneScreenTouch = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!phoneScreenRef.current) return;
    const rect = phoneScreenRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    // Send touch event to phone
    if (manager) {
      manager.sendRemotePhoneEvent({
        action: 'touch_tap',
        x,
        y,
        timestamp: Date.now(),
      });
    }

    // Add visual optical touch ripple
    const rippleId = Date.now() + Math.random();
    setTouchRipples((prev) => [...prev, { id: rippleId, x, y }]);
    setTimeout(() => {
      setTouchRipples((prev) => prev.filter((r) => r.id !== rippleId));
    }, 600);

    soundEngine.playTapSound();
  };

  const sendHardwareNav = (action: 'home' | 'back' | 'apps' | 'lock') => {
    if (manager) {
      manager.sendRemotePhoneEvent({
        action,
        timestamp: Date.now(),
      });
    }
    soundEngine.playTapSound();
    const labels = {
      home: '⏺ Accueil (Home)',
      back: '◀ Retour (Back)',
      apps: '⏹ Applications récentes',
      lock: '🔒 Verrouillage écran',
    };
    setPhoneFeedbackBanner(`Action Téléphone : ${labels[action]}`);
    setTimeout(() => setPhoneFeedbackBanner(null), 2000);
  };

  const takeScreenshot = () => {
    let canvas: HTMLCanvasElement | null = null;
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
      }
    } else if (canvasRef.current) {
      canvas = canvasRef.current;
    }

    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `screencast-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
      a.click();

      // Confetti effect
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch (e) {}
    }
  };

  const startRecording = () => {
    if (!remoteStream) return;
    recordedChunks.current = [];
    try {
      const recorder = new MediaRecorder(remoteStream, { mimeType: 'video/webm;codecs=vp8,opus' });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `enregistrement-telephone-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.error('Recording error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}&role=sender`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const phoneUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${typeof window !== 'undefined' ? window.location.pathname : ''}?room=${roomId}&role=sender`;

  // Count images shared in session
  const imageCount = clipboardItems.filter(
    (item) => item.type === 'file' && (item.fileType?.startsWith('image/') || item.fileName?.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i))
  ).length;

  return (
    <div 
      ref={containerRef}
      id="computer-receiver-view"
      className="flex-1 flex flex-col bg-slate-950 text-slate-100 relative overflow-hidden select-none"
    >
      {/* Top Receiver Toolbar */}
      <div className="h-14 px-3 sm:px-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-20 backdrop-blur-md gap-2">
        {/* Left Status, Main Tab Selector & Direct PC Share Button */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          {/* Navigation Tab Selector */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              id="tab-pc-mirror"
              onClick={() => setActiveTab('screen')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                activeTab === 'screen'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Écran Miroir</span>
              {isStreaming && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />}
            </button>

            <button
              id="tab-pc-captures"
              onClick={() => setActiveTab('captures')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                activeTab === 'captures'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>Captures Caméra</span>
              {phoneCaptures.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                  {phoneCaptures.length}
                </span>
              )}
            </button>

            <button
              id="tab-pc-image-share"
              onClick={() => setActiveTab('images')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                activeTab === 'images'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Partage d'Images (PC ➔ Téléphone)</span>
              {imageCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-indigo-300 text-[10px] font-bold border border-indigo-400/30">
                  {imageCount}
                </span>
              )}
            </button>

            <button
              id="tab-pc-remote"
              onClick={() => setActiveTab('remote')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                activeTab === 'remote'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Télécommande</span>
            </button>
          </div>

          {/* PC Screen Share to Phone button (Diffuser Écran PC ➔ Mobile) */}
          {isPcBroadcasting ? (
            <button
              id="btn-stop-pc-broadcast"
              onClick={handleStopPcScreenShare}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(244,63,94,0.4)] border-2 border-rose-400 animate-pulse"
              title="Arrêter la diffusion de l'écran PC vers le smartphone"
            >
              <ScreenShare className="w-4 h-4 shrink-0" />
              <div className="flex flex-col text-left leading-tight">
                <span>Arrêter Diffusion</span>
                <span className="text-[10px] text-rose-200 font-normal">PC ➔ Mobile</span>
              </div>
            </button>
          ) : (
            <button
              id="btn-start-pc-broadcast"
              onClick={handleStartPcScreenShare}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-[0_0_18px_rgba(139,92,246,0.6)] transition-all border-2 border-indigo-400/90 ring-1 ring-purple-400/60"
              title="Diffuser l'écran ou une fenêtre de cet ordinateur vers le smartphone connecté"
            >
              <ScreenShare className="w-4 h-4 shrink-0" />
              <div className="flex flex-col text-left leading-tight">
                <span>Diffuser Écran PC</span>
                <span className="text-[10px] text-indigo-100 font-semibold">➔ Mobile</span>
              </div>
            </button>
          )}

          {isStreaming && (
            <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>{streamStats.fps} FPS</span>
              <span className="text-slate-600">•</span>
              <span>{streamStats.latencyMs} ms</span>
            </div>
          )}
        </div>

        {/* Center / Right Action Controls - 6 Square Icon Buttons matching screenshot */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* QR Code toggle button */}
          <button
            id="btn-show-qr"
            onClick={() => setShowQrModal(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700/60"
            title="Afficher le QR code pour connecter votre smartphone"
          >
            <QrCode className="w-4 h-4 text-indigo-400" />
          </button>

          {/* Screenshot button */}
          <button
            id="btn-screenshot"
            onClick={takeScreenshot}
            disabled={!isStreaming && !fallbackFrame}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors border border-slate-700/60"
            title="Prendre une capture d'écran"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Screen Recording Button */}
          {isRecording ? (
            <button
              id="btn-stop-recording"
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold animate-pulse shadow border border-rose-400"
            >
              <CircleDot className="w-4 h-4" />
              <span>{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
            </button>
          ) : (
            <button
              id="btn-start-recording"
              onClick={startRecording}
              disabled={!remoteStream}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors border border-slate-700/60"
              title="Enregistrer l'écran en vidéo"
            >
              <CircleDot className="w-4 h-4 text-rose-400" />
            </button>
          )}

          {/* Rotation button */}
          <button
            id="btn-rotate"
            onClick={rotateScreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700/60"
            title="Faire pivoter l'écran (0°, 90°, 180°, 270°)"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Adjustments Filter Toggle */}
          <button
            id="btn-adjustments"
            onClick={() => setShowAdjustments(!showAdjustments)}
            className={`p-2 rounded-xl text-slate-200 transition-colors border border-slate-700/60 ${showAdjustments ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-800 hover:bg-slate-700'}`}
            title="Luminosité, contraste et cadre"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Fullscreen button */}
          <button
            id="btn-fullscreen"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700/60"
            title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Remote Smartphone Torch / Flash Toggle */}
          <button
            id="btn-remote-torch"
            onClick={() => {
              manager?.sendRemotePhoneEvent({ type: 'torch', text: 'toggle' });
              showActionToast('💡 Commande Torche / Flash transmise au smartphone');
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700/60"
            title="Allumer / Éteindre la torche du smartphone"
          >
            <Flashlight className="w-4 h-4 text-amber-400" />
          </button>

          {/* Voice Commands Button */}
          <button
            id="btn-receiver-voice-commands"
            onClick={() => setShowVoiceModal(true)}
            className={`p-2 rounded-xl transition-colors border ${
              isVoiceListening
                ? 'bg-rose-500 border-rose-400 text-white animate-pulse shadow-md shadow-rose-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/60'
            }`}
            title="Commandes Vocales Mains Libres (Web Speech API)"
          >
            <Mic className="w-4 h-4 text-white" />
          </button>

          {/* Bouton Arrêt Rapide Commande Vocale */}
          {isVoiceListening && (
            <button
              id="btn-receiver-stop-voice"
              onClick={() => voiceCommandManager.stop()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white border border-rose-300 text-xs font-bold shadow-md shadow-rose-600/40 animate-pulse transition-all"
              title="Arrêter immédiatement la commande vocale"
            >
              <MicOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Arrêter Micro</span>
            </button>
          )}

          {/* Phone Screen Locked / Background Stream Badge */}
          {isPhoneScreenLocked && (
            <div 
              id="phone-locked-badge"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-xs font-bold text-amber-300 animate-pulse"
              title="Le smartphone est actuellement verrouillé ou en veille, mais la transmission d'images continue sans interruption"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Téléphone Verrouillé (Flux Actif)</span>
            </div>
          )}

          {/* Voice Command feedback */}
          {lastVoiceCommandToast && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-300">
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">Vocale : <strong>{lastVoiceCommandToast}</strong></span>
            </div>
          )}

          {/* Option Connexion & Option Déconnexion Controls */}
          <div 
            id="receiver-connection-controls"
            className="flex items-center rounded-2xl bg-slate-950 p-1 border border-slate-800 gap-1 shrink-0"
          >
            {/* Option Connexion */}
            <button
              id="btn-receiver-option-connect"
              onClick={() => {
                if (isDisconnected) {
                  onConnect?.();
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                !isDisconnected
                  ? 'bg-emerald-400 text-slate-950 shadow-[0_0_12px_rgba(52,211,153,0.35)] border border-emerald-300 ring-2 ring-emerald-300/30' // CLAIR quand connecté
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 border border-emerald-300 animate-pulse font-extrabold cursor-pointer' // CLAIR / ACTIF quand déconnecté pour reconnecter
              }`}
              title={
                !isDisconnected
                  ? "Connexion active • Appareil connecté"
                  : "Cliquer pour vous connecter à la session"
              }
            >
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{!isDisconnected ? 'Connecté' : 'Connexion'}</span>
              {!isDisconnected && (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
              )}
            </button>

            {/* Option Déconnexion */}
            {onDisconnect && (
              <button
                id="btn-receiver-option-disconnect"
                onClick={() => {
                  if (!isDisconnected) {
                    onDisconnect();
                  }
                }}
                disabled={isDisconnected}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  !isDisconnected
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-md border border-rose-400/60 cursor-pointer' // CLAIR quand connecté
                    : 'bg-slate-900/90 text-slate-400 border border-slate-800/80 cursor-not-allowed' // SOMBRE quand déconnecté
                }`}
                title={
                  !isDisconnected
                    ? "Se déconnecter de la session"
                    : "Actuellement déconnecté"
                }
              >
                <Power className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {isDisconnected ? 'Déconnecté' : 'Déconnexion'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Adjustments Floating Bar */}
      {showAdjustments && (
        <div className="bg-slate-900/95 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center gap-6 text-xs text-slate-300 z-20 backdrop-blur-md">
          {/* Frame Style */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Cadre:</span>
            <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
              {(['iphone', 'android', 'borderless'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => setPhoneFrameStyle(style)}
                  className={`px-2.5 py-1 rounded-md capitalize text-[11px] font-medium transition-colors ${
                    phoneFrameStyle === style ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {style === 'borderless' ? 'Sans bordure' : style}
                </button>
              ))}
            </div>
          </div>

          {/* Brightness */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Luminosité:</span>
            <input
              type="range"
              min="50"
              max="150"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-20 accent-indigo-500"
            />
            <span className="font-mono text-[10px] w-7">{brightness}%</span>
          </div>

          {/* Contrast */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Contraste:</span>
            <input
              type="range"
              min="50"
              max="150"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-20 accent-indigo-500"
            />
            <span className="font-mono text-[10px] w-7">{contrast}%</span>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-slate-400 hover:text-white"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-20 accent-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Banner: Disconnected Notification Banner */}
      {isDisconnected && (
        <div 
          id="receiver-disconnected-banner"
          className="w-full bg-slate-950 border-b border-slate-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md z-20 animate-in fade-in"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-slate-400 flex items-center justify-center border border-slate-800 shrink-0">
              <Power className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white">Session actuellement déconnectée</p>
              <p className="text-[11px] text-slate-400">La liaison avec le téléphone est coupée. Cliquez sur Connexion pour réactiver la session.</p>
            </div>
          </div>
          {onConnect && (
            <button
              onClick={onConnect}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 border border-emerald-300 transition-all hover:scale-102"
            >
              <Wifi className="w-4 h-4 text-slate-950" />
              <span>Se Connecter</span>
            </button>
          )}
        </div>
      )}

      {/* Interactive Remote PC Action Toast Banner */}
      {remoteActionToast && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl bg-indigo-600/95 border border-indigo-400/40 text-white font-bold text-xs shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>{remoteActionToast.text}</span>
        </div>
      )}

      {phoneFeedbackBanner && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900 border border-slate-700 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-bounce">
          <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
          <span>{phoneFeedbackBanner}</span>
        </div>
      )}

      {/* Floating Toast Notification when New Phone Camera Capture is Received */}
      {newCaptureToast && activeTab !== 'captures' && (
        <div 
          onClick={() => {
            setActiveTab('captures');
            setNewCaptureToast(null);
            soundEngine.playTapSound();
          }}
          className="fixed bottom-6 right-6 z-50 p-3.5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 border border-indigo-400/60 text-white shadow-2xl backdrop-blur-md flex items-center gap-3.5 cursor-pointer hover:scale-102 hover:border-indigo-300 transition-all duration-200 animate-in slide-in-from-bottom-5 ring-4 ring-indigo-500/20"
          title="Cliquez pour ouvrir l'espace des captures"
        >
          <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center overflow-hidden border border-indigo-400/40 shrink-0">
            <img src={newCaptureToast.url} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <p className="text-xs font-bold text-white">Nouvelle capture reçue !</p>
            </div>
            <p className="text-[11px] text-indigo-300 font-medium">
              {newCaptureToast.sourceLabel || 'Caméra Téléphone'}
            </p>
            <p className="text-[10px] text-slate-400">
              Touchez ici pour consulter la galerie
            </p>
          </div>
        </div>
      )}

      {/* Tab: Dedicated Phone Camera Captures Space */}
      {activeTab === 'captures' && (
        <PhoneCapturesGallery
          captures={phoneCaptures}
          manager={manager}
          onDeleteCapture={onDeleteCapture}
          onClearAllCaptures={onClearAllCaptures}
          isPhoneConnected={isStreaming || !!fallbackFrame}
          onSelectCaptureForMirror={(url) => {
            setMirrorCustomImage(url);
            setActiveTab('screen');
            showActionToast('📸 Capture définie comme affichage miroir !');
          }}
        />
      )}

      {/* Tab 1: Image Share Tab (PC ➔ Phone) */}
      {activeTab === 'images' && (
        <PcImageShareTab
          manager={manager}
          roomId={roomId}
          isPhoneConnected={isStreaming || !!fallbackFrame}
          clipboardItems={clipboardItems}
          onImageSent={(fileName) => {
            showActionToast(`📸 "${fileName}" transmis au smartphone !`);
          }}
        />
      )}

      {/* Tab 2: Remote Control Station (PC Workspace & Phone Remote) */}
      {activeTab === 'remote' && (
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-start w-full">
          {/* Sub-tab Switcher: Control PC vs Control Phone */}
          <div className="w-full max-w-6xl px-4 pt-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex rounded-2xl bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                id="btn-subtab-pc-workspace"
                onClick={() => setRemoteSubTab('pc_workspace')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                  remoteSubTab === 'pc_workspace'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MousePointer className="w-3.5 h-3.5 text-indigo-300" />
                <span>📱 Piloter le PC depuis le Smartphone</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
              </button>

              <button
                id="btn-subtab-phone-control"
                onClick={() => setRemoteSubTab('phone_control')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                  remoteSubTab === 'phone_control'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                <span>💻 Piloter le Smartphone depuis le PC</span>
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-400">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              <span>Session : <strong className="text-indigo-300 font-mono">{roomId}</strong></span>
            </div>
          </div>

          {/* Sub-tab 1: Interactive PC Workspace */}
          {remoteSubTab === 'pc_workspace' && (
            <PcRemoteWorkspace
              manager={manager}
              roomId={roomId}
              remoteCursor={remoteCursor}
              lastEvent={lastRemoteEvent}
              onActionFeedback={(msg) => showActionToast(msg)}
            />
          )}

          {/* Sub-tab 2: Phone Control Station (Ring, Vibrate, Torch, TTS) */}
          {remoteSubTab === 'phone_control' && (
            <div className="w-full max-w-4xl p-4 sm:p-6 space-y-6">
              <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                      <Gamepad2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Station de Télécommande du Smartphone</h3>
                      <p className="text-xs text-slate-400">Contrôlez les actions matérielles et l'écran du smartphone connecté</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                    <span className={`w-2 h-2 rounded-full ${isStreaming || fallbackFrame ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span className="text-slate-300 font-semibold">{isStreaming || fallbackFrame ? 'Connecté' : 'En attente'}</span>
                  </div>
                </div>

                <PhoneControlToolbar manager={manager} isConnected={isStreaming || !!fallbackFrame} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Main Mirror Stage */}
      {activeTab === 'screen' && (
        <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden bg-radial from-slate-900 to-slate-950">
        {!isStreaming && !fallbackFrame && !mirrorCustomImage ? (
          /* Waiting / QR Connect Hero matching screenshot */
          <div className="max-w-lg w-full flex flex-col items-center justify-center text-center space-y-6 py-4">
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed font-normal">
              Scannez ce code QR avec votre téléphone pour partager son écran et le contrôler à distance en temps réel.
            </p>

            {/* QR Code Container in glowing white card */}
            <div className="p-4 sm:p-5 bg-white rounded-[28px] inline-block shadow-[0_15px_50px_rgba(99,102,241,0.3)] ring-4 ring-indigo-400/20 border border-indigo-100">
              <QRCodeSVG 
                value={phoneUrl}
                size={220}
                level="M"
                includeMargin={false}
              />
            </div>

            {/* Room Code & Link Copy */}
            <div className="w-full flex flex-col items-center space-y-4 pt-1">
              <div className="flex items-center justify-center gap-2.5">
                <span className="text-xs text-slate-400">Code de session :</span>
                <span className="px-4 py-1.5 rounded-xl bg-indigo-950/90 text-indigo-300 font-mono font-bold text-sm tracking-wider border border-indigo-500/40 shadow-inner">
                  {roomId.includes('-') ? roomId.replace('-', ' - ') : roomId}
                </span>
              </div>

              <div className="w-full max-w-sm flex flex-col gap-2">
                <button
                  id="btn-copy-mirror-link"
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors border border-slate-800 shadow"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Lien copié dans le presse-papier !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-indigo-400" />
                      <span>Copier le lien direct pour mobile</span>
                    </>
                  )}
                </button>

                {/* Scan QR with webcam option */}
                <button
                  id="btn-pc-scan-qr"
                  onClick={() => setShowQrScanner(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-slate-400 hover:text-indigo-300 text-[11px] font-medium transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Scanner un code QR avec la webcam</span>
                </button>
              </div>

              {pcBroadcastError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left max-w-sm">
                  {pcBroadcastError}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Active Screen Mirror Frame with Remote Control Tools */
          <div className="flex flex-col items-center justify-center gap-3 max-h-full">
            {/* Top Phone Control Toolbar (Ring, Vibrate, Torch, TTS, Camera) */}
            <PhoneControlToolbar 
              manager={manager} 
              isStreaming={isStreaming} 
              onActionFeedback={(msg) => {
                setPhoneFeedbackBanner(msg);
                setTimeout(() => setPhoneFeedbackBanner(null), 2500);
              }}
            />

            {/* Interactive Phone Bezel */}
            <div 
              className="relative flex items-center justify-center transition-transform duration-300"
              style={{
                transform: `rotate(${rotation}deg)`,
                filter: `brightness(${brightness}%) contrast(${contrast}%)`,
              }}
            >
              <div
                className={`relative overflow-hidden transition-all duration-300 ${
                  phoneFrameStyle === 'iphone'
                    ? 'border-[12px] border-slate-800 rounded-[48px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] bg-black ring-1 ring-slate-700/50'
                    : phoneFrameStyle === 'android'
                    ? 'border-[8px] border-slate-800 rounded-[32px] shadow-2xl bg-black ring-1 ring-slate-700/40'
                    : 'rounded-2xl shadow-2xl bg-black'
                }`}
                style={{
                  width: rotation % 180 === 0 ? 'min(80vw, 390px)' : 'min(80vw, 640px)',
                  aspectRatio: rotation % 180 === 0 ? '9 / 19.5' : '19.5 / 9',
                  maxHeight: 'calc(100vh - 220px)',
                }}
              >
                {/* iPhone Notch / Dynamic Island */}
                {phoneFrameStyle === 'iphone' && rotation % 180 === 0 && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-black rounded-full z-30 flex items-center justify-center gap-2 border border-slate-800 pointer-events-none">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-900"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  </div>
                )}

                {/* Interactive Touch Surface wrapper */}
                <div
                  ref={phoneScreenRef}
                  id="phone-mirror-touch-surface"
                  onClick={handlePhoneScreenTouch}
                  className="w-full h-full relative cursor-pointer select-none"
                  title="Cliquez n'importe où sur l'écran pour contrôler le smartphone à distance"
                >
                  {/* Video Stream Element */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    className={`w-full h-full object-contain ${!remoteStream ? 'hidden' : ''}`}
                  />

                  {/* Fallback Canvas Element */}
                  <canvas
                    ref={canvasRef}
                    className={`w-full h-full object-contain ${remoteStream ? 'hidden' : ''}`}
                  />

                  {/* Touch Ripple Visual Animations from PC clicks */}
                  {touchRipples.map((ripple) => (
                    <div
                      key={ripple.id}
                      className="absolute pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${ripple.x}%`, top: `${ripple.y}%` }}
                    >
                      <div className="w-10 h-10 rounded-full border-2 border-indigo-400 bg-indigo-500/30 animate-ping" />
                      <div className="w-4 h-4 rounded-full bg-white shadow-lg absolute inset-3" />
                    </div>
                  ))}

                  {/* Remote Laser Pointer Indicator */}
                  {laserPointer.active && (
                    <div
                      className="absolute pointer-events-none z-40 transition-all duration-75 -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${laserPointer.x}%`,
                        top: `${laserPointer.y}%`,
                      }}
                    >
                      <div className="relative">
                        <span 
                          className="absolute -inset-2 rounded-full opacity-75 animate-ping"
                          style={{ backgroundColor: laserPointer.color || '#ef4444' }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
                          style={{ backgroundColor: laserPointer.color || '#ef4444' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Android Hardware Navigation Bar at bottom of screen */}
                <div className="absolute bottom-0 inset-x-0 h-8 bg-black/90 backdrop-blur-md flex items-center justify-around px-8 z-30 border-t border-slate-800/80">
                  <button
                    id="btn-nav-back"
                    onClick={(e) => {
                      e.stopPropagation();
                      sendHardwareNav('back');
                    }}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                    title="Bouton Retour Téléphone"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    id="btn-nav-home"
                    onClick={(e) => {
                      e.stopPropagation();
                      sendHardwareNav('home');
                    }}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                    title="Bouton Accueil Téléphone"
                  >
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-current" />
                  </button>

                  <button
                    id="btn-nav-apps"
                    onClick={(e) => {
                      e.stopPropagation();
                      sendHardwareNav('apps');
                    }}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                    title="Bouton Applications Récentes Téléphone"
                  >
                    <Square className="w-3.5 h-3.5" />
                  </button>

                  <button
                    id="btn-nav-lock"
                    onClick={(e) => {
                      e.stopPropagation();
                      sendHardwareNav('lock');
                    }}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                    title="Verrouiller l'écran du smartphone"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        </div>
      )}

      {/* Global Simulated PC Cursor controlled from mobile phone trackpad */}
      {remoteCursor.visible && (
        <div
          className="fixed pointer-events-none z-[9999] transition-[left,top] duration-75 ease-out -translate-x-3 -translate-y-3 flex flex-col items-start select-none"
          style={{
            left: `${remoteCursor.x}vw`,
            top: `${remoteCursor.y}vh`,
          }}
        >
          <div className="relative">
            {/* Custom Glowing Cursor Arrow */}
            <svg
              className={`w-7 h-7 drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)] transition-transform duration-75 ${
                remoteCursor.isClicking ? 'scale-90' : 'scale-100'
              }`}
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                fill="#6366f1"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Click Ripple Wave Animation */}
            {remoteCursor.isClicking && (
              <span className="absolute -inset-3 rounded-full border-2 border-indigo-400 bg-indigo-500/40 animate-ping pointer-events-none" />
            )}
          </div>

          {/* Floating Live Badge */}
          <div className="mt-1 ml-4 px-2 py-0.5 rounded-full bg-indigo-600/95 backdrop-blur-sm text-white text-[10px] font-bold shadow-lg border border-indigo-400/40 flex items-center gap-1 whitespace-nowrap">
            <Smartphone className="w-2.5 h-2.5 text-indigo-200" />
            <span>
              {remoteCursor.isClicking
                ? remoteCursor.clickType === 'right'
                  ? '🖱️ Clic Droit'
                  : '🖱️ Clic Gauche'
                : '📱 Téléphone'}
            </span>
          </div>
        </div>
      )}

      {/* QR Code Modal Popup */}
      {showQrModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setShowQrModal(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-sm font-bold text-white">Code QR de Connexion</span>
              <button 
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner">
              <QRCodeSVG value={phoneUrl} size={200} level="M" />
            </div>

            <p className="text-xs text-slate-300">
              Scannez avec votre téléphone pour ouvrir instantanément l'émetteur d'écran et la télécommande PC.
            </p>

            <button
              onClick={handleCopyLink}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow"
            >
              {copiedLink ? 'Lien copié !' : 'Copier le lien'}
            </button>
          </div>
        </div>
      )}

      {/* QR Code Scanner Modal */}
      <QrCodeScannerModal
        isOpen={showQrScanner}
        onClose={() => setShowQrScanner(false)}
        onScanSuccess={(scannedCode) => {
          onJoinRoom?.(scannedCode);
        }}
        initialMessage="Pointez votre webcam ou importez une photo d'un code QR"
      />

      {/* Voice Commands Modal */}
      <VoiceCommandModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onTriggerCommand={executeVoiceAction}
      />
    </div>
  );
};

