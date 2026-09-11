import { AnnotationPath, LaserPointerState, VideoQuality, RemotePhoneEvent, RemotePcEvent, PhoneCapture } from '../types';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

export interface WebRTCCallbacks {
  onRemoteStream?: (stream: MediaStream) => void;
  onFallbackFrame?: (frameData: string, fps?: number) => void;
  onStreamStatus?: (status: 'streaming' | 'paused' | 'stopped', screenInfo?: any) => void;
  onPeerJoined?: (peer: { id: string; role: string; deviceName?: string }) => void;
  onPeerLeft?: (peerId: string) => void;
  onJoined?: (data: { clientId: string; roomId: string; role: string; peers: any[] }) => void;
  onPointer?: (pointer: LaserPointerState) => void;
  onDraw?: (data: { action: 'start' | 'draw' | 'end' | 'clear'; points?: any; color?: string; size?: number }) => void;
  onClipboard?: (data: { text: string; title?: string; timestamp: number; senderId: string }) => void;
  onFileTransfer?: (data: { fileName: string; fileType: string; fileSize: string; fileData: string; senderName: string; senderId: string; caption?: string }) => void;
  onRemotePhoneEvent?: (event: RemotePhoneEvent) => void;
  onRemotePcEvent?: (event: RemotePcEvent) => void;
  onPhoneFeedback?: (data: { feedbackType: string; payload?: any }) => void;
  onPhoneCapture?: (capture: PhoneCapture) => void;
  onVoiceCommand?: (data: { commandId: string; label: string; senderRole: string }) => void;
  onLatencyUpdate?: (latencyMs: number) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onSocketStateChange?: (state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed') => void;
  onConnectionFailed?: (reason: string) => void;
}

export class ScreenCastManager {
  private ws: WebSocket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  public clientId: string = Math.random().toString(36).substring(2, 9);
  public roomId: string = '';
  public role: 'sender' | 'receiver' = 'receiver';
  public deviceName: string = '';
  private callbacks: WebRTCCallbacks = {};
  private pingInterval: any = null;
  private lastPingTime: number = 0;
  private fallbackInterval: any = null;
  private fallbackVideo: HTMLVideoElement | null = null;
  private reconnectTimeout: any = null;
  private connectTimeoutTimer: any = null;
  private consecutiveSocketFailures: number = 0;
  private isManuallyClosed: boolean = false;

  constructor(callbacks: WebRTCCallbacks) {
    this.callbacks = callbacks;
  }

  public updateCallbacks(callbacks: Partial<WebRTCCallbacks>) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public connect(roomId: string, role: 'sender' | 'receiver', deviceName?: string) {
    this.isManuallyClosed = false;
    this.roomId = roomId;
    this.role = role;
    this.deviceName = deviceName || (role === 'sender' ? 'Mobile Phone' : 'Ordinateur');

    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }

    this.callbacks.onSocketStateChange?.('connecting');

    // Timeout alert if connection takes more than 12 seconds and is not already closed or connected
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = null;
    }
    this.connectTimeoutTimer = setTimeout(() => {
      if (this.isManuallyClosed) return;
      if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
      if (this.peerConnection && (this.peerConnection.connectionState === 'connected' || this.peerConnection.iceConnectionState === 'connected')) return;

      this.callbacks.onSocketStateChange?.('failed');
      this.callbacks.onConnectionFailed?.('Délai d\'attente de connexion dépassé. Impossible de joindre le serveur relais.');
    }, 12000);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (e) {
      console.error('WebSocket init error:', e);
      this.consecutiveSocketFailures++;
      this.callbacks.onSocketStateChange?.('failed');
      this.callbacks.onConnectionFailed?.('Erreur d\'initialisation WebSocket : impossible de se connecter au réseau.');
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.consecutiveSocketFailures = 0;
      if (this.connectTimeoutTimer) {
        clearTimeout(this.connectTimeoutTimer);
        this.connectTimeoutTimer = null;
      }
      this.callbacks.onSocketStateChange?.('connected');
      this.ws?.send(
        JSON.stringify({
          type: 'join',
          roomId: this.roomId,
          role: this.role,
          deviceName: this.deviceName,
          clientId: this.clientId,
        })
      );
      this.startPing();
    };

