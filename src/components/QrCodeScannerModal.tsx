import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  QrCode, X, Camera, SwitchCamera, Flashlight, Image as ImageIcon, 
  Check, AlertCircle, Sparkles, RefreshCw, KeyRound, ArrowRight, Zap 
} from 'lucide-react';
import jsQR from 'jsqr';
import { soundEngine } from '../utils/audioAlert';
import { torchController } from '../utils/torchHelper';

interface QrCodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (extractedRoomId: string) => void;
  initialMessage?: string;
}

export const QrCodeScannerModal: React.FC<QrCodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  initialMessage,
}) => {
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isFlashOn, setIsFlashOn] = useState<boolean>(false);
  const [hasTorchCapability, setHasTorchCapability] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [mode, setMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [detectedBox, setDetectedBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to extract clean Room ID from QR text or URL
  const extractRoomId = (rawText: string): string => {
    let text = rawText.trim();
    
    // Check if it's a URL with ?room= or #room=
    try {
      if (text.startsWith('http://') || text.startsWith('https://')) {
        const url = new URL(text);
        const roomParam = url.searchParams.get('room');
        if (roomParam) return roomParam.toUpperCase();
      }
    } catch (e) {}

    // Check regex for CAST-XXXX or plain 4-6 digits
    const castMatch = text.match(/CAST-[A-Z0-9_-]+/i);
    if (castMatch) return castMatch[0].toUpperCase();

    const numMatch = text.match(/\b\d{4,6}\b/);
    if (numMatch && text.length < 10) return `CAST-${numMatch[0]}`;

    return text.toUpperCase();
  };

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsScanning(true);
    setDetectedBox(null);

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("La caméra n'est pas accessible sur ce navigateur.");
      setIsScanning(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      // Check if hardware torch is available on the video track
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack as any).getCapabilities?.() || {};
        setHasTorchCapability('torch' in capabilities || 'fillLightMode' in capabilities);
      }
    } catch (err: any) {
      console.warn('Camera start error in QR scanner:', err);
      if (facingMode === 'environment') {
        // Fallback to any camera
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          streamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.setAttribute('playsinline', 'true');
            await videoRef.current.play();
          }
        } catch (fallbackErr: any) {
          setCameraError("Impossible d'activer la caméra. Vérifiez les autorisations.");
          setIsScanning(false);
        }
      } else {
        setCameraError("Impossible d'activer la caméra. Vérifiez les autorisations.");
        setIsScanning(false);
      }
    }
  }, [facingMode]);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (isFlashOn) {
      setIsFlashOn(false);
      const track = streamRef.current?.getVideoTracks()[0];
      torchController.setTorch(false, track);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, [isFlashOn]);

  // Triggered on Successful QR detection
  const handleSuccess = (rawCode: string) => {
    const cleanRoom = extractRoomId(rawCode);
    setScannedResult(cleanRoom);
    soundEngine.playSuccessBeep();
    soundEngine.triggerVibration([100, 50, 100]);

    // Give visual feedback for 600ms before auto-submitting
    setTimeout(() => {
      stopCamera();
      onScanSuccess(cleanRoom);
      onClose();
    }, 650);
  };

  // Continuous Frame Analysis Loop
  useEffect(() => {
    if (!isOpen || mode !== 'camera' || scannedResult) return;

    startCamera();

    let isScanningActive = true;

    const scanLoop = async () => {
      if (!isScanningActive) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // 1. Try modern BarcodeDetector API if available natively
          let detected = false;
          if ('BarcodeDetector' in window) {
            try {
              const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
              const barcodes = await barcodeDetector.detect(video);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                detected = true;
                const box = barcodes[0].boundingBox;
                if (box) {
                  setDetectedBox({
                    x: (box.x / canvas.width) * 100,
                    y: (box.y / canvas.height) * 100,
                    width: (box.width / canvas.width) * 100,
                    height: (box.height / canvas.height) * 100,
                  });
                }
                handleSuccess(barcodes[0].rawValue);
                return;
              }
            } catch (e) {
              // BarcodeDetector fallback to jsQR
            }
          }

          // 2. Fallback to ultra-reliable jsQR
          if (!detected) {
            try {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
              });

              if (code && code.data) {
                detected = true;
                // Calculate rough bounding box
                const loc = code.location;
                const minX = Math.min(loc.topLeftCorner.x, loc.bottomLeftCorner.x);
                const minY = Math.min(loc.topLeftCorner.y, loc.topRightCorner.y);
                const maxX = Math.max(loc.topRightCorner.x, loc.bottomRightCorner.x);
                const maxY = Math.max(loc.bottomLeftCorner.y, loc.bottomRightCorner.y);

                setDetectedBox({
                  x: (minX / canvas.width) * 100,
                  y: (minY / canvas.height) * 100,
                  width: ((maxX - minX) / canvas.width) * 100,
                  height: ((maxY - minY) / canvas.height) * 100,
                });

                handleSuccess(code.data);
                return;
              }
            } catch (qrErr) {
              // frame skipped
            }
          }
        }
      }

      if (isScanningActive && !scannedResult) {
        animationFrameRef.current = requestAnimationFrame(scanLoop);
      }
    };

    const timer = setTimeout(() => {
      scanLoop();
    }, 400);

    return () => {
      isScanningActive = false;
      clearTimeout(timer);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      stopCamera();
    };
  }, [isOpen, mode, facingMode, startCamera, stopCamera]);

  // Handle Image File Upload (e.g. screenshot or photo of QR code)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          handleSuccess(code.data);
        } else {
          soundEngine.playTapSound();
          alert("Aucun QR Code détecté sur cette image. Veuillez essayer avec une photo plus nette.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Toggle Torch
  const handleToggleFlash = async () => {
    const nextState = !isFlashOn;
    setIsFlashOn(nextState);
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    await torchController.setTorch(nextState, videoTrack);
  };

  // Flip Camera
  const handleFlipCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
    setIsFlashOn(false);
  };

  // Handle Manual Form Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let cleaned = manualCode.trim().toUpperCase();
    if (!cleaned) return;
    if (!cleaned.startsWith('CAST-') && /^\d+$/.test(cleaned)) {
      cleaned = `CAST-${cleaned}`;
    }
    handleSuccess(cleaned);
  };

  if (!isOpen) return null;

  return (
    <div 
      id="qr-scanner-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div 
        id="qr-scanner-modal-card"
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center border border-indigo-500/40">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Scanner le QR Code
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Direct
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {initialMessage || "Pointez vers le QR Code affiché sur l'autre appareil"}
              </p>
            </div>
          </div>

          <button
            id="btn-close-qr-scanner"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="p-2 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-1">
          <button
            id="tab-scanner-camera"
            onClick={() => setMode('camera')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'camera' 
                ? 'bg-indigo-600 text-white shadow' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Caméra en Direct</span>
          </button>

          <button
            id="tab-scanner-upload"
            onClick={() => setMode('upload')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'upload' 
                ? 'bg-indigo-600 text-white shadow' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Photo / Galerie</span>
          </button>

          <button
            id="tab-scanner-manual"
            onClick={() => setMode('manual')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'manual' 
                ? 'bg-indigo-600 text-white shadow' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Code 4 Chiffres</span>
          </button>
        </div>

        {/* Scanner Body */}
        <div className="p-4 flex-1 flex flex-col items-center justify-center min-h-[300px] overflow-hidden relative">
          
          {/* CAMERA MODE */}
          {mode === 'camera' && (
            <div className="w-full flex-1 flex flex-col items-center justify-center">
              {cameraError ? (
                <div className="text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-rose-300 font-medium">{cameraError}</p>
                  <div className="flex gap-2 justify-center pt-2">
                    <button
                      onClick={startCamera}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Réessayer
                    </button>
                    <button
                      onClick={() => setMode('manual')}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5"
                    >
                      Entrer le code
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative w-full aspect-square max-w-[280px] rounded-3xl overflow-hidden bg-black border-2 border-slate-700 shadow-inner flex items-center justify-center">
                  {/* Live Video */}
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted
                    autoPlay
                    playsInline
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* High-tech Viewfinder Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                    {/* Darkened Outer Mask */}
                    <div className="relative w-full h-full border-2 border-indigo-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                      {/* Corner Target Markers */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-indigo-400 rounded-tl-md" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-indigo-400 rounded-tr-md" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-indigo-400 rounded-bl-md" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-indigo-400 rounded-br-md" />

                      {/* Animated Laser Beam */}
                      {!scannedResult && (
                        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-[bounce_2s_infinite]" />
                      )}

                      {/* Success Box Indicator */}
                      {scannedResult && (
                        <div className="absolute inset-0 bg-emerald-500/30 border-2 border-emerald-400 rounded-2xl flex items-center justify-center animate-in zoom-in-95">
                          <div className="px-4 py-2 rounded-2xl bg-emerald-600 text-white font-mono font-black text-sm shadow-xl flex items-center gap-2">
                            <Check className="w-5 h-5" />
                            {scannedResult}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* In-view Controls: Torch & Camera Switch */}
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between px-2 pointer-events-auto">
                    <button
                      id="btn-scanner-toggle-torch"
                      type="button"
                      onClick={handleToggleFlash}
                      className={`p-2.5 rounded-2xl backdrop-blur-md transition-colors flex items-center gap-1.5 text-xs font-semibold ${
                        isFlashOn 
                          ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/40' 
                          : 'bg-black/60 hover:bg-black/80 text-amber-300 border border-white/10'
                      }`}
                      title="Allumer la torche pour éclairer"
                    >
                      <Flashlight className="w-4 h-4" />
                      <span className="text-[10px] hidden sm:inline">{isFlashOn ? 'Torche ON' : 'Torche'}</span>
                    </button>

                    <button
                      id="btn-scanner-flip-cam"
                      type="button"
                      onClick={handleFlipCamera}
                      className="p-2.5 rounded-2xl bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md transition-colors flex items-center gap-1.5 text-xs font-semibold"
                      title="Changer de caméra"
                    >
                      <SwitchCamera className="w-4 h-4" />
                      <span className="text-[10px] hidden sm:inline">Changer caméra</span>
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400 text-center mt-3">
                Placez le code QR dans le carré pour le scanner automatiquement
              </p>
            </div>
          )}

          {/* UPLOAD / GALLERY MODE */}
          {mode === 'upload' && (
            <div className="w-full flex-1 flex flex-col items-center justify-center p-4 space-y-4 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-[280px] aspect-square rounded-3xl border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/60 hover:bg-slate-950 flex flex-col items-center justify-center p-6 cursor-pointer transition-all space-y-3 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 group-hover:scale-110 flex items-center justify-center transition-transform">
                  <ImageIcon className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Importer une photo</p>
                  <p className="text-[11px] text-slate-400 mt-1">Capture d'écran ou image de votre galerie</p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white text-[11px] font-semibold shadow">
                  Choisir une photo
                </span>
              </div>
            </div>
          )}

          {/* MANUAL CODE MODE */}
          {mode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="w-full max-w-[280px] space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Entrez le code de session</h4>
                <p className="text-[11px] text-slate-400 mt-1">Visible sur l'écran récepteur (ex: 8821 ou CAST-8821)</p>
              </div>

              <input
                id="input-scanner-manual-code"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ex: 8821"
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white font-mono text-center text-lg tracking-widest focus:outline-none focus:border-indigo-500"
                autoFocus
              />

              <button
                id="btn-submit-manual-scanner"
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                <span>Rejoindre la Session</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px]">Détection automatique temps réel</span>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
