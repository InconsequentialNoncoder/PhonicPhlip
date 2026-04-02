// WebSocket relay using Durable Objects Hibernation API
// Broadcasts each message to all other connected clients.
// Named sessions persist settings in SQLite; guest sessions are stateless.

import { DurableObject } from 'cloudflare:workers';

export class WebSocketRelay extends DurableObject {

  // Handle incoming HTTP request (WebSocket upgrade)
  async fetch(request) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 400 });
    }

    // Determine session identity from query parameter
    const url = new URL(request.url);
    const raw = url.searchParams.get('session') || '';
    const sessionId = raw.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'default-room';
    const isNamed = sessionId !== 'default-room';

    // Tag the WebSocket so we can identify named vs guest after hibernation
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [isNamed ? 'named' : 'guest']);

    // For named sessions, restore saved settings to the new client
    if (isNamed) {
      try {
        this.ctx.storage.sql.exec(
          'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)'
        );
        const rows = this.ctx.storage.sql.exec(
          "SELECT value FROM settings WHERE key = 'settings'"
        ).toArray();
        if (rows.length > 0) {
          server.send(JSON.stringify({
            type: 'restore_settings',
            settings: JSON.parse(rows[0].value)
          }));
        }
      } catch (e) {
        // Settings restore failed — continue without, not fatal
      }
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  // Called when any connected WebSocket receives a message
  async webSocketMessage(ws, message) {
    const sockets = this.ctx.getWebSockets();

    // Check if this is a named session (any socket tagged 'named' means it is)
    const isNamed = this.ctx.getTags(ws).includes('named');

    // Persist settings for named sessions
    if (isNamed && typeof message === 'string' && message.includes('"update_settings"')) {
      try {
        const msg = JSON.parse(message);
        if (msg.type === 'update_settings' && msg.settings) {
          this.ctx.storage.sql.exec(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('settings', ?)",
            JSON.stringify(msg.settings)
          );
        }
      } catch (e) {
        // Parse or write failed — continue with relay
      }
    }

    // Relay to all OTHER connected clients
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
