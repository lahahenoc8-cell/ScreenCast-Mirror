import React, { useState, useRef, useEffect } from 'react';
import { 
  Smartphone, ScreenShare, Camera, VideoOff, Wifi, 
  Battery, Zap, Sparkles, Sliders, CheckCircle2, AlertCircle, 
  Send, Paperclip, MousePointer, Play, Pause, RefreshCw, 
  ArrowRight, ShieldCheck, Volume2, VolumeX, Eye, Image as ImageIcon,
  Info, HelpCircle, SwitchCamera, Upload, ExternalLink, Laptop,
  Gamepad2, Bell, Vibrate, Flashlight, MessageSquare, QrCode, Monitor,
  LogOut, Trash2, Download, Check, Power, Mic, MicOff, Lock, Unlock
} from 'lucide-react';
import { VideoQuality, LaserPointerState, RemotePhoneEvent, AppRole, ClipboardItem, StreamStats, PhoneCapture } from '../types';
import { ScreenCastManager } from '../services/webrtc';
import { VirtualPhoneContent } from './VirtualPhoneContent';
import { PhoneRemotePad } from './PhoneRemotePad';
import { PhoneImageGallery } from './PhoneImageGallery';
import { PcScreenViewer } from './PcScreenViewer';
import { QrCodeScannerModal } from './QrCodeScannerModal';
import { VoiceCommandModal } from './VoiceCommandModal';
import { soundEngine } from '../utils/audioAlert';
import { torchController } from '../utils/torchHelper';
import { wakeLockHelper } from '../utils/wakeLockHelper';
import { voiceCommandManager } from '../utils/voiceCommandHelper';

interface PhoneSenderProps {
  manager: ScreenCastManager | null;
  roomId: string;
  isStreaming: boolean;
  remoteStream?: MediaStream | null;
  fallbackFrame?: string | null;
  streamStats?: StreamStats;
  onToggleClipboard: () => void;
  clipboardCount: number;
  clipboardItems?: ClipboardItem[];
  phoneCaptures?: PhoneCapture[];
  onNewCapture?: (capture: PhoneCapture) => void;
  onDeleteCapture?: (id: string) => void;
  onDisconnect?: () => void;
  onConnect?: () => void;
  isDisconnected?: boolean;
  onChangeRole?: (role: AppRole) => void;
  onJoinRoom?: (roomId: string) => void;
}

