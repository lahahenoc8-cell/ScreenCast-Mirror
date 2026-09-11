import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

interface ClientInfo {
  ws: WebSocket;
  id: string;
  roomId: string;
  role: 'sender' | 'receiver' | 'unknown';
  deviceName?: string;
  joinedAt: number;
}

const rooms = new Map<string, Map<string, ClientInfo>>();

// Helper to broadcast to a room (optionally excluding sender)
function broadcastToRoom(roomId: string, message: any, excludeClientId?: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  const data = typeof message === 'string' ? message : JSON.stringify(message);
  for (const [clientId, client] of room.entries()) {
    if (clientId !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    activeRooms: rooms.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/room/new', (req, res) => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const roomId = `CAST-${randomNum}`;
  res.json({ roomId });
});

app.get('/api/room/:roomId/status', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) {
    return res.json({ exists: false, count: 0, senders: 0, receivers: 0 });
  }

  let senders = 0;
  let receivers = 0;
  for (const client of room.values()) {
    if (client.role === 'sender') senders++;
    if (client.role === 'receiver') receivers++;
  }

  res.json({
    exists: true,
    count: room.size,
    senders,
    receivers,
  });
});

async function start() {
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch (e) {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    let currentClient: ClientInfo | null = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const { type } = msg;

        switch (type) {
          case 'join': {
            const { roomId, role, deviceName, clientId } = msg;
            const id = clientId || Math.random().toString(36).substring(2, 9);
            
            if (!rooms.has(roomId)) {
              rooms.set(roomId, new Map());
            }

            const room = rooms.get(roomId)!;
            currentClient = {
              ws,
              id,
              roomId,
              role: role || 'receiver',
              deviceName: deviceName || (role === 'sender' ? 'Téléphone' : 'Ordinateur'),
              joinedAt: Date.now()
            };
            room.set(id, currentClient);

            // Send confirmation to client
            ws.send(JSON.stringify({
              type: 'joined',
              clientId: id,
              roomId,
              role,
              peers: Array.from(room.values()).map(c => ({
                id: c.id,
                role: c.role,
                deviceName: c.deviceName
              }))
            }));

            // Notify others in the room
            broadcastToRoom(roomId, {
              type: 'peer-joined',
              peer: {
                id,
                role,
                deviceName: currentClient.deviceName
              },
              peersCount: room.size
            }, id);
            break;
          }

          case 'signal': {
            // Forward WebRTC signaling (offer, answer, ice-candidate) to target peer or room
            if (!currentClient) return;
            const { targetId, data } = msg;
            const room = rooms.get(currentClient.roomId);
            if (!room) return;

            if (targetId && room.has(targetId)) {
              const target = room.get(targetId);
              if (target && target.ws.readyState === WebSocket.OPEN) {
                target.ws.send(JSON.stringify({
                  type: 'signal',
                  senderId: currentClient.id,
                  role: currentClient.role,
                  data
                }));
              }
            } else {
              // Broadcast signal to everyone else in room
              broadcastToRoom(currentClient.roomId, {
                type: 'signal',
                senderId: currentClient.id,
                role: currentClient.role,
                data
              }, currentClient.id);
            }
            break;
          }

          case 'fallback-frame': {
            // For environments where WebRTC P2P is blocked or falling back to canvas/MJPEG frames
            if (!currentClient) return;
            broadcastToRoom(currentClient.roomId, {
              type: 'fallback-frame',
              senderId: currentClient.id,
              frame: msg.frame,
              timestamp: msg.timestamp,
              fps: msg.fps
            }, currentClient.id);
            break;
          }

          case 'stream-status': {
            if (!currentClient) return;
            broadcastToRoom(currentClient.roomId, {
              type: 'stream-status',
              senderId: currentClient.id,
              status: msg.status, // 'streaming', 'paused', 'stopped'
              screenInfo: msg.screenInfo
            }, currentClient.id);
            break;
          }

          case 'pointer': {
            // Live touch / laser pointer
            if (!currentClient) return;
            broadcastToRoom(currentClient.roomId, {
              type: 'pointer',
              senderId: currentClient.id,
              x: msg.x,
              y: msg.y,
              active: msg.active,
              color: msg.color
            }, currentClient.id);
            break;
          }

          case 'draw': {
            // Live whiteboard / screen annotation
            if (!currentClient) return;
            broadcastToRoom(currentClient.roomId, {
              type: 'draw',
              senderId: currentClient.id,
              action: msg.action, // 'start', 'draw', 'end', 'clear'
              points: msg.points,
              color: msg.color,
              size: msg.size
            }, currentClient.id);
            break;
          }

          case 'clipboard': {
            // Shared clipboard text/URL
            if (!currentClient) return;
            broadcastToRoom(currentClient.roomId, {
              type: 'clipboard',
              senderId: currentClient.id,
              text: msg.text,
              title: msg.title,
              timestamp: Date.now()
            }, currentClient.id);
            break;
          }

          case 'file-transfer': {
            // Quick file or photo share
            if (!currentClient) return;
            broadcastToRoom(currentClient.roomId, {
              type: 'file-transfer',
              senderId: currentClient.id,
              senderName: currentClient.deviceName,
              fileName: msg.fileName,
              fileType: msg.fileType,
              fileSize: msg.fileSize,
              fileData: msg.fileData,
              timestamp: Date.now()
            }, currentClient.id);
            break;
          }

          case 'command': {
            // Command like 'take-screenshot', 'request-stream', 'quality-change'
            if (!currentClient) return;
            broadcastToRoom(currentClient.roomId, {
              type: 'command',
              senderId: currentClient.id,
              command: msg.command,
              payload: msg.payload
            }, currentClient.id);
            break;
          }

          case 'remote-phone-event': {
            // PC controlling Phone (touches, home, back, apps, lock, ring, vibrate, torch, speak, etc.)
            if (!currentClient) return;
            broadcastToRoom(currentClient.roomId, {
              type: 'remote-phone-event',
              senderId: currentClient.id,
              event: msg.event,
              timestamp: Date.now()
            }, currentClient.id);
            break;
          }

          case 'remote-pc-event': {
            // Phone controlling PC (touchpad, clicks, scroll, keyboard keys, media controls, fullscreen)
            if (!currentClient) return;
            broadcastToRoom(currentClient.roomId, {
              type: 'remote-pc-event',
              senderId: currentClient.id,
              event: msg.event,
              timestamp: Date.now()
            }, currentClient.id);
            break;
          }

          case 'phone-feedback': {
            // Phone sending status feedback to PC (e.g. flash status, photo snapshot taken, ring confirmation)
            if (!currentClient) return;
            broadcastToRoom(currentClient.roomId, {
              type: 'phone-feedback',
              senderId: currentClient.id,
              feedbackType: msg.feedbackType,
              payload: msg.payload,
              timestamp: Date.now()
            }, currentClient.id);
            break;
          }

          case 'phone-capture': {
            // Phone camera snapshot sent to computer receiver
            if (!currentClient) return;
            broadcastToRoom(currentClient.roomId, {
              type: 'phone-capture',
              senderId: currentClient.id,
              senderName: currentClient.deviceName,
              capture: msg.capture,
              timestamp: Date.now()
            }, currentClient.id);
            break;
          }

          case 'voice-command': {
            // Hands-free voice command relay between phone and computer
            if (!currentClient) return;
            broadcastToRoom(currentClient.roomId, {
              type: 'voice-command',
              senderId: currentClient.id,
              commandId: msg.commandId,
              label: msg.label,
              senderRole: currentClient.role,
              timestamp: Date.now()
            }, currentClient.id);
            break;
          }

          case 'leave': {
            if (currentClient) {
              const { roomId, id } = currentClient;
              const room = rooms.get(roomId);
              if (room) {
                room.delete(id);
                broadcastToRoom(roomId, {
                  type: 'peer-left',
                  peerId: id,
                  role: currentClient.role,
                  deviceName: currentClient.deviceName,
                  peersCount: room.size,
                }, id);
              }
            }
            break;
          }

          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong', timestamp: msg.timestamp, serverTime: Date.now() }));
            break;
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      if (currentClient) {
        const { roomId, id } = currentClient;
        const room = rooms.get(roomId);
        if (room) {
          room.delete(id);
          broadcastToRoom(roomId, {
            type: 'peer-left',
            peerId: id,
            role: currentClient.role,
            peersCount: room.size
          });

          if (room.size === 0) {
            rooms.delete(roomId);
          }
        }
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket client error:', err);
    });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ScreenCast Mirror server running at http://0.0.0.0:${PORT}`);
  });
}

start();
