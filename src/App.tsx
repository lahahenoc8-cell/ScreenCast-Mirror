import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { ComputerReceiver } from './components/ComputerReceiver';
import { PhoneSender } from './components/PhoneSender';
import { DualTestView } from './components/DualTestView';
import { SharedClipboard } from './components/SharedClipboard';
import { HelpModal } from './components/HelpModal';
import { ConnectionNotification, ConnectionEvent } from './components/ConnectionNotification';
import { ScreenCastManager } from './services/webrtc';
import { AppRole, ClipboardItem, LaserPointerState, StreamStats, PeerInfo, PhoneCapture } from './types';
import { soundEngine } from './utils/audioAlert';

export default function App() {
  // Parse URL search parameters for fast QR code link routing
  const getInitialParams = () => {
    if (typeof window === 'undefined') return { initialRoom: 'CAST-8821', initialRole: 'receiver' as AppRole };
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const roleParam = params.get('role');

    const initialRoom = roomParam || `CAST-${Math.floor(1000 + Math.random() * 9000)}`;
    const initialRole: AppRole = roleParam === 'sender' ? 'sender' : 'receiver';

    return { initialRoom, initialRole };
  };

  const { initialRoom, initialRole } = getInitialParams();

  const [role, setRole] = useState<AppRole>(initialRole);
  const [roomId, setRoomId] = useState<string>(initialRoom);
  const [manager, setManager] = useState<ScreenCastManager | null>(null);

  // Stream & Peer States
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [fallbackFrame, setFallbackFrame] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [laserPointer, setLaserPointer] = useState<LaserPointerState>({ x: 0, y: 0, active: false });
  const [streamStats, setStreamStats] = useState<StreamStats>({
    fps: 60,
    latencyMs: 18,
    resolution: '1080p',
    bitrateKbps: 3500,
    quality: 'excellent',
  });

  // UI Modals & Drawers
  const [isClipboardOpen, setIsClipboardOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isDisconnected, setIsDisconnected] = useState<boolean>(false);
  const [phoneCaptures, setPhoneCaptures] = useState<PhoneCapture[]>([]);
  const [connectionEvent, setConnectionEvent] = useState<ConnectionEvent | null>(null);
  const [socketState, setSocketState] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed'>('connecting');
  const hasTriggeredInitialJoin = useRef<boolean>(false);
  const announcedPeersRef = useRef<Set<string>>(new Set());
  const lastAlertTimesRef = useRef<{ [key: string]: number }>({});

  const isStreamingRef = useRef(isStreaming);
  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const peersRef = useRef(peers);
  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  const handleDismissConnectionAlert = useCallback(() => {
    setConnectionEvent(null);
  }, []);

  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([
    {
      id: 'welcome-1',
      senderId: 'system',
      senderName: 'Assistant ScreenCast',
      type: 'text',
      content: 'Bienvenue sur ScreenCast Mirror ! Vous pouvez partager du texte, des photos et des fichiers instantanément entre votre téléphone et votre PC.',
      timestamp: Date.now(),
    }
  ]);

  // Request browser Notification permission on first user activity if supported
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        // Request on gentle delayed background trigger
        const timer = setTimeout(() => {
          try {
            Notification.requestPermission();
          } catch (e) {}
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const triggerConnectionAlert = useCallback((event: ConnectionEvent) => {
    const now = Date.now();
    // Throttle alerts by category (connected vs disconnected/failed) to prevent rapid toast spamming
    const category = event.type === 'connected' ? 'connected' : 'disconnected';
    const lastCategoryTime = lastAlertTimesRef.current[category] || 0;

    // Suppress repeated notifications of the same category within 6 seconds
    if (now - lastCategoryTime < 6000) {
      return;
    }

    // Suppress failed / disconnected false-alarms when connection is actively streaming or peers are present
    if ((event.type === 'failed' || event.type === 'disconnected') && (isStreamingRef.current || peersRef.current.length > 0)) {
      return;
    }

    lastAlertTimesRef.current[category] = now;
    lastAlertTimesRef.current[`${event.type}-${event.title}`] = now;
    setConnectionEvent(event);
    
    if (event.type === 'connected') {
      soundEngine.playConnectChime();
      soundEngine.triggerVibration([80, 50, 100]);

      // Browser native push notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(event.title, {
            body: event.description,
            icon: '/icon.png',
            tag: 'screencast-connect',
          });
        } catch (e) {}
      }
    } else if (event.type === 'failed') {
      soundEngine.playDisconnectChime();
      soundEngine.triggerVibration([200, 100, 200]);
    } else if (event.type === 'disconnected') {
      soundEngine.playDisconnectChime();
      soundEngine.triggerVibration(150);
    }
  }, []);

  // Connect WebRTC Manager
  useEffect(() => {
    hasTriggeredInitialJoin.current = false;

    const scManager = new ScreenCastManager({
      onSocketStateChange: (state) => {
        setSocketState(state);
      },
      onConnectionFailed: (reason) => {
        // Suppress false negative error toasts when actively streaming or peers already present
        if (isStreamingRef.current || peersRef.current.length > 0) {
          return;
        }
        triggerConnectionAlert({
          id: `fail-${Date.now()}`,
          type: 'failed',
          title: '🚨 Connexion Impossible',
          description: reason || 'Impossible de joindre le serveur relais ou de synchroniser les appareils.',
          timestamp: Date.now(),
        });
      },
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
        setIsStreaming(true);
      },
      onFallbackFrame: (frame, fps) => {
        setFallbackFrame(frame);
        setIsStreaming(true);
        if (fps) {
          setStreamStats((s) => ({ ...s, fps }));
        }
      },
      onStreamStatus: (status) => {
        if (status === 'streaming') {
          setIsStreaming(true);
        } else if (status === 'stopped') {
          setIsStreaming(false);
          setRemoteStream(null);
          setFallbackFrame(null);
        }
      },
      onPointer: (pointer) => {
        setLaserPointer(pointer);
      },
      onClipboard: (data) => {
        setClipboardItems((prev) => [
          {
            id: Math.random().toString(36).substring(2, 9),
            senderId: data.senderId,
            senderName: data.senderId === scManager.clientId ? 'Moi' : 'Appareil Connecté',
            type: 'text',
            content: data.text,
            timestamp: data.timestamp || Date.now(),
          },
          ...prev,
        ]);
      },
      onFileTransfer: (data) => {
        const isImage = data.fileType?.startsWith('image/') || data.fileName?.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i);
        setClipboardItems((prev) => [
          {
            id: Math.random().toString(36).substring(2, 9),
            senderId: data.senderId,
            senderName: data.senderName || 'Appareil Connecté',
            type: 'file',
            content: isImage ? `Photo reçue: ${data.fileName}` : `Fichier partagé: ${data.fileName}`,
            fileName: data.fileName,
            fileType: data.fileType,
            fileSize: data.fileSize,
            fileData: data.fileData,
            caption: data.caption,
            timestamp: Date.now(),
          },
          ...prev,
        ]);

        if (isImage) {
          triggerConnectionAlert({
            id: `img-${Date.now()}`,
            type: 'connected',
            title: '📸 Nouvelle Image Reçue !',
            description: `"${data.fileName}" a été transmise en HD.${data.caption ? ` ("${data.caption}")` : ''}`,
            timestamp: Date.now(),
          });
        }
      },
      onLatencyUpdate: (latency) => {
        setStreamStats((prev) => ({
          ...prev,
          latencyMs: latency,
          quality: latency < 35 ? 'excellent' : latency < 70 ? 'good' : 'fair',
        }));
      },
      onJoined: (data) => {
        setPeers(data.peers || []);
        if (data.peers && data.peers.length > 0) {
          data.peers.forEach((p: any) => announcedPeersRef.current.add(p.id));
          if (!hasTriggeredInitialJoin.current) {
            hasTriggeredInitialJoin.current = true;
            const otherPeer = data.peers[0];
            const isPhone = otherPeer.role === 'sender';
            triggerConnectionAlert({
              id: `join-${Date.now()}`,
              type: 'connected',
              title: '🟢 Appareils Connectés !',
              description: `${isPhone ? 'Smartphone' : 'Ordinateur'} (${otherPeer.deviceName || 'Connecté'}) est prêt sur la session ${roomId}.`,
              deviceRole: otherPeer.role,
              deviceName: otherPeer.deviceName,
              timestamp: Date.now(),
            });
          }
        }
      },
      onPeerJoined: (peer) => {
        setPeers((prev) => [...prev.filter((p) => p.id !== peer.id), peer as PeerInfo]);
        // Do not spam alerts if this peer was already announced
        if (announcedPeersRef.current.has(peer.id)) {
          return;
        }
        announcedPeersRef.current.add(peer.id);
        const isPhone = peer.role === 'sender';
        triggerConnectionAlert({
          id: `peer-${Date.now()}`,
          type: 'connected',
          title: '🟢 Nouvel Appareil Connecté !',
          description: `${isPhone ? '📱 Smartphone' : '💻 Ordinateur'} (${peer.deviceName || 'Connecté'}) a rejoint votre session ${roomId}.`,
          deviceRole: peer.role as 'sender' | 'receiver',
          deviceName: peer.deviceName,
          timestamp: Date.now(),
        });
      },
      onPeerLeft: (peerId) => {
        announcedPeersRef.current.delete(peerId);
        setPeers((prev) => {
          const remaining = prev.filter((p) => p.id !== peerId);
          // Only trigger disconnect if room has no other peers and not actively streaming
          if (remaining.length === 0 && !isStreamingRef.current) {
            triggerConnectionAlert({
              id: `left-${Date.now()}`,
              type: 'disconnected',
              title: '⚠️ Appareil Déconnecté',
              description: `L'appareil distant a quitté la session ${roomId}.`,
              timestamp: Date.now(),
            });
          }
          return remaining;
        });
      },
      onPhoneCapture: (capture) => {
        setPhoneCaptures((prev) => {
          if (prev.some((c) => c.id === capture.id)) return prev;
          return [capture, ...prev];
        });
        soundEngine.playCameraShutter();
        triggerConnectionAlert({
          id: `capture-${Date.now()}`,
          type: 'connected',
          title: '📸 Nouvelle Capture de la Caméra !',
          description: `${capture.sourceLabel || 'Photo Téléphone'}${capture.size ? ` (${capture.size})` : ''}`,
          timestamp: Date.now(),
        });
      },
    });

    const targetRole = role === 'dual_test' ? 'receiver' : role;
    scManager.connect(roomId, targetRole);
    setManager(scManager);

    return () => {
      scManager.disconnect();
    };
  }, [roomId, role]);

  const handleRoleChange = (newRole: AppRole) => {
    setRole(newRole);
    // Update URL query string without reloading page
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('role', newRole);
      url.searchParams.set('room', roomId);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleJoinRoom = (newId: string) => {
    setRoomId(newId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', newId);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleNewRoom = () => {
    const newId = `CAST-${Math.floor(1000 + Math.random() * 9000)}`;
    setRoomId(newId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', newId);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleSendMessage = (text: string, title?: string) => {
    if (manager) {
      manager.sendClipboard(text, title);
      setClipboardItems((prev) => [
        {
          id: Math.random().toString(36).substring(2, 9),
          senderId: manager.clientId,
          senderName: 'Moi',
          type: 'text',
          content: text,
          timestamp: Date.now(),
        },
        ...prev,
      ]);
    }
  };

  const handleSendFile = (file: File) => {
    if (manager) {
      manager.sendFile(file);
    }
  };

  const handleDisconnect = () => {
    if (manager) {
      manager.disconnect();
    }
    setIsDisconnected(true);
    setIsStreaming(false);
    setRemoteStream(null);
    setFallbackFrame(null);
    triggerConnectionAlert({
      id: `disconnect-${Date.now()}`,
      type: 'disconnected',
      title: '🔌 Déconnexion réussie',
      description: `Vous avez mis fin à la session ${roomId}.`,
      timestamp: Date.now(),
    });
  };

  const handleReconnect = () => {
    setIsDisconnected(false);
    if (manager) {
      manager.connect(roomId, role === 'dual_test' ? 'receiver' : role);
    }
  };

  const handleNewCapture = (capture: PhoneCapture) => {
    setPhoneCaptures((prev) => {
      if (prev.some((c) => c.id === capture.id)) return prev;
      return [capture, ...prev];
    });
  };

  const handleDeleteCapture = (id: string) => {
    setPhoneCaptures((prev) => prev.filter((c) => c.id !== id));
  };

  const handleClearAllCaptures = () => {
    setPhoneCaptures([]);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Main Navigation */}
      <Navbar
        role={role}
        onChangeRole={handleRoleChange}
        roomId={roomId}
        onJoinRoom={handleJoinRoom}
        onNewRoom={handleNewRoom}
        onOpenHelp={() => setIsHelpOpen(true)}
        onToggleClipboard={() => setIsClipboardOpen(!isClipboardOpen)}
        clipboardCount={clipboardItems.length}
        peerCount={peers.length}
        isStreaming={isStreaming}
        socketState={socketState}
        onRetryConnect={handleReconnect}
        onConnect={handleReconnect}
        onDisconnect={handleDisconnect}
        isDisconnected={isDisconnected}
      />

      {/* Main Role View Container */}
      <main className="flex-1 flex overflow-hidden relative">
        {role === 'receiver' && (
          <ComputerReceiver
            manager={manager}
            roomId={roomId}
            remoteStream={remoteStream}
            fallbackFrame={fallbackFrame}
            isStreaming={isStreaming}
            streamStats={streamStats}
            laserPointer={laserPointer}
            onToggleClipboard={() => setIsClipboardOpen(true)}
            clipboardCount={clipboardItems.length}
            clipboardItems={clipboardItems}
            phoneCaptures={phoneCaptures}
            onDeleteCapture={handleDeleteCapture}
            onClearAllCaptures={handleClearAllCaptures}
            onDisconnect={handleDisconnect}
            onConnect={handleReconnect}
            isDisconnected={isDisconnected}
            onChangeRole={handleRoleChange}
            onJoinRoom={handleJoinRoom}
          />
        )}

        {role === 'sender' && (
          <PhoneSender
            manager={manager}
            roomId={roomId}
            remoteStream={remoteStream}
            fallbackFrame={fallbackFrame}
            streamStats={streamStats}
            isStreaming={isStreaming}
            onToggleClipboard={() => setIsClipboardOpen(true)}
            clipboardCount={clipboardItems.length}
            clipboardItems={clipboardItems}
            phoneCaptures={phoneCaptures}
            onNewCapture={handleNewCapture}
            onDeleteCapture={handleDeleteCapture}
            onDisconnect={handleDisconnect}
            onConnect={handleReconnect}
            isDisconnected={isDisconnected}
            onChangeRole={handleRoleChange}
            onJoinRoom={handleJoinRoom}
          />
        )}

        {role === 'dual_test' && (
          <DualTestView
            manager={manager}
            roomId={roomId}
            streamStats={streamStats}
            laserPointer={laserPointer}
            onToggleClipboard={() => setIsClipboardOpen(true)}
            clipboardCount={clipboardItems.length}
          />
        )}
      </main>

      {/* Shared Clipboard & File Transfer Drawer */}
      <SharedClipboard
        items={clipboardItems}
        onSendMessage={handleSendMessage}
        onSendFile={handleSendFile}
        isOpen={isClipboardOpen}
        onClose={() => setIsClipboardOpen(false)}
        role={role === 'sender' ? 'sender' : 'receiver'}
      />

      {/* Connection & Peer Event Notification Toast */}
      <ConnectionNotification
        currentRole={role}
        roomId={roomId}
        lastEvent={connectionEvent}
        onDismiss={handleDismissConnectionAlert}
      />

      {/* Quick Help Modal Guide */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        roomId={roomId}
      />
    </div>
  );
}
