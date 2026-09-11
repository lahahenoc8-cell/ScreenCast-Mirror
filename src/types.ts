export type AppRole = 'receiver' | 'sender' | 'dual_test';

export type VideoQuality = '1080p' | '720p' | '480p';

export interface RoomInfo {
  roomId: string;
  count: number;
  senders: number;
  receivers: number;
}

export interface PeerInfo {
  id: string;
  role: 'sender' | 'receiver';
  deviceName?: string;
}

export interface StreamStats {
  fps: number;
  latencyMs: number;
  resolution: string;
  bitrateKbps: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface AnnotationPoint {
  x: number;
  y: number;
}

export interface AnnotationPath {
  id: string;
  points: AnnotationPoint[];
  color: string;
  size: number;
}

export interface ClipboardItem {
  id: string;
  senderId: string;
  senderName: string;
  type: 'text' | 'file' | 'link';
  content: string;
  fileName?: string;
  fileType?: string;
  fileSize?: string;
  fileData?: string; // base64 or blob URL
  caption?: string;
  timestamp: number;
}

export interface PhoneCapture {
  id: string;
  url: string; // base64 data URL
  fileName: string;
  timestamp: number;
  source: 'camera_rear' | 'camera_front' | 'camera_snapshot' | 'screen' | 'upload';
  sourceLabel: string;
  size?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface LaserPointerState {
  x: number;
  y: number;
  active: boolean;
  color?: string;
}

// Remote Control Actions (Bidirectional)
export type RemotePhoneActionType = 
  | 'touch_tap'
  | 'touch_swipe'
  | 'touch_move'
  | 'home'
  | 'back'
  | 'apps'
  | 'lock'
  | 'ring'
  | 'vibrate'
  | 'torch'
  | 'speak'
  | 'camera_snap'
  | 'volume_up'
  | 'volume_down';

export interface RemotePhoneEvent {
  action: RemotePhoneActionType;
  x?: number; // relative 0-100%
  y?: number; // relative 0-100%
  deltaX?: number;
  deltaY?: number;
  text?: string;
  timestamp: number;
}

export type RemotePcActionType =
  | 'mouse_move'
  | 'mouse_click'
  | 'mouse_right_click'
  | 'mouse_double_click'
  | 'mouse_scroll'
  | 'key_press'
  | 'type_text'
  | 'media_play_pause'
  | 'media_next'
  | 'media_prev'
  | 'media_vol_up'
  | 'media_vol_down'
  | 'media_mute'
  | 'fullscreen_toggle'
  | 'ping_test';

export interface RemotePcEvent {
  action: RemotePcActionType;
  x?: number; // relative or delta
  y?: number;
  deltaX?: number;
  deltaY?: number;
  key?: string;
  text?: string;
  timestamp: number;
}