export const PhoneSender: React.FC<PhoneSenderProps> = ({
  manager,
  roomId,
  isStreaming,
  remoteStream,
  fallbackFrame,
  streamStats,
  onToggleClipboard,
  clipboardCount,
  clipboardItems = [],
  phoneCaptures = [],
  onNewCapture,
  onDeleteCapture,
  onDisconnect,
  onConnect,
  isDisconnected = false,
  onChangeRole,
  onJoinRoom,
}) => {
  const [streamSource, setStreamSource] = useState<'screen' | 'camera' | 'screenshot' | 'virtual' | null>(null);
  const [quality, setQuality] = useState<VideoQuality>('1080p');
  const [hasAudio, setHasAudio] = useState<boolean>(true);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [laserActive, setLaserActive] = useState<boolean>(false);
  const [laserColor, setLaserColor] = useState<string>('#ef4444');
  const [quickNote, setQuickNote] = useState<string>('');
  const [sentNoteSuccess, setSentNoteSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'stream' | 'pc_screen' | 'remote' | 'pc_images' | 'screenshots' | 'pointer' | 'share'>('stream');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showOsGuide, setShowOsGuide] = useState<boolean>(false);
  const [showQrScanner, setShowQrScanner] = useState<boolean>(false);

  // Screen WakeLock (Anti-Veille) & Background Stream State
  const [isWakeLockActive, setIsWakeLockActive] = useState<boolean>(false);
  const [isPhoneLockedOrHidden, setIsPhoneLockedOrHidden] = useState<boolean>(false);
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [lastVoiceCommandToast, setLastVoiceCommandToast] = useState<string | null>(null);

  // Incoming Remote Phone Actions from PC
  const [incomingActionToast, setIncomingActionToast] = useState<{ title: string; desc: string; icon?: string } | null>(null);
  const [isRinging, setIsRinging] = useState<boolean>(false);
  const [isTorchScreenOn, setIsTorchScreenOn] = useState<boolean>(false);
  const [incomingTouchRipple, setIncomingTouchRipple] = useState<{ x: number; y: number } | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const photoCameraInputRef = useRef<HTMLInputElement>(null);
  const virtualCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const virtualIntervalRef = useRef<any>(null);
  const localCameraPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Bind local camera preview when streaming
  useEffect(() => {
    if (streamSource === 'camera' && localCameraPreviewRef.current && manager) {
      const localStream = manager.getLocalStream();
      if (localStream) {
        localCameraPreviewRef.current.srcObject = localStream;
        localCameraPreviewRef.current.play().catch(() => {});
      }
    }
  }, [streamSource, cameraFacing, manager]);

  // Browser & Device detection
  const isDisplayMediaSupported = typeof navigator !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);

  const showIncomingToast = (title: string, desc: string, icon?: string) => {
    setIncomingActionToast({ title, desc, icon });
    setTimeout(() => setIncomingActionToast(null), 3500);
  };

  // Wire incoming PC -> Phone remote control commands
  useEffect(() => {
    if (!manager) return;

    manager.updateCallbacks({
      onRemotePhoneEvent: (event: RemotePhoneEvent) => {
        switch (event.action) {
          case 'touch_tap': {
            soundEngine.playTapSound();
            soundEngine.triggerVibration(20);
            if (event.x !== undefined && event.y !== undefined) {
              setIncomingTouchRipple({ x: event.x, y: event.y });
              setTimeout(() => setIncomingTouchRipple(null), 600);
            }
            showIncomingToast('👆 Clic distant PC reçu', `Position : (${Math.round(event.x || 0)}%, ${Math.round(event.y || 0)}%)`);
            break;
          }

          case 'ring': {
            if (event.text === 'start') {
              setIsRinging(true);
              soundEngine.startRingtone();
              soundEngine.triggerVibration([300, 150, 300, 150, 600]);
              showIncomingToast('🔔 Alerte Sonore Déclenchée', 'Votre ordinateur fait sonner votre smartphone !', 'bell');
            } else {
              setIsRinging(false);
              soundEngine.stopRingtone();
            }
            break;
          }

          case 'vibrate': {
            soundEngine.triggerVibration([200, 100, 200, 100, 400]);
            showIncomingToast('📳 Vibration reçue', 'Ordre de vibration envoyé depuis le PC', 'vibrate');
            break;
          }

          case 'torch': {
            const nextTorch = event.text === 'on' ? true : event.text === 'off' ? false : !isTorchScreenOn;
            setIsTorchScreenOn(nextTorch);
            soundEngine.playTapSound();

            const activeTrack = manager?.getActiveVideoTrack();
            torchController.setTorch(nextTorch, activeTrack).then((res) => {
              showIncomingToast(
                nextTorch ? '🔦 Flash / Torche Activé' : '🔦 Flash Désactivé',
                res.message || (nextTorch ? 'Torche matérielle & écran blanc actifs' : 'Torche éteinte'),
                'torch'
              );
            });
            break;
          }

          case 'speak': {
            if (event.text) {
              soundEngine.speakText(event.text);
              showIncomingToast('🗣️ Synthèse Vocale', `Énoncé : "${event.text}"`, 'speak');
            }
            break;
          }

          case 'camera_snap': {
            captureCurrentCameraFrame('Photo prise suite à la commande déclenchée depuis le PC');
            break;
          }

          case 'home': {
            soundEngine.playTapSound();
            showIncomingToast('⏺ Bouton Accueil (Home)', 'Commande matérielle exécutée');
            break;
          }

          case 'back': {
            soundEngine.playTapSound();
            showIncomingToast('◀ Bouton Retour (Back)', 'Commande matérielle exécutée');
            break;
          }

          case 'apps': {
            soundEngine.playTapSound();
            showIncomingToast('⏹ Applications récentes', 'Commande matérielle exécutée');
            break;
          }

          case 'lock': {
            soundEngine.playTapSound();
            showIncomingToast('🔒 Écran de veille', 'Smartphone verrouillé à distance');
            break;
          }
        }
      },

      onVoiceCommand: (data) => {
        showIncomingToast(`🎙️ Commande vocale : ${data.label}`, 'Reçue depuis le PC');
        handleExecuteVoiceCommandRef.current(data.commandId);
      }
    });
  }, [manager, isTorchScreenOn]);

  // Handle Anti-Veille & WakeLock toggle
  const toggleWakeLock = async () => {
    if (isWakeLockActive) {
      await wakeLockHelper.releaseWakeLock();
      setIsWakeLockActive(false);
      showIncomingToast('⚡ Anti-Veille désactivé', "L'écran pourra se mettre en veille selon vos réglages système.");
    } else {
      const success = await wakeLockHelper.requestWakeLock();
      setIsWakeLockActive(true);
      showIncomingToast('🛡️ Anti-Veille & Arrière-Plan actif', "L'écran reste allumé et la diffusion continue même si l'appareil se verrouille.");
    }
  };

  // Execute Voice Command on Phone
  const handleExecuteVoiceCommand = (commandId: string) => {
    soundEngine.playTapSound();
    switch (commandId) {
      case 'capture':
        captureCurrentCameraFrame('Photo prise par commande vocale');
        break;
      case 'next_slide':
        manager?.sendRemotePcEvent({ type: 'media_next' });
        manager?.sendVoiceCommand('next_slide', 'Diapo suivante');
        showIncomingToast('⏭️ Diapo Suivante', 'Commande vocale envoyée');
        break;
      case 'prev_slide':
        manager?.sendRemotePcEvent({ type: 'media_prev' });
        manager?.sendVoiceCommand('prev_slide', 'Diapo précédente');
        showIncomingToast('⏮️ Diapo Précédente', 'Commande vocale envoyée');
        break;
      case 'fullscreen':
        manager?.sendRemotePcEvent({ type: 'fullscreen_toggle' });
        manager?.sendVoiceCommand('fullscreen', 'Plein écran');
        showIncomingToast('🖥️ Plein Écran', 'Commande vocale envoyée');
        break;
      case 'pause_resume':
        manager?.sendRemotePcEvent({ type: 'media_play_pause' });
        manager?.sendVoiceCommand('pause_resume', 'Lecture / Pause');
        break;
      case 'flash_on': {
        const activeTrack = manager?.getActiveVideoTrack();
        setIsTorchScreenOn(true);
        torchController.setTorch(true, activeTrack).then((res) => {
          showIncomingToast('💡 Torche / Flash Allumé', res.message, 'torch');
        });
        break;
      }
      case 'flash_off': {
        const activeTrack = manager?.getActiveVideoTrack();
        setIsTorchScreenOn(false);
        torchController.setTorch(false, activeTrack).then((res) => {
          showIncomingToast('🌑 Torche / Flash Éteint', res.message, 'torch');
        });
        break;
      }
      case 'flash_toggle': {
        const nextState = !isTorchScreenOn;
        const activeTrack = manager?.getActiveVideoTrack();
        setIsTorchScreenOn(nextState);
        torchController.setTorch(nextState, activeTrack).then((res) => {
          showIncomingToast(nextState ? '💡 Torche / Flash Allumé' : '🌑 Torche / Flash Éteint', res.message, 'torch');
        });
        break;
      }
      case 'flip_camera': {
        if (streamSource === 'camera') {
          handleToggleCameraFacing();
          showIncomingToast('🔄 Caméra inversée', 'Basculé entre avant et arrière');
        } else {
          showIncomingToast('📷 Mode Caméra requis', 'Activez la caméra pour basculer');
        }
        break;
      }
      case 'volume_up':
        manager?.sendRemotePcEvent({ type: 'media_vol_up' });
        showIncomingToast('🔊 Volume Plus', 'Volume PC augmenté');
        break;
      case 'volume_down':
        manager?.sendRemotePcEvent({ type: 'media_vol_down' });
        showIncomingToast('🔉 Volume Moins', 'Volume PC diminué');
        break;
      case 'mute_toggle':
        manager?.sendRemotePcEvent({ type: 'media_mute' });
        showIncomingToast('🔇 Muet', 'Son PC coupé/rétabli');
        break;
      case 'click_action':
        manager?.sendRemotePcEvent({ type: 'mouse_click', button: 'left' });
        showIncomingToast('🖱️ Clic souris simulé', 'Exécuté sur le PC');
        break;
      case 'keep_awake':
        toggleWakeLock();
        break;
      default:
        break;
    }
  };

  const handleExecuteVoiceCommandRef = useRef(handleExecuteVoiceCommand);
  useEffect(() => {
    handleExecuteVoiceCommandRef.current = handleExecuteVoiceCommand;
  });

  // Wire wake lock and voice command listeners
  useEffect(() => {
    const unsubWakeLock = wakeLockHelper.subscribe((active) => {
      setIsWakeLockActive(active);
    });
    const unsubLock = wakeLockHelper.subscribeLockState((isLocked) => {
      setIsPhoneLockedOrHidden(isLocked);
      if (isLocked) {
        manager?.sendPhoneFeedback('screen-state', { locked: true });
      } else {
        manager?.sendPhoneFeedback('screen-state', { locked: false });
      }
    });

    const unsubVoiceHandler = voiceCommandManager.registerHandler((commandId: string) => {
      handleExecuteVoiceCommandRef.current(commandId);
    });

    const unsubVoice = voiceCommandManager.subscribe((state) => {
      setIsVoiceListening(state.isListening);
      if (state.lastCommand) {
        setLastVoiceCommandToast(state.lastCommand);
        setTimeout(() => setLastVoiceCommandToast(null), 3000);
      }
    });

    return () => {
      unsubWakeLock();
      unsubLock();
      unsubVoice();
      unsubVoiceHandler();
    };
  }, [manager]);

  const handleStartScreenShare = async () => {
    setErrorMessage(null);
    if (!isDisplayMediaSupported) {
      setErrorMessage(
        isIOS
          ? "iOS Safari ne permet pas la capture d'écran web pour des raisons de sécurité Apple. Utilisez le Mode Caméra HD, le Diffuseur de Captures d'écran ou AirPlay."
          : "Votre navigateur ne supporte pas l'API getDisplayMedia. Utilisez le Mode Caméra ou le Diffuseur de Captures ci-dessous."
      );
      return;
    }

    try {
      if (!manager) return;
      const stream = await manager.startScreenCapture(quality, hasAudio);
      setStreamSource('screen');
      setErrorMessage(null);
    } catch (err: any) {
      console.error('Screen capture error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage("L'autorisation de capture d'écran a été refusée.");
      } else {
        setErrorMessage(
          err.message || "Impossible de démarrer la capture d'écran sur ce navigateur. Essayez le mode Caméra ou le diffuseur de captures."
        );
      }
    }
  };

  const handleStartCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    setErrorMessage(null);
    try {
      if (!manager) return;
      // Ensure any local preview video is unbound before requesting stream
      if (localCameraPreviewRef.current) {
        localCameraPreviewRef.current.srcObject = null;
      }
      soundEngine.playTapSound();
      const stream = await manager.startCameraCapture(facing);
      setStreamSource('camera');
      setCameraFacing(facing);
      setErrorMessage(null);
    } catch (err: any) {
      console.error('Camera capture error:', err);
      setErrorMessage(
        err.message || "Impossible d'accéder à la caméra. Vérifiez les autorisations de votre navigateur."
      );
    }
  };

  const handleToggleCameraFacing = async () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    if (streamSource === 'camera') {
      await handleStartCamera(nextFacing);
    } else {
      setCameraFacing(nextFacing);
    }
  };

  const captureCurrentCameraFrame = (caption?: string) => {
    soundEngine.playCameraShutter();
    soundEngine.triggerVibration([60, 40, 60]);

    let dataUrl = '';
    const video = localCameraPreviewRef.current;
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      }
    } else if (fallbackFrame) {
      dataUrl = fallbackFrame;
    }

    if (dataUrl) {
      const capture: PhoneCapture = {
        id: `cap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        url: dataUrl,
        fileName: `camera-${cameraFacing}-${Date.now()}.jpg`,
        timestamp: Date.now(),
        source: cameraFacing === 'user' ? 'camera_front' : 'camera_rear',
        sourceLabel: cameraFacing === 'user' ? 'Caméra Avant (Selfie)' : 'Caméra Arrière HD',
        size: `${Math.round((dataUrl.length * 0.75) / 1024)} KB`,
        caption: caption || 'Photo capturée depuis la caméra mobile',
      };

      if (manager) {
        manager.sendPhoneCapture(capture);
        manager.sendPhoneFeedback('photo_captured', { id: capture.id, fileName: capture.fileName });
      }
      onNewCapture?.(capture);
      showIncomingToast('📸 Photo Capturée !', 'Photo HD transmise à l\'ordinateur', 'camera');
      return capture;
    } else {
      // If camera is not currently streaming, open the mobile camera snapshot input
      photoCameraInputRef.current?.click();
      return null;
    }
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>, isCameraSnapshot = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSelectedImage(dataUrl);
      setStreamSource('screenshot');

      const capture: PhoneCapture = {
        id: `cap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        url: dataUrl,
        fileName: file.name || `photo-${Date.now()}.jpg`,
        timestamp: Date.now(),
        source: isCameraSnapshot ? 'camera_rear' : 'upload',
        sourceLabel: isCameraSnapshot ? 'Photo Caméra Smartphone' : 'Capture / Image Smartphone',
        size: `${Math.round(file.size / 1024)} KB`,
        caption: isCameraSnapshot ? 'Prise directement avec la caméra du téléphone' : 'Transféré depuis le smartphone',
      };

      // Send as live mirror frame to computer and into camera captures space
      if (manager) {
        manager.sendStreamStatus('streaming', { label: `Photo: ${file.name}` });
        manager.sendFallbackFrame(dataUrl);
        manager.sendPhoneCapture(capture);
        manager.sendImageBase64(dataUrl, file.name, 'Capture / Photo diffusée depuis smartphone');
      }
      onNewCapture?.(capture);
      soundEngine.playCameraShutter();
      showIncomingToast('📸 Photo Transmise !', `"${file.name}" a été envoyé à l'ordinateur`, 'camera');
    };
    reader.readAsDataURL(file);
  };

  const handleStartVirtualPhone = () => {
    setStreamSource('virtual');

    // Create a virtual canvas stream
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 1040;
    const ctx = canvas.getContext('2d');
    virtualCanvasRef.current = canvas;

    if (virtualIntervalRef.current) clearInterval(virtualIntervalRef.current);

    virtualIntervalRef.current = setInterval(() => {
      if (!ctx || !manager) return;
      
      // Draw background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw header
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(0, 0, canvas.width, 90);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText(new Date().toLocaleTimeString(), 30, 50);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText('⚡ STREAM HD ACTIF', 30, 80);

      // Draw interactive widgets
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(30, 120, 420, 220, 24);
      ctx.fill();

      ctx.fillStyle = '#6366f1';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText('Smartphone Miroir Connecté', 50, 170);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('Flux WebRTC P2P ultra-faible latence', 50, 210);
      ctx.fillText(`Code Session: ${roomId}`, 50, 245);
      ctx.fillText(`FPS: 60 • Résolution: 1080p`, 50, 280);

      // Draw live clock bar
      const progress = (Date.now() % 4000) / 4000;
      ctx.fillStyle = '#4f46e5';
      ctx.fillRect(50, 305, 380 * progress, 8);

      // Draw demo cards
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(30, 360, 420, 60, 16);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('📱 Démo Interactive Téléphone', 50, 396);

      // Export frame
      const frame = canvas.toDataURL('image/jpeg', 0.6);
      if (manager) {
        manager.sendStreamStatus('streaming', { label: 'Virtual Phone' });
        (manager as any).ws?.send(
          JSON.stringify({
            type: 'fallback-frame',
            frame,
            timestamp: Date.now(),
            fps: 30,
          })
        );
      }
    }, 60);
  };

  const handleStopStream = () => {
    if (virtualIntervalRef.current) {
      clearInterval(virtualIntervalRef.current);
      virtualIntervalRef.current = null;
    }
    if (manager) {
      manager.stopStream();
    }
    setSelectedImage(null);
    setStreamSource(null);
  };

  const handlePointerPadTouch = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (!manager) return;
    const rect = e.currentTarget.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

    manager.sendPointer(x, y, true, laserColor);
  };

  const handlePointerPadEnd = () => {
    if (manager) {
      manager.sendPointer(0, 0, false, laserColor);
    }
  };

  const handleSendQuickNote = () => {
    if (!quickNote.trim() || !manager) return;
    manager.sendClipboard(quickNote.trim(), 'Note depuis mobile');
    setQuickNote('');
    setSentNoteSuccess(true);
    setTimeout(() => setSentNoteSuccess(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0] && manager) {
      manager.sendFile(files[0]);
    }
  };

  return (
    <div 
      id="phone-sender-view"
      className="flex-1 flex flex-col bg-slate-950 text-slate-100 max-w-lg mx-auto w-full border-x border-slate-800 shadow-2xl relative overflow-hidden"
    >
      {/* Incoming Touch Ripple Feedback from PC */}
      {incomingTouchRipple && (
        <div 
          className="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${incomingTouchRipple.x}%`, top: `${incomingTouchRipple.y}%` }}
        >
          <div className="w-16 h-16 rounded-full border-4 border-indigo-400 bg-indigo-500/40 animate-ping" />
        </div>
      )}

      {/* Siren Ring Alert Overlay */}
      {isRinging && (
        <div className="bg-rose-600 text-white px-4 py-3 z-40 flex items-center justify-between shadow-xl animate-bounce">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 animate-spin" />
            <span className="text-xs font-bold">ALERTE SONNERIE EN COURS DÉCLENCHÉE PAR LE PC</span>
          </div>
          <button
            onClick={() => {
              setIsRinging(false);
              soundEngine.stopRingtone();
            }}
            className="px-3 py-1 bg-white text-rose-700 rounded-lg text-xs font-black shadow"
          >
            Arrêter
          </button>
        </div>
      )}

      {/* Floating Incoming PC Action Notification */}
      {incomingActionToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl bg-slate-900/95 border border-indigo-500/50 text-white shadow-2xl backdrop-blur-md flex items-start gap-3 max-w-sm w-[90%] animate-in fade-in slide-in-from-top-4">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow">
            <Zap className="w-4 h-4 text-amber-300" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-white">{incomingActionToast.title}</p>
            <p className="text-[11px] text-slate-300">{incomingActionToast.desc}</p>
          </div>
        </div>
      )}

      {/* Hidden File, Photo Camera, and Screenshot Inputs */}
      <input 
        ref={screenshotInputRef} 
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleScreenshotUpload} 
      />
      <input 
        ref={photoCameraInputRef} 
        type="file" 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        onChange={(e) => handleScreenshotUpload(e, true)} 
      />
      <input 
        ref={fileInputRef} 
        type="file" 
        className="hidden" 
        onChange={handleFileUpload} 
      />

      {/* Top Header Mobile */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shrink-0">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white">Émetteur & Télécommande</h2>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${isStreaming || streamSource === 'virtual' || streamSource === 'screenshot' ? 'bg-emerald-400 animate-ping' : 'bg-indigo-400'}`} />
              <span>Session: <strong className="text-indigo-300 font-mono">{roomId}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Controls: Option Connexion & Option Déconnexion */}
        <div 
          id="phone-connection-controls"
          className="flex items-center rounded-2xl bg-slate-950 p-1 border border-slate-800 gap-1.5 shrink-0"
        >
          {!isDisconnected ? (
            <>
              {/* Statut Connecté */}
              <div
                id="badge-phone-connected"
                className="px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                title="Connexion active • Appareil synchronisé"
              >
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Connecté</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>

              {/* Option Déconnexion */}
              {onDisconnect && (
                <button
                  id="btn-phone-option-disconnect"
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 cursor-pointer"
                  title="Quitter et déconnecter la session"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Déconnexion</span>
                </button>
              )}
            </>
          ) : (
            <>
              {/* Option Connexion */}
              <button
                id="btn-phone-option-connect"
                onClick={() => onConnect?.()}
                className="px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md border border-emerald-300 animate-pulse font-extrabold cursor-pointer"
                title="Cliquer pour vous connecter à la session"
              >
                <Wifi className="w-3.5 h-3.5 text-slate-950" />
                <span>Se connecter</span>
              </button>

              {/* Statut Déconnecté */}
              <div 
                id="badge-phone-disconnected"
                className="hidden xs:flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400"
                title="Actuellement déconnecté"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>Déconnecté</span>
              </div>
            </>
          )}

          {/* Bouton Anti-Veille / Diffuser même verrouillé */}
          <button
            id="btn-phone-toggle-wakelock"
            onClick={toggleWakeLock}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
              isWakeLockActive
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30'
                : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800'
            }`}
            title={isWakeLockActive ? "Anti-Veille actif : l'écran ne s'éteindra pas et la diffusion continue même verrouillé" : "Activer le mode Anti-Veille pour empêcher le téléphone de s'éteindre"}
          >
            {isWakeLockActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden xs:inline">{isWakeLockActive ? 'Anti-Veille : ON' : 'Anti-Veille'}</span>
          </button>

          {/* Bouton Commandes Vocales / Arrêt Rapide Commande Vocale */}
          {isVoiceListening ? (
            <button
              id="btn-phone-stop-voice-direct"
              onClick={(e) => {
                e.stopPropagation();
                voiceCommandManager.stop();
              }}
              className="px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all bg-rose-600 hover:bg-rose-500 text-white border border-rose-300 shadow-md shadow-rose-600/40 animate-pulse"
              title="Arrêter immédiatement la reconnaissance vocale"
            >
              <MicOff className="w-3.5 h-3.5" />
              <span>Arrêter Voix</span>
            </button>
          ) : (
            <button
              id="btn-phone-voice-commands"
              onClick={() => setShowVoiceModal(true)}
              className="px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border bg-indigo-600/90 hover:bg-indigo-600 text-white border-indigo-400/50"
              title="Ouvrir les commandes vocales"
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Voix</span>
            </button>
          )}
        </div>

        {/* Status Indicators: Anti-Veille, Écran Verrouillé & Commandes Vocales */}
        {isWakeLockActive && (
          <div className="w-full px-3 py-1.5 rounded-xl bg-indigo-950/70 border border-indigo-500/30 flex items-center justify-between text-[11px] text-indigo-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span><strong>Diffusion continue & Anti-Veille :</strong> le flux reste actif même si le téléphone est posé ou verrouillé.</span>
            </div>
            <span className="bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded text-[10px] font-mono shrink-0">Actif</span>
          </div>
        )}

        {isPhoneLockedOrHidden && (
          <div className="w-full px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center gap-2 text-[11px] text-amber-300 animate-pulse">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Téléphone verrouillé / en arrière-plan : la connexion et la transmission restent maintenues !</span>
          </div>
        )}

        {lastVoiceCommandToast && (
          <div className="w-full px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center gap-2 text-[11px] text-emerald-300 animate-in slide-in-from-top-1">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Commande vocale reconnue : <strong>« {lastVoiceCommandToast} »</strong></span>
          </div>
        )}

        {/* Tab switchers */}
        <div className="w-full flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs overflow-x-auto gap-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('stream')}
            className={`shrink-0 px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap text-[11px] ${
              activeTab === 'stream' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400'
            }`}
          >
            Diffusion
          </button>
          <button
            id="tab-phone-view-pc-screen"
            onClick={() => setActiveTab('pc_screen')}
            className={`shrink-0 px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
              activeTab === 'pc_screen' ? 'bg-indigo-600 text-white shadow' : 'text-indigo-300 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-indigo-400" />
            <span>Écran PC</span>
            {(remoteStream || fallbackFrame) && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('remote')}
            className={`shrink-0 px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap text-[11px] flex items-center gap-1 ${
              activeTab === 'remote' ? 'bg-indigo-600 text-white shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3 h-3 text-amber-400" />
            <span>Télécommande PC</span>
          </button>
          <button
            onClick={() => setActiveTab('pc_images')}
            className={`shrink-0 px-2 py-1 rounded-lg font-bold transition-colors whitespace-nowrap text-[11px] flex items-center gap-1 ${
              activeTab === 'pc_images' ? 'bg-indigo-600 text-white shadow' : 'text-indigo-300 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3 h-3 text-indigo-400" />
            <span>Images PC</span>
            {clipboardItems.filter(i => i.type === 'file' && (i.fileType?.startsWith('image/') || i.fileName?.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i))).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/40 text-white text-[9px] font-bold">
                {clipboardItems.filter(i => i.type === 'file' && (i.fileType?.startsWith('image/') || i.fileName?.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i))).length}
              </span>
            )}
          </button>
          <button
            id="tab-phone-captures"
            onClick={() => setActiveTab('screenshots')}
            className={`shrink-0 px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
              activeTab === 'screenshots' ? 'bg-indigo-600 text-white shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>Captures<span className="hidden xs:inline"> Caméra</span></span>
            {phoneCaptures.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-300 text-[9px] font-bold border border-emerald-500/40">
                {phoneCaptures.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('share')}
            className={`shrink-0 px-2 py-1 rounded-lg font-medium transition-colors whitespace-nowrap text-[11px] ${
              activeTab === 'share' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400'
            }`}
          >
            Fichiers
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Banner: Disconnected Warning Banner */}
        {isDisconnected && (
          <div 
            id="phone-disconnected-banner"
            className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-950 text-slate-400 flex items-center justify-center border border-slate-800 shrink-0">
                <Power className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-white">Session Déconnectée</p>
                <p className="text-[10px] text-slate-400">Touchez Connexion pour réactiver la liaison avec le PC.</p>
              </div>
            </div>
            {onConnect && (
              <button
                onClick={onConnect}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md border border-emerald-300 shrink-0 flex items-center gap-1"
              >
                <Wifi className="w-3.5 h-3.5 text-slate-950" />
                <span>Connexion</span>
              </button>
            )}
          </div>
        )}
        
        {/* Banner: Remote PC Screen Broadcast Alert */}
        {(remoteStream || fallbackFrame) && activeTab !== 'pc_screen' && (
          <div className="p-3 bg-gradient-to-r from-indigo-900/90 via-purple-900/90 to-indigo-950/90 rounded-2xl border border-indigo-400/50 flex items-center justify-between text-xs text-white shadow-xl animate-pulse">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-indigo-300" />
              <span className="font-semibold text-xs">Écran de l'ordinateur en direct disponible !</span>
            </div>
            <button
              onClick={() => setActiveTab('pc_screen')}
              className="px-3 py-1 bg-white text-indigo-900 rounded-xl font-bold text-xs shadow hover:bg-indigo-50"
            >
              Voir l'écran PC
            </button>
          </div>
        )}

        {/* Audio Context Unlock Banner for mobile auto-play policy */}
        <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Session : <strong className="text-indigo-300 font-mono">{roomId}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              id="btn-phone-scan-qr-banner"
              onClick={() => setShowQrScanner(true)}
              className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1 shadow transition-colors"
              title="Scanner le QR code affiché sur l'écran du PC"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Scanner QR PC</span>
            </button>
            <button
              onClick={() => {
                soundEngine.playTapSound();
                soundEngine.triggerVibration(25);
                showIncomingToast('🔊 Audio et alertes activés', 'Votre smartphone est prêt à recevoir les sons et vibrations du PC');
              }}
              className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-slate-200 text-[11px] font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
              title="Cliquez pour autoriser la sonnerie et les alertes vocales du PC"
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Audio</span>
            </button>
          </div>
        </div>

        {/* Quick Link to Remote PC Controller */}
        {activeTab === 'stream' && (
          <div className="p-3.5 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 rounded-2xl border border-indigo-500/40 flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center border border-indigo-500/40 shrink-0">
                <Gamepad2 className="w-5 h-5 text-amber-400" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-white">Manipuler votre Ordinateur</p>
                <p className="text-[11px] text-slate-300">Trackpad tactile, clics, clavier et multimédia</p>
              </div>
            </div>
            <button
              id="btn-phone-open-remote-quick"
              onClick={() => setActiveTab('remote')}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs shrink-0 shadow flex items-center gap-1 transition-all"
            >
              <span>Ouvrir</span>
              <span className="text-sm font-bold">➔</span>
            </button>
          </div>
        )}

        {/* Device compatibility notice */}
        {!isDisplayMediaSupported && activeTab === 'stream' && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">
                  {isIOS ? "Appareil Apple iOS (iPhone / iPad)" : "Navigateur Mobile"}
                </p>
                <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                  {isIOS 
                    ? "Les navigateurs iOS bloquent la capture d'écran web directe Apple. Utilisez notre Mode Caméra HD, le Diffuseur de Captures d'écran ou la Télécommande PC ci-dessus :"
                    : "La capture d'écran globale n'est pas activée sur ce navigateur. Vous pouvez utiliser la Caméra HD, le Diffuseur de Captures ou la Télécommande PC :"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => handleStartCamera('environment')}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold text-[11px] flex items-center gap-1.5 transition-colors border border-amber-500/40"
              >
                <Camera className="w-3.5 h-3.5" />
                Mode Caméra HD
              </button>
              <button
                onClick={() => screenshotInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 font-semibold text-[11px] flex items-center gap-1.5 transition-colors border border-indigo-500/40"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Diffuser une capture
              </button>
              <button
                onClick={() => setActiveTab('remote')}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold text-[11px] flex items-center gap-1.5 shadow"
              >
                <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                Télécommande PC
              </button>
            </div>
          </div>
        )}

        {/* Error notification if any */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-200">Information de diffusion</p>
                <p className="text-[11px] text-rose-300/90 leading-relaxed">{errorMessage}</p>
              </div>
            </div>

            {/* Quick action buttons to recover */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-rose-500/20">
              <button
                onClick={() => handleStartCamera('environment')}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold text-[11px] flex items-center gap-1.5 border border-rose-500/30 transition-colors"
              >
                <RefreshCw className="w-3 h-3 text-rose-300" />
                Réessayer Caméra Arrière
              </button>
              <button
                onClick={() => handleStartCamera('user')}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow transition-colors"
              >
                <SwitchCamera className="w-3 h-3 text-indigo-200" />
                Essayer Caméra Avant
              </button>
              <button
                onClick={() => photoCameraInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow transition-colors"
              >
                <Camera className="w-3 h-3 text-white" />
                Prendre une Photo Directe
              </button>
              <button
                onClick={() => screenshotInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                <ImageIcon className="w-3 h-3 text-amber-400" />
                Partager Photo Galerie
              </button>
              <button
                onClick={() => setErrorMessage(null)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-slate-200 text-[11px] font-semibold transition-colors"
              >
                Ignorer
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: STREAM CONTROLS */}
        {activeTab === 'stream' && (
          <div className="space-y-4">
            {/* Live Streaming State Card */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/30 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  État du Miroir
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isStreaming || streamSource === 'virtual' || streamSource === 'screenshot'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {isStreaming || streamSource === 'virtual' || streamSource === 'screenshot' ? '● En diffusion' : 'Inactif'}
                </span>
              </div>

              {isStreaming || streamSource === 'virtual' || streamSource === 'screenshot' ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-white">
                          Source : {
                            streamSource === 'screen' ? 'Écran partagé' : 
                            streamSource === 'camera' ? `Caméra (${cameraFacing === 'environment' ? 'Arrière (Environnement)' : 'Avant (Selfie)'})` : 
                            streamSource === 'screenshot' ? 'Capture Écran / Photo' :
                            'Écran Virtuel Démo'
                          }
                        </p>
                        <p className="text-[11px] text-slate-400">Qualité : {quality} • 60 FPS • Latence ultra-faible</p>
                      </div>
                      <button
                        onClick={handleStopStream}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-colors"
                      >
                        Arrêter
                      </button>
                    </div>

                    {streamSource === 'camera' && (
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        {/* Live local preview on phone */}
                        <div className="relative w-full h-40 bg-black rounded-xl overflow-hidden border border-slate-800">
                          <video
                            ref={localCameraPreviewRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-emerald-400 font-mono flex items-center gap-1 border border-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Aperçu {cameraFacing === 'environment' ? 'Objectif Arrière' : 'Objectif Avant'}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400">Changer d'objectif :</span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleStartCamera('environment')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                                cameraFacing === 'environment' 
                                  ? 'bg-indigo-600 text-white border-indigo-400 shadow' 
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                              }`}
                            >
                              <Camera className="w-3.5 h-3.5" />
                              Arrière
                            </button>
                            <button
                              onClick={() => handleStartCamera('user')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                                cameraFacing === 'user' 
                                  ? 'bg-indigo-600 text-white border-indigo-400 shadow' 
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                              }`}
                            >
                              <SwitchCamera className="w-3.5 h-3.5" />
                              Avant
                            </button>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800">
                          <button
                            id="btn-phone-snap-camera-photo"
                            onClick={() => captureCurrentCameraFrame()}
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all"
                            title="Prendre une photo instantanée et l'envoyer au PC"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Prendre Photo Instantanée & Envoyer au PC</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Direct QR Code Scanner */}
                  <button
                    id="btn-phone-scan-qr-action"
                    onClick={() => setShowQrScanner(true)}
                    className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/30 active:scale-[0.98]"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>📷 Scanner le QR Code de l'ordinateur (Connexion directe)</span>
                  </button>

                  {/* Primary Option: Start Screen Share */}
                  <button
                    id="btn-start-screen-share"
                    onClick={handleStartScreenShare}
                    className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-98"
                  >
                    <ScreenShare className="w-5 h-5" />
                    <span>Partager l'écran de mon téléphone</span>
                  </button>

                  {/* Dual Camera Selection buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="btn-start-rear-camera"
                      onClick={() => handleStartCamera('environment')}
                      className="py-3.5 px-3 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 text-slate-100 font-bold text-xs transition-colors flex flex-col items-center justify-center gap-1 border border-slate-700 shadow-md text-center"
                    >
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>Caméra Arrière Directe</span>
                      <span className="text-[10px] text-slate-400 font-normal">Flux vidéo continu</span>
                    </button>

                    <button
                      id="btn-start-front-camera"
                      onClick={() => handleStartCamera('user')}
                      className="py-3.5 px-3 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 text-slate-100 font-bold text-xs transition-colors flex flex-col items-center justify-center gap-1 border border-slate-700 shadow-md text-center"
                    >
                      <SwitchCamera className="w-4 h-4 text-indigo-400" />
                      <span>Caméra Avant (Selfie)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Visage & Réunion</span>
                    </button>
                  </div>

                  {/* Instant Photo Snapshot button (works on 100% of mobile browsers) */}
                  <button
                    id="btn-take-photo-direct"
                    onClick={() => photoCameraInputRef.current?.click()}
                    className="w-full py-3.5 px-4 rounded-2xl bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-200 font-bold text-xs transition-colors flex items-center justify-center gap-2.5 border border-emerald-500/40 shadow"
                  >
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>📸 Prendre une Photo & Diffuser au PC (Capture Haute Définition)</span>
                  </button>

                  {/* Screenshot Gallery Broadcaster */}
                  <button
                    id="btn-broadcast-screenshot"
                    onClick={() => screenshotInputRef.current?.click()}
                    className="w-full py-3.5 px-4 rounded-2xl bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2.5 border border-indigo-500/30"
                  >
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    <span>📁 Diffuser une image de ma galerie photo</span>
                  </button>

                  {/* View PC screen on Phone button */}
                  <button
                    id="btn-switch-to-pc-screen-view"
                    onClick={() => setActiveTab('pc_screen')}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-900/40 to-indigo-900/40 hover:from-purple-900/60 hover:to-indigo-900/60 text-indigo-200 font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-indigo-500/40 shadow"
                  >
                    <Monitor className="w-4 h-4 text-indigo-400" />
                    <span>🖥️ Voir l'Écran du PC sur ce Téléphone</span>
                  </button>

                  {/* Hardware Torch / Flashlight Button */}
                  <button
                    id="btn-phone-local-torch"
                    onClick={async () => {
                      const nextState = !isTorchScreenOn;
                      setIsTorchScreenOn(nextState);
                      soundEngine.playTapSound();
                      const activeTrack = manager?.getActiveVideoTrack();
                      const res = await torchController.setTorch(nextState, activeTrack);
                      showIncomingToast(
                        nextState ? '🔦 Torche allumée' : '🔦 Torche éteinte',
                        res.message,
                        'torch'
                      );
                    }}
                    className={`w-full py-3.5 px-4 rounded-2xl font-semibold text-xs transition-colors flex items-center justify-center gap-2.5 border shadow-md ${
                      isTorchScreenOn 
                        ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
                        : 'bg-slate-800/90 hover:bg-slate-800 text-amber-300 border-slate-700'
                    }`}
                  >
                    <Flashlight className="w-4 h-4" />
                    <span>{isTorchScreenOn ? 'Éteindre la Torche / Flash' : '🔦 Allumer la Torche (Flash LED physique)'}</span>
                  </button>

                  {/* Reverse Role: Receive PC screen on this phone */}
                  {onChangeRole && (
                    <button
                      id="btn-switch-to-receiver-role"
                      onClick={() => onChangeRole('receiver')}
                      className="w-full py-3 px-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-indigo-300 hover:text-white font-medium text-xs transition-colors flex items-center justify-center gap-2 border border-indigo-500/30"
                    >
                      <Laptop className="w-4 h-4 text-indigo-400" />
                      <span>🔄 Inverser : Recevoir l'écran du PC sur ce Téléphone</span>
                    </button>
                  )}

                  {/* Interactive Virtual Phone Demo */}
                  <button
                    id="btn-start-virtual-demo"
                    onClick={handleStartVirtualPhone}
                    className="w-full py-3 px-4 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 font-medium text-xs transition-colors flex items-center justify-center gap-2 border border-slate-800"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Lancer la démo interactive du smartphone</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quality & Audio Settings */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Qualité du flux</h3>
              
              <div className="grid grid-cols-3 gap-2">
                {(['1080p', '720p', '480p'] as VideoQuality[]).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      quality === q
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {q} {q === '1080p' ? '(HD 60fps)' : q === '720p' ? '(Fluide)' : '(Eco)'}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <span className="text-slate-300">Inclure l'audio (micro / système)</span>
                <button
                  onClick={() => setHasAudio(!hasAudio)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    hasAudio ? 'bg-indigo-600' : 'bg-slate-800'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    hasAudio ? 'right-1' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Guide trigger button */}
            <button
              onClick={() => setShowOsGuide(true)}
              className="w-full p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs text-indigo-300 hover:text-white flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2 font-medium">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                Guide : Comment diffuser son écran sur iPhone & Android ?
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB: VIEW PC SCREEN ON PHONE */}
        {activeTab === 'pc_screen' && (
          <div className="space-y-4">
            <PcScreenViewer
              manager={manager}
              remoteStream={remoteStream || null}
              fallbackFrame={fallbackFrame || null}
              streamStats={streamStats || { fps: 0, latencyMs: 0, bitrateMbps: 0, quality: 'good' }}
              isStreaming={isStreaming}
              onSendFeedback={(title, desc) => showIncomingToast(title, desc)}
            />
          </div>
        )}

        {/* TAB 2: REMOTE PC PAD (Trackpad, Keyboard, Media) */}
        {activeTab === 'remote' && (
          <div className="flex-1 flex flex-col -m-4">
            <PhoneRemotePad manager={manager} roomId={roomId} />
          </div>
        )}

        {/* TAB 3: IMAGES RECEIVED FROM PC */}
        {activeTab === 'pc_images' && (
          <div className="space-y-4">
            <PhoneImageGallery
              items={clipboardItems}
              onBroadcastImage={(imgDataUrl) => {
                setSelectedImage(imgDataUrl);
                setActiveTab('screenshots');
                manager?.sendFallbackFrame(imgDataUrl);
              }}
            />
          </div>
        )}

        {/* TAB 4: SCREENSHOTS & CAMERA CAPTURES GALLERY */}
        {activeTab === 'screenshots' && (
          <div className="space-y-4">
            {/* Action Card */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  Espace Captures & Photos Caméra
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                  {phoneCaptures.length} capture{phoneCaptures.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Prenez des photos instantanées avec la caméra de votre smartphone ou sélectionnez des captures d'écran : elles sont sauvegardées ici et diffusées immédiatement en HD sur votre PC.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {/* Button 1: Direct Photo Camera */}
                <button
                  id="btn-phone-take-photo-input"
                  onClick={() => photoCameraInputRef.current?.click()}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  Prendre une Photo Caméra
                </button>

                {/* Button 2: Import from Gallery */}
                <button
                  id="btn-phone-choose-screenshot"
                  onClick={() => screenshotInputRef.current?.click()}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
                >
                  <Upload className="w-4 h-4 text-indigo-400" />
                  Importer une Capture / Photo
                </button>
              </div>

              {/* Fast snap button if live camera stream is active */}
              {streamSource === 'camera' && (
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    id="btn-phone-fast-snap-live"
                    onClick={() => captureCurrentCameraFrame()}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 font-medium text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Capturer l'image actuelle de la caméra en direct</span>
                  </button>
                </div>
              )}
            </div>

            {/* Currently Projected Preview */}
            {selectedImage && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Image actuellement projetée sur le PC
                  </span>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:underline font-medium"
                  >
                    Arrêter la projection
                  </button>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center max-h-56">
                  <img src={selectedImage} alt="Capture projetée" className="max-h-56 object-contain" />
                </div>
              </div>
            )}

            {/* Captures Gallery Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Galerie des Captures de la Caméra</span>
                </h4>
                <span className="text-[11px] text-slate-400">
                  {phoneCaptures.length} enregistrée{phoneCaptures.length > 1 ? 's' : ''}
                </span>
              </div>

              {phoneCaptures.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {phoneCaptures.map((capture) => (
                    <div
                      key={capture.id}
                      className="group relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col transition-all hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-950/20"
                    >
                      {/* Image Thumbnail */}
                      <div className="relative aspect-[4/3] bg-black/60 overflow-hidden">
                        <img
                          src={capture.url}
                          alt={capture.sourceLabel || 'Capture'}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[9px] font-semibold text-emerald-300 border border-white/10 flex items-center gap-1">
                          <Camera className="w-2.5 h-2.5" />
                          <span>{capture.sourceLabel?.replace('Caméra ', '') || 'Caméra'}</span>
                        </div>
                        {capture.size && (
                          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[9px] font-mono text-slate-300">
                            {capture.size}
                          </div>
                        )}
                      </div>

                      {/* Info & Action Buttons */}
                      <div className="p-2.5 flex-1 flex flex-col justify-between gap-2">
                        <div className="text-[10px] text-slate-400 flex items-center justify-between">
                          <span>{new Date(capture.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-slate-500">{new Date(capture.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}</span>
                        </div>

                        <div className="flex items-center gap-1 pt-1 border-t border-slate-800/80">
                          {/* Broadcast to PC */}
                          <button
                            id={`btn-phone-broadcast-${capture.id}`}
                            onClick={() => {
                              setSelectedImage(capture.url);
                              manager?.sendFallbackFrame(capture.url);
                              showIncomingToast('🖥️ Image diffusée', 'Affichée en plein écran sur votre PC');
                            }}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition-all shadow-sm"
                            title="Diffuser sur l'ordinateur"
                          >
                            <ScreenShare className="w-3 h-3" />
                            <span>Diffuser</span>
                          </button>

                          {/* Download to phone */}
                          <a
                            href={capture.url}
                            download={`camera-snap-${capture.id}.jpg`}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Télécharger sur le téléphone"
                          >
                            <Download className="w-3 h-3" />
                          </a>

                          {/* Delete */}
                          {onDeleteCapture && (
                            <button
                              onClick={() => onDeleteCapture(capture.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Supprimer la photo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center space-y-2.5 text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-200">Aucune capture caméra pour le moment</p>
                    <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                      Cliquez sur <strong>Prendre une Photo Caméra</strong> ci-dessus pour capturer instantanément des clichés et les envoyer à votre ordinateur.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: LASER POINTER TOUCHPAD */}
        {activeTab === 'pointer' && (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Touchpad Pointeur Laser</span>
                <div className="flex items-center gap-1.5">
                  {['#ef4444', '#10b981', '#3b82f6', '#f59e0b'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setLaserColor(color)}
                      className={`w-5 h-5 rounded-full border-2 transition-transform ${
                        laserColor === color ? 'scale-125 border-white' : 'border-transparent opacity-60'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Glissez votre doigt sur la surface ci-dessous pour pointer en direct sur l'écran de votre ordinateur.
              </p>
            </div>

            {/* Touch Area */}
            <div
              id="laser-touch-area"
              onMouseMove={handlePointerPadTouch}
              onTouchMove={handlePointerPadTouch}
              onMouseUp={handlePointerPadEnd}
              onTouchEnd={handlePointerPadEnd}
              className="w-full h-72 rounded-3xl bg-slate-950 border-2 border-dashed border-indigo-500/40 flex flex-col items-center justify-center text-slate-500 select-none cursor-crosshair relative shadow-inner"
            >
              <MousePointer className="w-10 h-10 stroke-1 text-indigo-400 animate-pulse mb-2" />
              <p className="text-xs font-semibold text-slate-300">Surface tactile de pointage</p>
              <p className="text-[10px] text-slate-500 mt-1">Touchez et déplacez pour pointer sur le PC</p>
            </div>
          </div>
        )}

        {/* TAB 5: QUICK SHARE */}
        {activeTab === 'share' && (
          <div className="space-y-4">
            {/* Quick Text to PC */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-200">Envoyer du texte ou un lien au PC</h3>
              <div className="space-y-2">
                <textarea
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Écrivez un texte, un lien web ou un code à copier sur votre ordinateur..."
                  className="w-full h-24 bg-slate-950 border border-slate-800 text-xs text-white p-3 rounded-xl focus:outline-none focus:border-indigo-500 resize-none"
                />
                <button
                  onClick={handleSendQuickNote}
                  disabled={!quickNote.trim()}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow"
                >
                  {sentNoteSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Envoyé au PC !</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Envoyer au Presse-papier du PC</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick File / Photo Upload */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-200">Transférer une photo ou un fichier</h3>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950 text-slate-300 font-semibold text-xs flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <Paperclip className="w-6 h-6 text-indigo-400" />
                <span>Sélectionner une photo ou un fichier</span>
                <span className="text-[10px] text-slate-500">Transmis instantanément à l'ordinateur</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* OS Guide Modal */}
      {showOsGuide && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowOsGuide(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-5 overflow-y-auto max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Laptop className="w-4 h-4 text-indigo-400" />
                Solutions de partage d'écran mobile
              </h3>
              <button 
                onClick={() => setShowOsGuide(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* iPhone Guide */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold">
                  <Smartphone className="w-4 h-4" />
                  <span>Sur iPhone / iPad (iOS)</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Apple bloque la capture d'écran web directe dans Safari pour protéger vos mots de passe et données personnelles.
                </p>
                <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-1">
                  <li><strong>Mode Caméra HD</strong> : Utilisez l'appareil photo pour diffuser documents et démos instantanément.</li>
                  <li><strong>Diffuseur de Captures</strong> : Prenez une capture d'écran et cliquez sur "Captures" pour l'afficher en direct sur le PC.</li>
                  <li><strong>AirPlay / Câble USB</strong> : Utilisez AirPlay vers votre PC/Mac ou branchez un câble Lightning/USB-C avec QuickTime.</li>
                </ul>
              </div>

              {/* Android Guide */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                  <Smartphone className="w-4 h-4" />
                  <span>Sur Android (Samsung, Xiaomi, Pixel...)</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Sur Google Chrome Android, le partage d'écran s'ouvre avec la boîte de dialogue système si autorisé.
                </p>
                <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-1">
                  <li>Ouvrez cette page dans <strong>Google Chrome</strong> ou <strong>Firefox</strong>.</li>
                  <li>Cliquez sur "Partager l'écran" et sélectionnez "Commencer".</li>
                  <li>Vous pouvez aussi utiliser le menu <strong>Smart View / Cast</strong> rapide de votre barre de notifications Android.</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowOsGuide(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
            >
              Compris, retour à l'émetteur
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen White Flash / Torch Overlay for physical and screen maximum brightness */}
      {isTorchScreenOn && (
        <div 
          id="phone-torch-overlay"
          className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 text-black select-none animate-in fade-in duration-200"
        >
          <div className="w-24 h-24 rounded-full bg-amber-400/20 flex items-center justify-center mb-4">
            <Flashlight className="w-14 h-14 text-amber-500 animate-bounce" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-center">🔦 FLASH / TORCHE ACTIF</h2>
          <p className="text-sm text-slate-700 mt-2 text-center max-w-xs font-medium leading-relaxed">
            La torche LED matérielle de votre smartphone et le réflecteur haute luminosité sont activés.
          </p>
          <button
            id="btn-close-phone-torch"
            onClick={async () => {
              setIsTorchScreenOn(false);
              const activeTrack = manager?.getActiveVideoTrack();
              await torchController.setTorch(false, activeTrack);
            }}
            className="mt-8 px-8 py-3.5 rounded-2xl bg-black text-white font-bold text-sm shadow-2xl active:scale-95 transition-transform flex items-center gap-2"
          >
            <Flashlight className="w-4 h-4 text-amber-400" />
            <span>Éteindre la Torche</span>
          </button>
        </div>
      )}

      {/* Mobile Footer Status */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Chiffrement direct P2P</span>
        </div>
        <button
          onClick={onToggleClipboard}
          className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium"
        >
          <span>Presse-papier ({clipboardCount})</span>
        </button>
      </div>

      {/* QR Code Scanner Interface */}
      <QrCodeScannerModal
        isOpen={showQrScanner}
        onClose={() => setShowQrScanner(false)}
        onScanSuccess={(scannedCode) => {
          onJoinRoom?.(scannedCode);
          showIncomingToast(
            '🔗 Session synchronisée',
            `Connecté avec succès au code ${scannedCode}`,
            'remote'
          );
        }}
        initialMessage="Pointez votre smartphone vers le QR Code affiché sur l'écran de votre Ordinateur"
      />

      {/* Voice Commands Modal */}
      <VoiceCommandModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onTriggerCommand={handleExecuteVoiceCommand}
      />

      {/* Disconnect Confirmation Modal */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">Confirmer la déconnexion</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Êtes-vous certain de vouloir vous déconnecter de la session <strong className="text-indigo-300 font-mono">{roomId}</strong> ? Tout flux ou partage en cours sera stoppé.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDisconnectConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Annuler
              </button>
              <button
                id="btn-confirm-phone-disconnect"
                onClick={() => {
                  setShowDisconnectConfirm(false);
                  handleStopStream();
                  onDisconnect?.();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition-colors"
              >
                Déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