    this.ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleSocketMessage(msg);
      } catch (e) {
        console.error('Failed to parse WS message:', e);
      }
    };

    this.ws.onclose = () => {
      this.stopPing();
      if (!this.isManuallyClosed) {
        this.consecutiveSocketFailures++;
        if (this.consecutiveSocketFailures >= 4) {
          this.callbacks.onSocketStateChange?.('failed');
          this.callbacks.onConnectionFailed?.('Impossible de se connecter au serveur de relais temps réel.');
        } else {
          this.callbacks.onSocketStateChange?.('reconnecting');
        }
        this.scheduleReconnect();
      } else {
        this.callbacks.onSocketStateChange?.('disconnected');
      }
    };

    this.ws.onerror = (err) => {
      console.warn('WebSocket error, will attempt reconnect:', err);
      this.consecutiveSocketFailures++;
      if (this.consecutiveSocketFailures >= 3) {
        this.callbacks.onSocketStateChange?.('failed');
        this.callbacks.onConnectionFailed?.('Échec de la connexion au serveur.');
      }
    };
  }

  private scheduleReconnect() {
    if (this.isManuallyClosed) return;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      if (!this.isManuallyClosed && this.roomId) {
        this.connect(this.roomId, this.role, this.deviceName);
      }
    }, 2000);
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingTime = performance.now();
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: this.lastPingTime }));
      }
    }, 2500);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private async handleSocketMessage(msg: any) {
    switch (msg.type) {
      case 'joined':
        if (this.connectTimeoutTimer) {
          clearTimeout(this.connectTimeoutTimer);
          this.connectTimeoutTimer = null;
        }
        this.callbacks.onJoined?.(msg);
        if (this.role === 'sender' && msg.peers?.some((p: any) => p.role === 'receiver')) {
          // If receivers are present and we have a stream, create offer
          if (this.localStream) {
            this.initiatePeerConnection();
          }
        }
        break;

      case 'peer-joined':
        this.callbacks.onPeerJoined?.(msg.peer);
        if (this.role === 'sender' && msg.peer.role === 'receiver' && this.localStream) {
          // A receiver joined, create WebRTC offer
          this.initiatePeerConnection(msg.peer.id);
        }
        break;

      case 'peer-left':
        this.callbacks.onPeerLeft?.(msg.peerId);
        break;

      case 'signal':
        await this.handleSignal(msg);
        break;

      case 'fallback-frame':
        this.callbacks.onFallbackFrame?.(msg.frame, msg.fps);
        break;

      case 'stream-status':
        this.callbacks.onStreamStatus?.(msg.status, msg.screenInfo);
        break;

      case 'pointer':
        this.callbacks.onPointer?.({
          x: msg.x,
          y: msg.y,
          active: msg.active,
          color: msg.color,
        });
        break;

      case 'draw':
        this.callbacks.onDraw?.(msg);
        break;

      case 'clipboard':
        this.callbacks.onClipboard?.(msg);
        break;

      case 'file-transfer':
        this.callbacks.onFileTransfer?.(msg);
        break;

      case 'remote-phone-event':
        this.callbacks.onRemotePhoneEvent?.(msg.event);
        break;

      case 'remote-pc-event':
        this.callbacks.onRemotePcEvent?.(msg.event);
        break;

      case 'phone-feedback':
        this.callbacks.onPhoneFeedback?.({ feedbackType: msg.feedbackType, payload: msg.payload });
        break;

      case 'phone-capture':
        if (msg.capture) {
          this.callbacks.onPhoneCapture?.(msg.capture);
        }
        break;

      case 'voice-command':
        if (msg.commandId) {
          this.callbacks.onVoiceCommand?.({ commandId: msg.commandId, label: msg.label, senderRole: msg.senderRole });
        }
        break;

      case 'pong':
        if (this.lastPingTime) {
          const latency = Math.round(performance.now() - this.lastPingTime);
          this.callbacks.onLatencyUpdate?.(latency);
        }
        break;
    }
  }

  private async createPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'signal',
            data: { candidate: event.candidate },
          })
        );
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection) {
        this.callbacks.onConnectionStateChange?.(this.peerConnection.connectionState);
      }
    };

    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.callbacks.onRemoteStream?.(this.remoteStream);
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream && this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });
    }

    return this.peerConnection;
  }

  public async initiatePeerConnection(targetId?: string) {
    try {
      const pc = await this.createPeerConnection();
      
      // Setup data channel
      this.dataChannel = pc.createDataChannel('screencast-data');
      this.setupDataChannel(this.dataChannel);

      const offer = await pc.createOffer({
        offerToReceiveVideo: false,
        offerToReceiveAudio: false,
      });
      await pc.setLocalDescription(offer);

      this.ws?.send(
        JSON.stringify({
          type: 'signal',
          targetId,
          data: { sdp: pc.localDescription },
        })
      );
    } catch (err) {
      console.error('Failed to initiate WebRTC offer:', err);
    }
  }

  private async handleSignal(msg: any) {
    const { data } = msg;
    if (!data) return;

    if (data.sdp) {
      if (data.sdp.type === 'offer') {
        const pc = await this.createPeerConnection();
        
        pc.ondatachannel = (e) => {
          this.dataChannel = e.channel;
          this.setupDataChannel(this.dataChannel);
        };

        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        // Flush any ICE candidates received before remoteDescription was set
        await this.flushPendingIceCandidates();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.ws?.send(
          JSON.stringify({
            type: 'signal',
            targetId: msg.senderId,
            data: { sdp: pc.localDescription },
          })
        );
      } else if (data.sdp.type === 'answer') {
        if (this.peerConnection) {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
          await this.flushPendingIceCandidates();
        }
      }
    } else if (data.candidate) {
      if (this.peerConnection && this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn('Error adding ICE candidate:', e);
        }
      } else {
        this.pendingIceCandidates.push(data.candidate);
      }
    }
  }

  private async flushPendingIceCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    while (this.pendingIceCandidates.length > 0) {
      const candidate = this.pendingIceCandidates.shift();
      if (candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('Error applying queued ICE candidate:', e);
        }
      }
    }
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'pointer') {
          this.callbacks.onPointer?.(data);
        } else if (data.type === 'draw') {
          this.callbacks.onDraw?.(data);
        } else if (data.type === 'remote-phone-event') {
          this.callbacks.onRemotePhoneEvent?.(data.event);
        } else if (data.type === 'remote-pc-event') {
          this.callbacks.onRemotePcEvent?.(data.event);
        } else if (data.type === 'voice-command') {
          this.callbacks.onVoiceCommand?.({ commandId: data.commandId, label: data.label, senderRole: data.senderRole });
        }
      } catch (err) {
        // ignore raw data
      }
    };
  }

  // SENDER METHODS: Screen Capture & Camera
  public async stopCurrentTracks() {
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {}
      });
      this.localStream = null;
    }
    // Give mobile OS hardware camera driver 200ms to release sensor lock
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  public async startScreenCapture(quality: VideoQuality = '1080p', includeAudio: boolean = true): Promise<MediaStream> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error("L'API de capture d'écran (getDisplayMedia) n'est pas disponible sur ce navigateur.");
    }

    await this.stopCurrentTracks();

    let stream: MediaStream;

    try {
      // Step 1: Try with preferred video & audio options
      const constraints: DisplayMediaStreamOptions = {
        video: {
          width: quality === '1080p' ? { ideal: 1920 } : quality === '720p' ? { ideal: 1280 } : { ideal: 854 },
          height: quality === '1080p' ? { ideal: 1080 } : quality === '720p' ? { ideal: 720 } : { ideal: 480 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: includeAudio,
      };
      stream = await navigator.mediaDevices.getDisplayMedia(constraints);
    } catch (err: any) {
      console.warn('Initial screen capture options failed, attempting resilient fallback:', err);
      try {
        // Step 2: Resilient fallback without audio and simple video constraint
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
      } catch (fallbackErr: any) {
        console.error('All getDisplayMedia attempts failed:', fallbackErr);
        throw fallbackErr;
      }
    }

    this.setLocalStream(stream);

    // Listen for user clicking native "Stop sharing" button
    if (stream.getVideoTracks()[0]) {
      stream.getVideoTracks()[0].onended = () => {
        this.stopStream();
      };
    }

    return stream;
  }

  public async startCameraCapture(facingMode: 'user' | 'environment' = 'environment', requestedDeviceId?: string): Promise<MediaStream> {
    await this.stopCurrentTracks();

    let stream: MediaStream | null = null;
    let lastError: any = null;

    // Helper delay
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Attempt 1: Standard ideal facingMode (most compatible with Android Chrome & iOS Safari)
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode === 'environment' ? 'environment' : 'user',
        },
        audio: false,
      });
    } catch (e: any) {
      lastError = e;
      console.warn('Camera Attempt 1 (simple facingMode) failed:', e);
      await delay(150);
    }

    // Attempt 2: Ideal facingMode object
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
          },
          audio: false,
        });
      } catch (e: any) {
        lastError = e;
        console.warn('Camera Attempt 2 (ideal facingMode) failed:', e);
        await delay(150);
      }
    }

    // Attempt 3: Specific device ID if requested or found via enumerateDevices
    if (!stream && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        
        let targetDev = requestedDeviceId ? videoDevices.find(d => d.deviceId === requestedDeviceId) : null;
        if (!targetDev && facingMode === 'environment') {
          targetDev = videoDevices.find((d) => /back|rear|arrière|environ|world|camera2\s*0/i.test(d.label)) 
            || (videoDevices.length > 1 ? videoDevices[videoDevices.length - 1] : null);
        } else if (!targetDev && facingMode === 'user') {
          targetDev = videoDevices.find((d) => /front|user|avant|selfie|face/i.test(d.label)) || videoDevices[0];
        }

        if (targetDev && targetDev.deviceId) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { ideal: targetDev.deviceId },
            },
            audio: false,
          });
        }
      } catch (e: any) {
        lastError = e;
        console.warn('Camera Attempt 3 (deviceId enumeration) failed:', e);
        await delay(150);
      }
    }

    // Attempt 4: Generic video (fallback to any available camera)
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (e: any) {
        lastError = e;
        console.error('Camera Attempt 4 (generic video) failed:', e);
      }
    }

    if (!stream) {
      const errorMsg = lastError?.name === 'NotReadableError'
        ? "La caméra est verrouillée par le système ou une autre application (ex: Appareil photo, WhatsApp, Instagram). Fermez les autres applications ou rechargez la page."
        : lastError?.name === 'NotAllowedError' || lastError?.name === 'PermissionDeniedError'
        ? "L'autorisation d'accès à la caméra a été refusée dans votre navigateur. Cliquez sur l'icône de cadenas 🔒 dans la barre d'adresse pour autoriser la caméra."
        : (lastError?.message || "Impossible d'accéder à la caméra.");
      throw new Error(errorMsg);
    }

    this.setLocalStream(stream);
    return stream;
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getActiveVideoTrack(): MediaStreamTrack | null {
    return this.localStream ? this.localStream.getVideoTracks()[0] || null : null;
  }

  public setLocalStream(stream: MediaStream) {
    this.localStream = stream;

    // If active PeerConnection exists, replace tracks seamlessly
    if (this.peerConnection && this.peerConnection.connectionState !== 'closed') {
      const newVideoTrack = stream.getVideoTracks()[0];
      const newAudioTrack = stream.getAudioTracks()[0];
      
      const senders = this.peerConnection.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      const audioSender = senders.find((s) => s.track && s.track.kind === 'audio');

      if (videoSender && newVideoTrack) {
        videoSender.replaceTrack(newVideoTrack).catch((err) => {
          console.warn('replaceTrack video failed, re-initiating peer connection:', err);
          this.initiatePeerConnection();
        });
      } else if (newVideoTrack) {
        try {
          this.peerConnection.addTrack(newVideoTrack, stream);
          this.initiatePeerConnection();
        } catch (e) {
          this.initiatePeerConnection();
        }
      }

      if (audioSender && newAudioTrack) {
        audioSender.replaceTrack(newAudioTrack).catch(() => {});
      }
    } else {
      this.initiatePeerConnection();
    }

    this.sendStreamStatus('streaming', {
      hasAudio: stream.getAudioTracks().length > 0,
      label: stream.getVideoTracks()[0]?.label || 'Screen/Camera Stream',
    });

    // Also start lightweight fallback frame transmitter (for extreme mobile network compatibility)
    this.startFallbackFrameSender(stream);
  }

  private startFallbackFrameSender(stream: MediaStream) {
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }

    if (this.fallbackVideo) {
      try {
        this.fallbackVideo.pause();
        this.fallbackVideo.srcObject = null;
        this.fallbackVideo.remove();
      } catch (e) {}
      this.fallbackVideo = null;
    }

    const video = document.createElement('video');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.autoplay = true;
    video.muted = true;
    video.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-999;';
    
    // Attach to DOM so WebKit/Blink decodes frames continuously on iOS/Android
    try {
      document.body.appendChild(video);
    } catch (e) {}

    video.srcObject = stream;
    video.play().catch(() => {});
    this.fallbackVideo = video;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    this.fallbackInterval = setInterval(() => {
      if (!this.localStream || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      if (video.videoWidth > 0 && video.videoHeight > 0 && ctx) {
        // High quality fallback frame: 640px width
        const scale = Math.min(1, 640 / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        this.ws.send(
          JSON.stringify({
            type: 'fallback-frame',
            frame: dataUrl,
            timestamp: Date.now(),
            fps: 15,
          })
        );
      }
    }, 66); // ~15 fps fallback
  }

  public sendFallbackFrame(dataUrl: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'fallback-frame',
          frame: dataUrl,
          timestamp: Date.now(),
          fps: 1,
        })
      );
    }
  }

  public stopStream() {
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }

    if (this.fallbackVideo) {
      try {
        this.fallbackVideo.pause();
        this.fallbackVideo.srcObject = null;
        this.fallbackVideo.remove();
      } catch (e) {}
      this.fallbackVideo = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    this.sendStreamStatus('stopped');
  }

  public sendStreamStatus(status: 'streaming' | 'paused' | 'stopped', screenInfo?: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'stream-status',
          status,
          screenInfo,
        })
      );
    }
  }

  public sendPointer(x: number, y: number, active: boolean, color: string = '#ef4444') {
    const payload = { type: 'pointer', x, y, active, color };
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(payload));
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public sendDraw(action: 'start' | 'draw' | 'end' | 'clear', points?: any, color?: string, size?: number) {
    const payload = { type: 'draw', action, points, color, size };
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(payload));
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public sendClipboard(text: string, title?: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'clipboard',
          text,
          title,
        })
      );
    }
  }

  public sendFile(file: File, caption?: string) {
    const reader = new FileReader();
    reader.onload = () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const base64 = reader.result as string;
        const sizeFormatted = file.size > 1024 * 1024 
          ? `${(file.size / (1024 * 1024)).toFixed(1)} Mo`
          : `${(file.size / 1024).toFixed(0)} Ko`;

        this.ws.send(
          JSON.stringify({
            type: 'file-transfer',
            fileName: file.name,
            fileType: file.type,
            fileSize: sizeFormatted,
            fileData: base64,
            caption: caption,
          })
        );
      }
    };
    reader.readAsDataURL(file);
  }

  public sendImageBase64(base64Data: string, fileName: string = 'image.png', caption?: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Calculate approximate size
      const approxBytes = Math.round((base64Data.length * 3) / 4);
      const sizeFormatted = approxBytes > 1024 * 1024
        ? `${(approxBytes / (1024 * 1024)).toFixed(1)} Mo`
        : `${(approxBytes / 1024).toFixed(0)} Ko`;

      this.ws.send(
        JSON.stringify({
          type: 'file-transfer',
          fileName,
          fileType: 'image/png',
          fileSize: sizeFormatted,
          fileData: base64Data,
          caption,
        })
      );
    }
  }

  public sendRemotePhoneEvent(event: RemotePhoneEvent) {
    const payload = { type: 'remote-phone-event', event };
    let sentViaChannel = false;
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(payload));
        sentViaChannel = true;
      } catch (e) {
        sentViaChannel = false;
      }
    }
    if (!sentViaChannel && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public sendRemotePcEvent(event: RemotePcEvent) {
    const payload = { type: 'remote-pc-event', event };
    let sentViaChannel = false;
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(payload));
        sentViaChannel = true;
      } catch (e) {
        sentViaChannel = false;
      }
    }
    if (!sentViaChannel && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public sendPhoneFeedback(feedbackType: string, payload?: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'phone-feedback',
          feedbackType,
          payload,
        })
      );
    }
  }

  public sendPhoneCapture(capture: PhoneCapture) {
    const payload = { type: 'phone-capture', capture };
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(payload));
      } catch (e) {}
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
      } catch (e) {}
    }
  }

  public sendVoiceCommand(commandId: string, label: string) {
    const payload = { type: 'voice-command', commandId, label, senderRole: this.role };
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(payload));
      } catch (e) {}
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
      } catch (e) {}
    }
  }

  public disconnect() {
    this.isManuallyClosed = true;
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.stopPing();
    this.stopStream();

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'leave',
          roomId: this.roomId,
          clientId: this.clientId,
        }));
      } catch (e) {}
    }

    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch (e) {}
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) {}
      this.peerConnection = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
  }
}
