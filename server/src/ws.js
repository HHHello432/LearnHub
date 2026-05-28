import { WebSocketServer } from 'ws';
import { verifyToken } from './middleware/auth.js';

// Map userId -> Set of WebSocket connections
const clients = new Map();

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    let userId = null;
    let heartbeatTimer = null;

    // Authenticate via query param (e.g., ws://host?token=xxx) or after first message
    const url = new URL(req.url, 'ws://localhost');
    const token = url.searchParams.get('token');

    if (token) {
      try {
        const decoded = verifyToken(token);
        userId = decoded.userId;
        addClient(userId, ws);
        console.log(`[WS] User ${userId} connected`);
        ws.send(JSON.stringify({ type: 'connected', userId }));
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
        ws.close(1008, 'Invalid token');
        return;
      }
    } else {
      // Wait for auth message
      ws.send(JSON.stringify({ type: 'auth_required', message: 'Please send auth token' }));
    }

    // Handle messages
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'auth') {
          // Authenticate with token sent as message
          if (userId) return; // Already authenticated

          try {
            const decoded = verifyToken(msg.token);
            userId = decoded.userId;
            addClient(userId, ws);
            console.log(`[WS] User ${userId} authenticated`);
            ws.send(JSON.stringify({ type: 'connected', userId }));
          } catch {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
          }
          return;
        }

        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        // Other message types can be handled here
        if (userId) {
          // Echo back or forward as needed
          console.log(`[WS] Message from user ${userId}:`, msg.type);
        }
      } catch (err) {
        console.error('[WS] Message parse error:', err.message);
      }
    });

    // Heartbeat to detect disconnected clients
    heartbeatTimer = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on('close', () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (userId) {
        removeClient(userId, ws);
        console.log(`[WS] User ${userId} disconnected`);
      }
    });

    ws.on('error', (err) => {
      console.error('[WS] Error:', err.message);
      if (userId) {
        removeClient(userId, ws);
      }
    });
  });

  console.log('🚀 WebSocket server ready');

  return wss;
}

function addClient(userId, ws) {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId).add(ws);
}

function removeClient(userId, ws) {
  const userClients = clients.get(userId);
  if (userClients) {
    userClients.delete(ws);
    if (userClients.size === 0) {
      clients.delete(userId);
    }
  }
}

/**
 * Send notification to a specific user in real-time
 * @param {number} userId
 * @param {object} notification
 */
export function sendNotification(userId, notification) {
  const userClients = clients.get(userId);
  if (!userClients) return;

  const message = JSON.stringify({
    type: 'notification',
    data: notification,
  });

  for (const ws of userClients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  }
}

/**
 * Send message to all connected clients (broadcast)
 */
export function broadcast(message) {
  const payload = JSON.stringify(message);
  for (const [, userClients] of clients) {
    for (const ws of userClients) {
      if (ws.readyState === ws.OPEN) {
        ws.send(payload);
      }
    }
  }
}
