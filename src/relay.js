// WebSocket relay using Durable Objects Hibernation API
// Replaces the Python server.py relay — broadcasts each message
// to all other connected clients. Stateless, hibernates between messages.

import { DurableObject } from 'cloudflare:workers';

export class WebSocketRelay extends DurableObject {

  // Handle incoming HTTP request (WebSocket upgrade)
  async fetch(request) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept via hibernation API — socket survives DO hibernation
    this.ctx.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  // Called when any connected WebSocket receives a message
  async webSocketMessage(ws, message) {
    // Relay to all OTHER connected clients
    const sockets = this.ctx.getWebSockets();
    for (const socket of sockets) {
      if (socket !== ws) {
        try {
          socket.send(message);
        } catch (e) {
          // Client disconnected — runtime will clean up
        }
      }
    }
  }

  // Called when a WebSocket closes — no action needed,
  // runtime removes it from getWebSockets() automatically
  async webSocketClose(ws, code, reason, wasClean) {}
}
